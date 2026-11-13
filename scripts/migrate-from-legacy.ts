/**
 * 현행 엑셀 → khepi-rms 이관 (초안, 2026.11.13.) — 드라이런 전용
 *
 * 실행 (Windows: npx.cmd)
 *   npx tsx scripts/migrate-from-legacy.ts --research <2_연구관리현황.xlsx> --committee <1_심의위원회현황_이관용.xlsx> --out <결과 폴더>
 *
 * 동작
 * - Firestore 에 쓰지 않음. 결과 CSV 5종 + 이관 미리보기 JSON 생성 (결과 폴더는 git 제외 위치 사용)
 * - 과제 원장(A·B·C 시트) 값을 기준으로 관리번호 단위 병합
 *   보조 시트 값이 다르면 덮어쓰지 않고 legacyNote 기록, 원장 빈 칸은 보조 시트 값으로 보충(보충 내역도 기록)
 * - 인적정보 시트(BLOCKED_SHEETS)는 읽지 않음. 위원 실명은 묶음 기준으로만 쓰고 출력은 익명화 성명만
 * - 실제 이관 방식(관리 화면 가져오기 등)은 드라이런 결과 승인 후 확정
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import {
  ALIO_FIELDS, BLOCKED_SHEETS, COMMITTEE_SHEETS, EVAL_PUBLISH_FIELDS, PROJECT_SHEET_FIELDS, RESEARCH_SHEETS,
  SCORE_FIELDS, TRUST_SHEET_FIELDS, normHeader,
} from '../src/excel/mapping';
import {
  formatPeriod, normalizeReviewNo, parseDate, parseMoney, parsePeriod, parseYm, todayISO,
} from '../src/domain/fields';
import { REGIMES, compareExcelRegime, determineRegime } from '../src/domain/regimes';
import type { ProjectInput, ProjectType } from '../src/domain/types';

/* ---------------- 인자 ---------------- */

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
if (!args.research || !args.out) {
  console.error('사용법: tsx scripts/migrate-from-legacy.ts --research <연구관리현황.xlsx> [--committee <심의위원회현황.xlsx>] --out <폴더>');
  process.exit(1);
}
const TODAY = todayISO();

/* ---------------- 셀 값 ---------------- */

type Raw = string | number | Date | null;

function cellRaw(v: ExcelJS.CellValue): Raw {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'O' : 'X';
  const o = v as unknown as Record<string, unknown>;
  if ('richText' in o) return (o.richText as { text: string }[]).map((t) => t.text).join('');
  if ('formula' in o || 'sharedFormula' in o) return 'result' in o ? cellRaw(o.result as ExcelJS.CellValue) : null; // 계산값 없는 수식 = 빈 칸
  if ('result' in o) return cellRaw(o.result as ExcelJS.CellValue);
  if ('text' in o) return String(o.text);
  if ('error' in o) return null;
  return String(v);
}

/** 잘못된 날짜 셀(Invalid Date)은 '(잘못된 날짜)' 로 표시 */
const isoOfDate = (d: Date) => (Number.isNaN(d.getTime()) ? '(잘못된 날짜)' : d.toISOString().slice(0, 10));

/** 화면·비교용 문자열 (공백 정리) */
function text(v: Raw): string {
  if (v === null) return '';
  if (v instanceof Date) return isoOfDate(v);
  return String(v).replace(/\s+/g, ' ').trim();
}

/** 날짜로 해석 가능하면 ISO, 아니면 null */
function isoDate(v: Raw): string | null {
  if (v === null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : isoOfDate(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // 엑셀 날짜 일련번호
    return isoOfDate(new Date(Date.UTC(1899, 11, 30) + v * 86_400_000));
  }
  return parseDate(String(v).trim());
}

type Row = { rowNo: number; get: (header: string) => Raw; has: (header: string) => boolean; headers: string[] };

function readSheet(ws: ExcelJS.Worksheet, headerRow = 1): Row[] {
  const headers = ((ws.getRow(headerRow).values as ExcelJS.CellValue[]) || []).map((h) => normHeader(cellRaw(h)));
  const rows: Row[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNo) => {
    if (rowNo <= headerRow) return;
    const vals = (row.values as ExcelJS.CellValue[]).map(cellRaw);
    if (!vals.some((v) => text(v) !== '')) return;
    const byHeader = new Map<string, Raw>();
    headers.forEach((h, i) => { if (h && !byHeader.has(h)) byHeader.set(h, vals[i] ?? null); });
    rows.push({ rowNo, headers, get: (h) => byHeader.get(normHeader(h)) ?? null, has: (h) => byHeader.has(normHeader(h)) });
  });
  return rows;
}

function countRows(ws: ExcelJS.Worksheet): number {
  let n = 0;
  ws.eachRow({ includeEmpty: false }, (row) => {
    if ((row.values as ExcelJS.CellValue[]).map(cellRaw).some((v) => text(v) !== '')) n++;
  });
  return n;
}

/* ---------------- 결과 수집 ---------------- */

type Doc = Record<string, unknown>;
const projects = new Map<string, Doc>();
const legacyNotes = new Map<string, string[]>();
const sheetCounts: { 파일: string; 시트: string; 데이터행: number; 처리: string; 결과: string }[] = [];
const mismatches: { 관리번호: string; 항목: string; 원장시트: string; 원장값: string; 비교시트: string; 비교값: string; 처리: string }[] = [];
const checks: { 구분: string; 대상: string; 시트: string; 행: string; 내용: string; 조치: string }[] = [];

const ID_RE = /^[ABC]-\d{4}-\d+$/;
/** 빈 양식 행: 관리번호 수식만 있고 연도·연번이 비어 "A--" 등으로 계산된 행 */
const isBlankTemplateId = (id: string) => id === '' || /^[ABC]-*$/.test(id);
const DATE_FIELDS = new Set([
  'endDate', 'startDate', 'finalReport.submittedAt', 'publication.openDate', 'alio.eventDate', 'alio.postedAt',
  'publication.homepageRegisteredAt', 'evaluation.evalDate', 'evaluation.submittedAt',
]);
const NUMBER_FIELDS = new Set(['year', 'seq', 'budget', 'spent', 'trust.amount']);

function getPath(doc: Doc, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Doc)[k] : undefined), doc);
}
function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split('.');
  let o = doc;
  for (const k of keys.slice(0, -1)) o = (o[k] ??= {}) as Doc;
  o[keys[keys.length - 1]] = value;
}

/** 필드 성격에 맞게 값 변환 (날짜·기간·금액·심의번호) */
function convert(field: string, v: Raw, ctx: { id: string; sheet: string; rowNo: number }): unknown {
  const t = text(v);
  if (t === '') return undefined;
  if (DATE_FIELDS.has(field)) return isoDate(v) ?? t; // "X"·"해당없음" 등은 원문 유지
  if (NUMBER_FIELDS.has(field)) return typeof v === 'number' ? v : parseMoney(t) ?? t;
  if (field === 'periodInitial' || field === 'periodFinal') {
    let p = parsePeriod(t);
    if (!p && /\.\./.test(t)) {
      // 오타 보정 (2026.11.13. 승인): "2025..12.10." → "2025.12.10."
      const fixed = t.replace(/\.{2,}/g, '.');
      p = parsePeriod(fixed);
      if (p) note(ctx.id, `${field === 'periodFinal' ? '연구기간(최종)' : '연구기간(최초)'} 오타 보정: "${t}" → "${formatPeriod(p)}"`);
    }
    if (!p) checks.push({ 구분: '기간 형식', 대상: ctx.id, 시트: ctx.sheet, 행: String(ctx.rowNo), 내용: `해석 불가: ${t}`, 조치: '원문 유지, 확인 필요' });
    return p ? formatPeriod(p) : t;
  }
  if (field === 'review.no') {
    const n = normalizeReviewNo(v instanceof Date ? v : t);
    if (n && n !== t) checks.push({ 구분: '심의승인번호 복원', 대상: ctx.id, 시트: ctx.sheet, 행: String(ctx.rowNo), 내용: `${t} → ${n}`, 조치: 'YYMM-NN 복원' });
    if (!n) checks.push({ 구분: '심의승인번호 형식', 대상: ctx.id, 시트: ctx.sheet, 행: String(ctx.rowNo), 내용: `해석 불가: ${t}`, 조치: '원문 유지, 확인 필요' });
    return n ?? t;
  }
  if (field === 'review.ym') {
    const ym = parseYm(t) ?? (v instanceof Date ? { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1 } : null);
    return ym ? `${ym.y}.${String(ym.m).padStart(2, '0')}.` : t;
  }
  return t;
}

const cmpKey = (field: string, v: unknown) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return String(v);
  const s = String(v).replace(/\s+/g, ' ').trim();
  if (field === 'title') return s.replace(/\s/g, '');
  return s;
};

/** 원장 시트에 있는 항목 (원장에 칸이 없는 항목은 보조 시트 값을 그대로 사용, 보충 기록 안 함) */
const BASE_FIELDS = new Set([...Object.values(PROJECT_SHEET_FIELDS), ...Object.values(TRUST_SHEET_FIELDS), 'startDate', 'endDate']);

/** 보조 시트 값 병합: 원장 빈 칸 보충(기록) / 다르면 legacyNote (덮어쓰지 않음) */
function mergeSecondary(id: string, field: string, value: unknown, sheet: string, baseSheet: string) {
  const doc = projects.get(id)!;
  const cur = getPath(doc, field);
  const a = cmpKey(field, cur);
  const b = cmpKey(field, value);
  if (b === '' || a === b) return;
  if (a === '' && !BASE_FIELDS.has(field)) { setPath(doc, field, value); return; }
  if (a === '') {
    setPath(doc, field, value);
    mismatches.push({ 관리번호: id, 항목: field, 원장시트: baseSheet, 원장값: '(빈 칸)', 비교시트: sheet, 비교값: b, 처리: '빈 칸 보충' });
    note(id, `${field}: 원장 빈 칸 → ${sheet} 값 보충 (${b})`);
    return;
  }
  mismatches.push({ 관리번호: id, 항목: field, 원장시트: baseSheet, 원장값: a, 비교시트: sheet, 비교값: b, 처리: '원장 유지, legacyNote 기록, 화면 확인 필요' });
  note(id, `${field}: 원장 "${a}" / ${sheet} "${b}" 상이`);
  flag(id, field, `원장 "${a}" / ${sheet} "${b}" 상이, 확인 필요`);
}

/** 화면 '확인 필요' 표시용 (projects.reviewFlags) */
const reviewFlags = new Map<string, { field: string; message: string }[]>();
function flag(id: string, field: string, message: string) {
  if (!reviewFlags.has(id)) reviewFlags.set(id, []);
  reviewFlags.get(id)!.push({ field, message });
}

function note(id: string, msg: string) {
  if (!legacyNotes.has(id)) legacyNotes.set(id, []);
  legacyNotes.get(id)!.push(msg);
}

/* ---------------- 연구관리현황 ---------------- */

async function loadResearch(file: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const used = new Set<string>(Object.values(RESEARCH_SHEETS));
  const baseSheetOf = new Map<string, string>();

  // 1) 과제 원장 A·B·C
  for (const [sheet, type, fields] of [
    [RESEARCH_SHEETS.projectsA, 'A', PROJECT_SHEET_FIELDS],
    [RESEARCH_SHEETS.projectsB, 'B', PROJECT_SHEET_FIELDS],
    [RESEARCH_SHEETS.projectsC, 'C', TRUST_SHEET_FIELDS],
  ] as const) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) { checks.push({ 구분: '시트 없음', 대상: sheet, 시트: sheet, 행: '', 내용: '시트 없음', 조치: '파일 확인 필요' }); continue; }
    const rows = readSheet(ws);
    let made = 0;
    let blank = 0;
    for (const r of rows) {
      const rawId = r.get('관리번호');
      const id = text(rawId);
      if (isBlankTemplateId(id)) { blank++; continue; }
      if (!ID_RE.test(id)) {
        checks.push({ 구분: '관리번호 형식', 대상: id || '(빈 칸)', 시트: sheet, 행: String(r.rowNo), 내용: `관리번호 해석 불가 (${rawId instanceof Date ? '날짜로 저장됨' : '형식 오류'})`, 조치: '이관 제외, 수동 확인' });
        continue;
      }
      if (projects.has(id)) {
        checks.push({ 구분: '관리번호 중복', 대상: id, 시트: sheet, 행: String(r.rowNo), 내용: '같은 관리번호 행 중복', 조치: '첫 행 사용, 확인 필요' });
        continue;
      }
      if (id[0] !== type) checks.push({ 구분: '유형 불일치', 대상: id, 시트: sheet, 행: String(r.rowNo), 내용: `관리번호 유형(${id[0]})과 시트 유형(${type}) 상이`, 조치: '관리번호 기준 사용' });
      const doc: Doc = { type: id[0] as ProjectType };
      const excelDeadline: unknown[] = [];
      for (const [header, field] of Object.entries(fields)) {
        if (!r.has(header) || field === 'id') continue;
        // 심의번호 칸에 "심의X/심의O" 가 들어간 경우 심의명으로 보정 (형식 검사 전)
        if (field === 'review.no' && /^심의\s*[OX]$/i.test(text(r.get(header)))) { setPath(doc, 'reviewName', text(r.get(header)).replace(/\s/g, '')); continue; }
        const val = convert(field, r.get(header), { id, sheet, rowNo: r.rowNo });
        if (val === undefined) continue;
        if (field.startsWith('_')) { excelDeadline.push(val); continue; }
        setPath(doc, field, val);
      }
      const period = parsePeriod(String(doc.periodFinal ?? doc.periodInitial ?? ''));
      if (period) { doc.startDate = period.start; if (!doc.endDate || typeof doc.endDate !== 'string' || !/^\d{4}-/.test(doc.endDate)) doc.endDate = period.end; }
      if (period && doc.endDate && doc.endDate !== period.end) {
        mismatches.push({ 관리번호: id, 항목: 'endDate', 원장시트: sheet, 원장값: String(doc.endDate), 비교시트: `${sheet}(연구기간 최종)`, 비교값: period.end, 처리: '연구종료일 칸 유지, legacyNote 기록' });
        note(id, `연구종료일 ${doc.endDate} / 연구기간(최종) 종료 ${period.end} 상이`);
      }
      projects.set(id, doc);
      baseSheetOf.set(id, sheet);
      made++;
    }
    sheetCounts.push({ 파일: '연구관리현황', 시트: sheet, 데이터행: rows.length, 처리: '이관 (과제 원장)', 결과: `과제 ${made}건 / 빈 양식 행 ${blank}건 제외` });
  }

  // 2) 보조 시트: 평가 및 공표 / 점수 및 의견반영여부
  const excelRegime = new Map<string, { value: string; sheet: string }>();
  for (const [sheet, fields] of [
    [RESEARCH_SHEETS.evalA, EVAL_PUBLISH_FIELDS], [RESEARCH_SHEETS.evalB, EVAL_PUBLISH_FIELDS],
    [RESEARCH_SHEETS.scoreA, SCORE_FIELDS], [RESEARCH_SHEETS.scoreB, SCORE_FIELDS],
  ] as const) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) continue;
    const rows = readSheet(ws);
    let merged = 0;
    let blank = 0;
    for (const r of rows) {
      const id = text(r.get('관리번호'));
      if (isBlankTemplateId(id)) { blank++; continue; }
      if (!projects.has(id)) {
        checks.push({ 구분: '원장에 없는 관리번호', 대상: id || '(빈 칸)', 시트: sheet, 행: String(r.rowNo), 내용: '과제 원장 시트에 없음', 조치: '이관 제외, 수동 확인' });
        continue;
      }
      merged++;
      const base = baseSheetOf.get(id)!;
      for (const [header, field] of Object.entries(fields)) {
        if (!r.has(header) || field === 'id') continue;
        const val = convert(field, r.get(header), { id, sheet, rowNo: r.rowNo });
        if (val === undefined) continue;
        if (field === '_excelRegime') {
          const prev = excelRegime.get(id);
          if (prev && cmpKey('', prev.value) !== cmpKey('', val)) {
            mismatches.push({ 관리번호: id, 항목: '연구관리규정(기준)', 원장시트: prev.sheet, 원장값: prev.value, 비교시트: sheet, 비교값: String(val), 처리: '먼저 읽은 값 사용, legacyNote 기록' });
            note(id, `엑셀 규정 표기 ${prev.sheet} "${prev.value}" / ${sheet} "${val}" 상이`);
          } else if (!prev) excelRegime.set(id, { value: String(val), sheet });
          continue;
        }
        if (field === '_excelAverage') { setPath(projects.get(id)!, '_excelAverage', val); continue; }
        mergeSecondary(id, field, val, sheet, base);
      }
      // 평가자·점수 1~5
      if (fields === SCORE_FIELDS) {
        const evaluators: { name: string; score: number | null }[] = [];
        for (let i = 1; i <= 5; i++) {
          const name = text(r.get(`평가자${i}`));
          const sc = r.get(`점수${i}`);
          const score = typeof sc === 'number' ? sc : parseMoney(text(sc));
          if ((name && !/^[X-]$/i.test(name)) || score !== null) evaluators.push({ name: /^[X-]$/i.test(name) ? '' : name, score });
        }
        if (evaluators.length) setPath(projects.get(id)!, 'evaluation.evaluators', evaluators);
      }
    }
    sheetCounts.push({ 파일: '연구관리현황', 시트: sheet, 데이터행: rows.length, 처리: '이관 (보조, 관리번호 병합)', 결과: `병합 ${merged}건 / 빈 양식 행 ${blank}건 제외` });
  }

  // 3) 알리오공시 — 연도+연구과제명으로 대응
  const alioWs = wb.getWorksheet(RESEARCH_SHEETS.alio);
  if (alioWs) {
    const rows = readSheet(alioWs);
    let matched = 0;
    const titleKey = (t: unknown) => String(t ?? '').replace(/\s/g, '');
    const manual = new Map<number, string>(String(args['alio-map'] ?? '').split(',').filter(Boolean).map((p) => {
      const [row, id] = p.split('=').map((x) => x.trim());
      return [Number(row), id] as [number, string];
    }));
    for (const r of rows) {
      const title = titleKey(text(r.get('연구과제명')));
      const year = text(r.get('연도'));
      const forced = manual.get(r.rowNo);
      const hits = forced && projects.has(forced)
        ? [[forced, projects.get(forced)!] as [string, Doc]]
        : [...projects.entries()].filter(([, d]) => titleKey(d.title) === title && (!year || String(d.year) === year));
      if (forced) note(forced, `알리오공시 ${r.rowNo}행 수동 연결 (과제명 "${text(r.get('연구과제명'))}")`);
      if (hits.length !== 1) {
        checks.push({ 구분: '알리오공시 미대응', 대상: text(r.get('연구과제명')).slice(0, 40), 시트: RESEARCH_SHEETS.alio, 행: String(r.rowNo), 내용: hits.length ? `같은 과제명 ${hits.length}건` : '과제명 일치 과제 없음', 조치: '수동 대응 필요' });
        continue;
      }
      matched++;
      const [id] = hits[0];
      for (const [header, field] of Object.entries(ALIO_FIELDS)) {
        if (['year', 'seq', 'title'].includes(field) || !r.has(header)) continue;
        const val = convert(field, r.get(header), { id, sheet: RESEARCH_SHEETS.alio, rowNo: r.rowNo });
        if (val !== undefined) mergeSecondary(id, field, val, RESEARCH_SHEETS.alio, baseSheetOf.get(id)!);
      }
    }
    sheetCounts.push({ 파일: '연구관리현황', 시트: RESEARCH_SHEETS.alio, 데이터행: rows.length, 처리: '이관 (보조, 과제명 대응)', 결과: `대응 ${matched}건 / 미대응 ${rows.length - matched}건` });
  }

  // 4) 심의개최 — 연구심의위원회 회의 (심의정보(연심)과 병합) / 5) 심의현황 — 심의 상세
  const meetingRows = wb.getWorksheet(RESEARCH_SHEETS.meetings) ? readSheet(wb.getWorksheet(RESEARCH_SHEETS.meetings)!) : [];
  const reviewRows = wb.getWorksheet(RESEARCH_SHEETS.reviews) ? readSheet(wb.getWorksheet(RESEARCH_SHEETS.reviews)!) : [];

  // 나머지 시트: 참고·미이관
  for (const ws of wb.worksheets) {
    if (used.has(ws.name)) continue;
    sheetCounts.push({ 파일: '연구관리현황', 시트: ws.name, 데이터행: countRows(ws), 처리: '미이관 (참고·과거 자료)', 결과: '-' });
  }
  // 전임자 시트 관리번호(날짜 저장) 건수 — 지시서 14장
  const prevWs = wb.worksheets.find((w) => w.name.startsWith('전임자'));
  if (prevWs) {
    const bad = readSheet(prevWs).filter((r) => !ID_RE.test(text(r.get('관리번호'))));
    if (bad.length) checks.push({ 구분: '전임자 시트 관리번호', 대상: `${bad.length}행`, 시트: prevWs.name, 행: '', 내용: '관리번호 칸이 날짜(심의번호) 형식 → 과제와 연결 불가', 조치: '미이관, 필요 시 수동 확인' });
  }

  return { meetingRows, reviewRows, excelRegime };
}

/* ---------------- 심의위원회현황 ---------------- */

type Meeting = Doc & { date: string };
const committee = {
  research: { members: new Map<string, Doc>(), meetings: [] as Meeting[], reviews: [] as Doc[] },
  irb: { members: new Map<string, Doc>(), meetings: [] as Meeting[], reviews: [] as Doc[] },
};

/** 성명 익명화: 홍길동 → 홍○동, 남궁길동 → 남○○동, 이린 → 이○ */
export function maskName(name: string): string {
  const n = name.trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return `${n[0]}○`;
  return `${n[0]}${'○'.repeat(n.length - 2)}${n[n.length - 1]}`;
}

/** "2020. 1. 30. ~ 2. 3." → 시작일 ISO */
function meetingStart(v: Raw, year?: Raw): string | null {
  const d = isoDate(v);
  if (d) return d;
  const t = text(v);
  const m = /(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})/.exec(t);
  if (m) return parseDate(`${m[1]}.${m[2]}.${m[3]}`);
  void year;
  return null;
}

const num = (v: Raw) => (typeof v === 'number' ? v : parseMoney(text(v)));

async function loadCommittee(file: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const used = new Set<string>(Object.values(COMMITTEE_SHEETS));

  for (const ws of wb.worksheets) {
    if (BLOCKED_SHEETS.includes(ws.name)) {
      checks.push({ 구분: '인적정보 시트 발견', 대상: ws.name, 시트: ws.name, 행: '', 내용: '정보보안 확인 전 이관 금지 시트 포함', 조치: '읽지 않음 (제외 사본 재확인 필요)' });
      sheetCounts.push({ 파일: '심의위원회현황', 시트: ws.name, 데이터행: 0, 처리: '차단 (인적정보, 읽지 않음)', 결과: '-' });
    }
  }

  // 위원 명단: "이름 (소속)" → 익명화 성명·소속·임기 (실명은 출력하지 않음)
  const roster = wb.getWorksheet(COMMITTEE_SHEETS.roster);
  if (roster) {
    const rows = readSheet(roster);
    for (const r of rows) {
      const cmt = text(r.get('위원회명')).includes('생명윤리') ? 'irb' : 'research';
      const raw = text(r.get('위원명단'));
      const m = /^([^()]+?)\s*(?:\(([^)]*)\))?$/.exec(raw);
      const realName = (m?.[1] ?? raw).trim();
      if (!realName) continue;
      const key = realName; // 메모리 안 묶음 기준만
      const map = committee[cmt].members;
      const doc = map.get(key) ?? { nameMasked: maskName(realName), org: '', terms: [] as string[], role: '위원', note: [] as string[] };
      if (m?.[2]) doc.org = m[2].trim();
      (doc.terms as string[]).push(text(r.get('임기')));
      const remark = text(r.get('비고'));
      if (remark.includes('위원장')) doc.role = '위원장';
      if (remark && !remark.includes('위원장')) (doc.note as string[]).push(remark);
      map.set(key, doc);
    }
    sheetCounts.push({ 파일: '심의위원회현황', 시트: COMMITTEE_SHEETS.roster, 데이터행: rows.length, 처리: '이관 (위원, 익명화 성명만)', 결과: `연구심의 ${committee.research.members.size}명 / IRB ${committee.irb.members.size}명` });
  }

  // 회의
  for (const [sheet, cmt] of [[COMMITTEE_SHEETS.meetingsIrb, 'irb'], [COMMITTEE_SHEETS.meetingsResearch, 'research']] as const) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) continue;
    const rows = readSheet(ws);
    let noDate = 0;
    for (const r of rows) {
      if (!text(r.get('개최일자'))) { noDate++; continue; } // 일자 없는 행(합계·메모 등)
      const date = meetingStart(r.get('개최일자'));
      if (!date) {
        checks.push({ 구분: '회의 일자 형식', 대상: text(r.get('개최일자')) || '(빈 칸)', 시트: sheet, 행: String(r.rowNo), 내용: '개최일자 해석 불가', 조치: '이관 제외, 확인 필요' });
        continue;
      }
      const results: Record<string, number> = {};
      for (const k of ['승인', '시정승인', '조건부승인', '조건부 승인', '보완 후 재심의', '반려', '심의면제', '재심의']) {
        const v = num(r.get(k));
        if (v !== null) results[k.replace(/\s/g, '')] = v;
      }
      committee[cmt].meetings.push({
        year: num(r.get('연도')), date, dateText: text(r.get('개최일자')),
        chairAttended: text(r.get('위원장 참석여부')), enrolled: num(r.get('재적')), attended: num(r.get('참석자수')), absent: num(r.get('불참석자수')),
        attendeesMasked: text(r.get('참석자 현황(익명)')), // 실명 칸(참석자 현황)은 이관 안 함
        mode: text(r.get('회의 대면/서면')), place: text(r.get('회의장소')),
        agendaCount: num(r.get('안건수')), agendaTitles: text(r.get('안건명')), resultText: text(r.get('회의결과')), results,
        fee: num(r.get('총액')), minutes: text(r.get('회의록 작성여부')), docNo: '', source: sheet,
      });
    }
    sheetCounts.push({ 파일: '심의위원회현황', 시트: sheet, 데이터행: rows.length, 처리: '이관 (회의)', 결과: `회의 ${committee[cmt].meetings.length}건 / 일자 없는 행 ${noDate}건 제외` });
  }

  // IRB 심의 상세 (심의위원 실명 → 익명화)
  const det = wb.getWorksheet(COMMITTEE_SHEETS.reviewsIrb);
  if (det) {
    const rows = readSheet(det);
    for (const r of rows) {
      committee.irb.reviews.push({
        year: num(r.get('연도')), meeting: text(r.get('회차(일자)')), kind: text(r.get('구분')),
        projectTitle: text(r.get('연구과제명')), pi: text(r.get('연구책임자')),
        reviewerMasked: text(r.get('심의위원')) ? maskName(text(r.get('심의위원'))) : '', result: text(r.get('심의결과')),
      });
    }
    sheetCounts.push({ 파일: '심의위원회현황', 시트: COMMITTEE_SHEETS.reviewsIrb, 데이터행: rows.length, 처리: '이관 (IRB 심의 상세, 심의위원 익명화)', 결과: `심의 ${rows.length}건` });
  }

  for (const ws of wb.worksheets) {
    if (used.has(ws.name) || BLOCKED_SHEETS.includes(ws.name)) continue;
    sheetCounts.push({ 파일: '심의위원회현황', 시트: ws.name, 데이터행: countRows(ws), 처리: '미이관 (참고·파생 자료)', 결과: '-' });
  }
}

/* ---------------- 실행 ---------------- */

function csv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n') + '\r\n';
}

async function main() {
  const out = args.out;
  mkdirSync(out, { recursive: true });

  const { meetingRows, reviewRows, excelRegime } = await loadResearch(args.research);
  if (args.committee) await loadCommittee(args.committee);

  // 심의개최(연구관리현황) ↔ 심의정보(연심) 병합
  let added = 0;
  for (const r of meetingRows) {
    const date = meetingStart(r.get('개최일자'));
    if (!date) { checks.push({ 구분: '회의 일자 형식', 대상: text(r.get('개최일자')), 시트: RESEARCH_SHEETS.meetings, 행: String(r.rowNo), 내용: '개최일자 해석 불가', 조치: '확인 필요' }); continue; }
    const hit = committee.research.meetings.find((m) => m.date === date);
    const docNo = text(r.get('근거'));
    if (hit) {
      hit.docNo = docNo;
      const a = text(r.get('대면/비대면'));
      const b = String(hit.mode ?? '');
      if (a && b && a.replace(/비대면/, '서면') !== b) {
        mismatches.push({ 관리번호: `회의 ${date}`, 항목: '회의 방식', 원장시트: COMMITTEE_SHEETS.meetingsResearch, 원장값: b, 비교시트: RESEARCH_SHEETS.meetings, 비교값: a, 처리: '심의정보(연심) 값 유지' });
      }
    } else {
      added++;
      committee.research.meetings.push({ date, dateText: text(r.get('개최일자')), year: num(r.get('연도')), mode: text(r.get('대면/비대면')), docNo, source: RESEARCH_SHEETS.meetings });
      checks.push({ 구분: '회의 목록 차이', 대상: date, 시트: RESEARCH_SHEETS.meetings, 행: String(r.rowNo), 내용: '심의정보(연심)에 없는 회의', 조치: '회의로 추가 (확인 필요)' });
    }
  }
  sheetCounts.push({ 파일: '연구관리현황', 시트: RESEARCH_SHEETS.meetings, 데이터행: meetingRows.length, 처리: '이관 (연구심의 회의, 심의정보(연심)과 병합)', 결과: `일치 ${meetingRows.length - added}건 / 추가 ${added}건` });

  // 심의현황 → 연구심의 심의 상세 (심의승인번호로 과제 연결)
  let linked = 0;
  for (const r of reviewRows) {
    const rawNo = r.get('심의승인번호');
    const no = rawNo ? normalizeReviewNo(rawNo instanceof Date ? rawNo : text(rawNo)) : null;
    const project = no ? [...projects.entries()].find(([, d]) => getPath(d, 'review.no') === no) : undefined;
    if (project) {
      linked++;
      const pr = text(getPath(project[1], 'review.result') as Raw ?? null);
      const rr = text(r.get('최초 심의결과'));
      if (pr && rr && pr.replace(/\s/g, '') !== rr.replace(/\s/g, '')) {
        mismatches.push({ 관리번호: project[0], 항목: 'review.result', 원장시트: '과제 원장', 원장값: pr, 비교시트: RESEARCH_SHEETS.reviews, 비교값: rr, 처리: '원장 유지, legacyNote 기록' });
        note(project[0], `심의결과 원장 "${pr}" / 심의현황 "${rr}" 상이`);
      }
    }
    committee.research.reviews.push({
      year: num(r.get('연도')), month: num(r.get('월')), projectTitle: text(r.get('심의신청명')), result: text(r.get('최초 심의결과')),
      reviewNo: no ?? text(rawNo), note: text(r.get('비고')), projectId: project?.[0] ?? null,
    });
  }
  sheetCounts.push({ 파일: '연구관리현황', 시트: RESEARCH_SHEETS.reviews, 데이터행: reviewRows.length, 처리: '이관 (연구심의 심의 상세)', 결과: `과제 연결 ${linked}건 / 미연결 ${reviewRows.length - linked}건` });

  // 적용 규정 판별 ↔ 엑셀 표기 비교
  const meetingDates = committee.research.meetings.map((m) => m.date);
  const summary: Record<string, unknown>[] = [];
  for (const [id, d] of projects) {
    const input: ProjectInput = {
      id, type: d.type as ProjectType, reviewName: d.reviewName as string | undefined,
      startDate: (d.startDate as string) ?? null, endDate: /^\d{4}-\d{2}-\d{2}$/.test(String(d.endDate)) ? (d.endDate as string) : null,
      review: { no: getPath(d, 'review.no') as string | undefined, ym: getPath(d, 'review.ym') as string | undefined },
    };
    const reg = determineRegime(input, meetingDates);
    const ex = excelRegime.get(id)?.value ?? null;
    if (reg.status === 'unknown') checks.push({ 구분: '적용 규정 판별 불가', 대상: id, 시트: '-', 행: '', 내용: reg.basis, 조치: '연구기간 확인 필요' });
    const cmp = compareExcelRegime(reg.regime, ex);
    // 판별 결과 사용 (2026.11.13. 승인), 엑셀 표기는 legacyNote 기록
    if (cmp && reg.regime) note(id, `엑셀 규정 표기 "${ex}" / 판별 결과 ${REGIMES[reg.regime].label} 사용 (${cmp.level === 'warn' ? '판단 기준 상이' : '기한 산정 동일, 표기만 상이'})`);
    if (cmp) checks.push({ 구분: cmp.level === 'warn' ? '규정 판별 상이' : '규정 표기만 상이', 대상: id, 시트: '평가 및 공표', 행: '', 내용: `${cmp.text} / 판별: ${reg.regime ? REGIMES[reg.regime].label : '-'} (${reg.basis})`, 조치: cmp.level === 'warn' ? '확인 필요 표시' : '조치 없음' });
    // 평균 점수 비교
    const evs = (getPath(d, 'evaluation.evaluators') as { score: number | null }[] | undefined) ?? [];
    const scores = evs.map((e) => e.score).filter((s): s is number => typeof s === 'number');
    const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
    const exAvg = d._excelAverage;
    if (avg !== null && typeof exAvg === 'number' && Math.abs(avg - exAvg) > 0.1) {
      mismatches.push({ 관리번호: id, 항목: '평가 평균점수', 원장시트: '앱 재산정', 원장값: String(avg), 비교시트: '점수 및 의견반영여부', 비교값: String(exAvg), 처리: '앱 산정값 사용, legacyNote 기록' });
      note(id, `평균점수 엑셀 ${exAvg} / 재산정 ${avg} 상이`);
    }
    delete d._excelAverage;
    delete d._excelRegime;
    if (ex) d.excelRegimeLabel = ex;
    d.legacyNote = (legacyNotes.get(id) ?? []).join('\n');
    if (reviewFlags.has(id)) d.reviewFlags = reviewFlags.get(id);
    summary.push({
      관리번호: id, 유형: d.type, 연구과제명: d.title, 연구기간: d.periodFinal ?? d.periodInitial ?? '', 연구종료일: d.endDate ?? '',
      심의승인번호: getPath(d, 'review.no') ?? '', 판별규정: reg.regime ? REGIMES[reg.regime].label : reg.status === 'excluded' ? '판별 제외(수탁)' : '판별 불가',
      판별근거: reg.basis, 엑셀규정표기: ex ?? '', legacyNote건수: legacyNotes.get(id)?.length ?? 0,
    });
  }

  const cmtSummary = (['research', 'irb'] as const).flatMap((c) => [
    { 위원회: c === 'research' ? '연구심의위원회' : '기관생명윤리위원회', 구분: '위원(익명화)', 건수: committee[c].members.size },
    { 위원회: c === 'research' ? '연구심의위원회' : '기관생명윤리위원회', 구분: '회의', 건수: committee[c].meetings.length },
    { 위원회: c === 'research' ? '연구심의위원회' : '기관생명윤리위원회', 구분: '심의 상세', 건수: committee[c].reviews.length },
  ]);

  writeFileSync(join(out, '01_시트별_건수.csv'), csv(sheetCounts));
  writeFileSync(join(out, '02_불일치_목록.csv'), csv(mismatches, ['관리번호', '항목', '원장시트', '원장값', '비교시트', '비교값', '처리']));
  writeFileSync(join(out, '03_확인필요_목록.csv'), csv(checks, ['구분', '대상', '시트', '행', '내용', '조치']));
  writeFileSync(join(out, '04_과제_요약.csv'), csv(summary));
  writeFileSync(join(out, '05_심의위원회_요약.csv'), csv(cmtSummary));
  writeFileSync(join(out, 'migration-preview.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), baseDate: TODAY, draft: true,
    projects: Object.fromEntries(projects),
    committees: Object.fromEntries((['research', 'irb'] as const).map((c) => [c, {
      members: [...committee[c].members.values()], meetings: committee[c].meetings.sort((a, b) => a.date.localeCompare(b.date)), reviews: committee[c].reviews,
    }])),
  }, null, 2));

  const byType = (t: string) => [...projects.values()].filter((d) => d.type === t).length;
  console.log(`과제 ${projects.size}건 (내부 ${byType('A')} / 위탁 ${byType('B')} / 수탁 ${byType('C')})`);
  console.log(`불일치 ${mismatches.length}건 (보충 ${mismatches.filter((m) => m.처리 === '빈 칸 보충').length}건) / 확인 필요 ${checks.length}건`);
  console.log(`위원회: ${cmtSummary.map((c) => `${c.위원회} ${c.구분} ${c.건수}`).join(' / ')}`);
  console.log(`결과: ${out}`);
}

void main();
