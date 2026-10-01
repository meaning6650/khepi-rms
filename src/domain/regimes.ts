/**
 * 적용 규정 구간 정의 — 연구관리규정 원문(reference/regulations) 대조 결과
 * 기한·절차가 달라지는 구간 5개 / 판별 로직은 파일 하단 determineRegime
 */

import { formatDate, formatDateShort, parseYm, reviewYmFromNo, toISO } from './fields';
import type { ProjectInput } from './types';

export type RegimeKey = 'R2019' | 'R2020' | 'R2022' | 'R2023' | 'R2025';

export type Regime = {
  key: RegimeKey;
  label: string;
  ruleNo: string;
  effective: string; // YYYY-MM-DD
  basis: string;     // 적용 기준
  note?: string;
};

export const REGIMES: Record<RegimeKey, Regime> = {
  R2019: { key: 'R2019', label: '2019년도 규정', ruleNo: '제77호(제정)', effective: '2019-04-18', basis: '연구시작일(협약일)', note: '부칙: 시행 이전 협약 과제는 종전 협약내용 적용' },
  R2020: { key: 'R2020', label: '2020년도 규정', ruleNo: '제107호', effective: '2020-08-12', basis: '연구시작일' },
  R2022: { key: 'R2022', label: '2022년도 규정', ruleNo: '제153호(전부개정)', effective: '2022-07-15', basis: '심의 승인일', note: '부칙: 시행일 이후 선정 과제부터 적용' },
  R2023: { key: 'R2023', label: '2023년도 규정', ruleNo: '제174호', effective: '2023-05-12', basis: '심의 승인일', note: '기한 산정 R2022와 동일 / 위탁 신청 서식 변경' },
  R2025: { key: 'R2025', label: '2025년도 규정', ruleNo: '제212호', effective: '2025-08-11', basis: '연구종료일', note: '적용례 없음, 개정일부터 시행' },
};

export const REGIME_ORDER: RegimeKey[] = ['R2025', 'R2023', 'R2022', 'R2020', 'R2019'];

/** 화면 표기: "2025년도 규정 (제212호, 2025.8.11. 시행)" */
export function regimeTitle(k: RegimeKey): string {
  const r = REGIMES[k];
  const [y, m, d] = r.effective.split('-').map(Number);
  return `${r.label} (${r.ruleNo.replace(/\(.*\)/, '')}, ${y}.${m}.${d}. 시행)`;
}

/* ---------- 규정 기준표 (구간별 비교) ---------- */

export type CompareRow = {
  item: string;
  R2019: string;
  R2020: string;
  R2022: string;
  R2023: string;
  R2025: string;
};

export const COMPARE_ROWS: CompareRow[] = [
  {
    item: '연구과제 평가',
    R2019: '종료 후 1개월 이내 (제10조)',
    R2020: '종료 후 1개월 이내 (제12조)',
    R2022: '종료 전 실시 (제23조)',
    R2023: '종료 전 실시 (제23조)',
    R2025: '종료 전 실시 / 60점 미만 부적격 → 재평가 1회 (제23조)',
  },
  {
    item: '평가위원',
    R2019: '규정 없음',
    R2020: '규정 없음',
    R2022: '3인 이상',
    R2023: '3인 이상',
    R2025: '외부 전문가 등 3인 이상',
  },
  {
    item: '평가결과서 제출',
    R2019: '종료 후 1개월 이내',
    R2020: '종료 후 1개월 이내 (서식7호)',
    R2022: '종료 후 1개월 이내 (자체평가, 서식8호)',
    R2023: '종료 후 1개월 이내 (자체평가, 서식8호)',
    R2025: '종료 후 1개월 이내 (서식11호)',
  },
  {
    item: '종료보고',
    R2019: '규정 없음',
    R2020: '규정 없음',
    R2022: '종료일 이전 (서식6호)',
    R2023: '종료일 이전 (서식6호)',
    R2025: '종료일 이전 / 보고서 (서식7호)',
  },
  {
    item: '최종보고서 제출',
    R2019: '규정 없음',
    R2020: '규정 없음',
    R2022: '종료 후 1개월 이내',
    R2023: '종료 후 1개월 이내',
    R2025: '종료 후 3개월 이내 / 연기 1회 최대 3개월 (서식18호)',
  },
  {
    item: '홈페이지 공표',
    R2019: '기한 없음 (지체 없이, 연구관리 시스템)',
    R2020: '기한 없음 (지체 없이, 홈페이지)',
    R2022: '종료 후 6개월 이내',
    R2023: '종료 후 6개월 이내',
    R2025: '종료 후 6개월 이내 / 비공개 해제 후 3개월 이내 원문 교체',
  },
  {
    item: '점검표',
    R2019: '규정 없음',
    R2020: '규정 없음',
    R2022: '차년도 6월 이전 (서식13호)',
    R2023: '차년도 6월 이전 (서식13호)',
    R2025: '차년도 6월까지 (서식16호)',
  },
  {
    item: '서식',
    R2019: '서식1~3호 (신청서, 결과 활용 계획서, 심의 결과 확인서)',
    R2020: '서식1~8호',
    R2022: '서식1~14호',
    R2023: '서식1~14호 / 위탁 신청: 심의신청서(서식2호)+RFP',
    R2025: '서식1~18호, 별지1호',
  },
];

/* ---------- 개정 이력 ---------- */

export type Revision = { date: string; title: string; changesDeadline: boolean; regime?: RegimeKey; memo?: string };

export const REVISIONS: Revision[] = [
  { date: '2019.04.18.', title: '제정 (제77호)', changesDeadline: true, regime: 'R2019' },
  { date: '2020.08.12.', title: '제107호', changesDeadline: true, regime: 'R2020', memo: '서식1~8호 신설·개정' },
  { date: '2022.03.02.', title: '제146호 (직제규정)', changesDeadline: false, memo: '위원장 직위 변경' },
  { date: '2022.07.15.', title: '제153호 (전부개정)', changesDeadline: true, regime: 'R2022' },
  { date: '2023.05.12.', title: '제174호', changesDeadline: false, regime: 'R2023', memo: '위탁 신청 서식 변경' },
  { date: '2025.04.01.', title: '제201호 (직제규정)', changesDeadline: false, memo: '사무국 건강증진연구소' },
  { date: '2025.04.23.', title: '제209호', changesDeadline: false, memo: '서식2·3호' },
  { date: '2025.08.11.', title: '제212호', changesDeadline: true, regime: 'R2025' },
  { date: '2025.12.09.', title: '제219호', changesDeadline: false, memo: '연구윤리지침, 계약방식 제한경쟁 추가' },
  { date: '2026.03.03.', title: '제221호', changesDeadline: false, memo: '서식3호' },
];

/* ---------- 단계별 관련 조항·서식 (구간마다 번호 상이) ---------- */

export type StageKey =
  | 'review' | 'contract' | 'kickoff' | 'interim' | 'evaluation'
  | 'evalDoc' | 'finalBrief' | 'finalReport' | 'publication' | 'checklist';

/** null = 해당 구간에 단계 없음 */
export type StageRef = { article: string; forms: string } | null;

export const STAGE_REFS: Record<RegimeKey, Record<StageKey, StageRef>> = {
  R2019: {
    review: { article: '제8·9조', forms: '서식1·3호' },
    contract: { article: '제9조', forms: '-' },
    kickoff: null, interim: null,
    evaluation: { article: '제10조', forms: '결과평가서' },
    evalDoc: { article: '제10조', forms: '결과평가서, 서식2호' },
    finalBrief: null, finalReport: null,
    publication: { article: '제10조', forms: '-' },
    checklist: null,
  },
  R2020: {
    review: { article: '제9·10조', forms: '서식1~5호' },
    contract: { article: '제10조', forms: '-' },
    kickoff: null, interim: null,
    evaluation: { article: '제12조', forms: '서식7호' },
    evalDoc: { article: '제12조', forms: '서식7·8호' },
    finalBrief: null, finalReport: null,
    publication: { article: '제12조', forms: '-' },
    checklist: null,
  },
  R2022: {
    review: { article: '제14·15조', forms: '서식3·4호' },
    contract: { article: '제16조', forms: '-' },
    kickoff: { article: '제21조', forms: '서식6호' },
    interim: { article: '제21조', forms: '서식6호' },
    evaluation: { article: '제23조', forms: '서식8호' },
    evalDoc: { article: '제23조', forms: '서식8호' },
    finalBrief: { article: '제24조', forms: '서식6호' },
    finalReport: { article: '제25조', forms: '-' },
    publication: { article: '제26조', forms: '서식9·10·11·12호' },
    checklist: { article: '제29조', forms: '서식13호' },
  },
  R2023: {
    review: { article: '제14·15조', forms: '서식3·4호' },
    contract: { article: '제16조', forms: '-' },
    kickoff: { article: '제21조', forms: '서식6호' },
    interim: { article: '제21조', forms: '서식6호' },
    evaluation: { article: '제23조', forms: '서식8호' },
    evalDoc: { article: '제23조', forms: '서식8호' },
    finalBrief: { article: '제24조', forms: '서식6호' },
    finalReport: { article: '제25조', forms: '-' },
    publication: { article: '제26조', forms: '서식9·10·11·12호' },
    checklist: { article: '제29조', forms: '서식13호' },
  },
  R2025: {
    review: { article: '제14·15조', forms: '서식3·4호' },
    contract: { article: '제16조', forms: '-' },
    kickoff: { article: '제21조', forms: '서식7호' },
    interim: { article: '제21조', forms: '서식7호' },
    evaluation: { article: '제23조', forms: '서식11호' },
    evalDoc: { article: '제23조', forms: '서식11호' },
    finalBrief: { article: '제24조', forms: '서식7호' },
    finalReport: { article: '제25조', forms: '별지1호, 서식12·18호' },
    publication: { article: '제26조', forms: '서식12·13·14·15호' },
    checklist: { article: '제29조', forms: '서식16호' },
  },
};

/* ---------- 적용 규정 판별 (지시서 5장) ---------- */


const D2025 = '2025-08-11';
const D2023 = '2023-05-12';
const D2022 = '2022-07-15';
const D2020 = '2020-08-12';

export type RegimeResult =
  | { status: 'ok'; regime: RegimeKey; basis: string; by: 'override' | 'endDate' | 'review' | 'startDate' }
  | { status: 'excluded'; regime: null; basis: string }   // 수탁연구
  | { status: 'unknown'; regime: null; basis: string };   // 판별 불가

/**
 * 심의 승인일 산출
 * - review.ym("YYYY.MM.") 우선, 없으면 review.no 앞 4자리(YYMM)
 * - meetingDates(심의개최 목록, ISO) 중 같은 연월의 가장 이른 개최일 사용, 없으면 해당 월 1일
 */
export function reviewApprovalDate(
  review: ProjectInput['review'],
  meetingDates: string[] = [],
): { iso: string; ym: string; matched: boolean } | null {
  if (!review) return null;
  const ym = parseYm(review.ym) ?? parseYm(reviewYmFromNo(review.no));
  if (!ym) return null;
  const prefix = toISO(ym.y, ym.m, 1).slice(0, 7);
  const hit = meetingDates.filter((d) => d.startsWith(prefix)).sort()[0];
  return {
    iso: hit ?? `${prefix}-01`,
    ym: `${ym.y}.${String(ym.m).padStart(2, '0')}.`,
    matched: !!hit,
  };
}

/** 심의명 "심의X" 여부 (공백·대소문자 무시) */
export function isNoReview(reviewName: string | undefined): boolean {
  return !!reviewName && /^심의\s*x$/i.test(reviewName.trim());
}

/**
 * 적용 규정 판별
 * 1) regimeOverride 2) 수탁 제외 3) 종료일 ≥ 2025.8.11. → R2025
 * 4) 심의 승인일 ≥ 2023.5.12. → R2023, ≥ 2022.7.15. → R2022 (심의X 이면 무시)
 * 5) 연구시작일 기준 (없으면 심의 승인일 대체), 둘 다 없으면 판별 불가
 */
export function determineRegime(p: ProjectInput, meetingDates: string[] = []): RegimeResult {
  if (p.regimeOverride) {
    return { status: 'ok', regime: p.regimeOverride, by: 'override', basis: `수동 지정 / ${REGIMES[p.regimeOverride].label}` };
  }
  if (p.type === 'C') {
    return { status: 'excluded', regime: null, basis: '수탁연구 / 발주처 계약조건 적용 (제27조)' };
  }
  if (p.endDate && p.endDate >= D2025) {
    return { status: 'ok', regime: 'R2025', by: 'endDate', basis: `연구종료일 ${formatDate(p.endDate)} / ${formatDateShort(D2025)} 이후 종료 과제 해당` };
  }

  const approval = isNoReview(p.reviewName) ? null : reviewApprovalDate(p.review, meetingDates);
  if (approval) {
    if (approval.iso >= D2023) return { status: 'ok', regime: 'R2023', by: 'review', basis: `심의 승인 ${approval.ym} / ${formatDateShort(D2023)} 이후 심의 승인 과제 해당` };
    if (approval.iso >= D2022) return { status: 'ok', regime: 'R2022', by: 'review', basis: `심의 승인 ${approval.ym} / ${formatDateShort(D2022)} 이후 심의 승인 과제 해당` };
  }

  const base = p.startDate ? { iso: p.startDate, label: `연구시작일 ${formatDate(p.startDate)}`, noun: '시작' }
    : approval ? { iso: approval.iso, label: `심의 승인 ${approval.ym} (연구시작일 미입력)`, noun: '심의 승인' }
    : null;
  if (!base) {
    return { status: 'unknown', regime: null, basis: '연구기간 미입력 / 적용 규정 판별 불가' };
  }
  const by = 'startDate' as const;
  if (base.iso >= D2023) return { status: 'ok', regime: 'R2023', by, basis: `${base.label} / ${formatDateShort(D2023)} 이후 ${base.noun} 과제 해당` };
  if (base.iso >= D2022) return { status: 'ok', regime: 'R2022', by, basis: `${base.label} / ${formatDateShort(D2022)} 이후 ${base.noun} 과제 해당` };
  if (base.iso >= D2020) return { status: 'ok', regime: 'R2020', by, basis: `${base.label} / ${formatDateShort(D2020)} 이후 ${base.noun} 과제 해당` };
  return { status: 'ok', regime: 'R2019', by, basis: `${base.label} / ${formatDateShort(D2020)} 이전 ${base.noun} 과제 해당` };
}

/**
 * 현행 엑셀 '연구관리규정(기준)' 표기와 비교
 * - 같으면 null / R2023 vs "2022년도" → 라벨만 상이 / 그 외 → 확인 필요
 */
export function compareExcelRegime(regime: RegimeKey | null, excelLabel: string | null | undefined):
  { level: 'info' | 'warn'; text: string } | null {
  if (!regime || !excelLabel || !excelLabel.trim()) return null;
  const year = /(\d{4})/.exec(excelLabel)?.[1];
  const excelKey = year ? (`R${year}` as RegimeKey) : null;
  if (excelKey === regime) return null;
  const label = excelLabel.trim();
  const pair = new Set([regime, excelKey]);
  if (pair.has('R2022') && pair.has('R2023')) {
    return { level: 'info', text: `엑셀 표기 ${label} / 기한 산정 동일, 라벨만 상이` };
  }
  return { level: 'warn', text: `엑셀 표기 ${label} / 판단 기준 상이, 확인 필요` };
}
