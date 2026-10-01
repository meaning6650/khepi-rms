/**
 * 입력 규칙 (지시서 8장) — 날짜·기간·출생년월·금액·심의승인번호 정규화와 표시
 * 내부 저장 형식: 날짜 ISO "YYYY-MM-DD", 금액 number, 심의승인번호 "YYMM-NN" 문자열
 */

/* ---------- 날짜 기본 연산 (UTC 기준, 시간대 영향 없음) ---------- */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function toISO(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

function splitISO(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** b - a (일) */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = splitISO(a);
  const [by, bm, bd] = splitISO(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = splitISO(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** 월 더하기, 말일 보정 (엑셀 EDATE 방식): 2025-08-31 +1 → 2025-09-30 */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = splitISO(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISO(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** 오늘 날짜 (사용자 PC 기준) */
export function todayISO(now = new Date()): string {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/* ---------- 단일 날짜 ---------- */

/** 두 자리 연도 → 네 자리 (00~69 → 20xx, 70~99 → 19xx) */
function expandYear(yy: number): number {
  return yy < 70 ? 2000 + yy : 1900 + yy;
}

/**
 * 날짜 입력 정규화
 * 허용: 20211210 / 2021.12.10 / 2021.12.10. / 21.12.10 / 2021-12-10 / 2021/12/10 / 2021. 12. 10.
 * 반환: ISO 또는 null(해석 불가·존재하지 않는 날짜)
 */
export function parseDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().replace(/\.$/, '');
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) m = /^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})$/.exec(s);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    const short = /^(\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})$/.exec(s);
    if (!short) return null;
    [y, mo, d] = [expandYear(Number(short[1])), Number(short[2]), Number(short[3])];
  }
  return isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
}

/** 화면 표시 "YYYY.MM.DD." */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = splitISO(iso);
  return `${pad(y, 4)}.${pad(m)}.${pad(d)}.`;
}

/** 시행일 등 짧은 표기 "2025.8.11." */
export function formatDateShort(iso: string): string {
  const [y, m, d] = splitISO(iso);
  return `${y}.${m}.${d}.`;
}

/* ---------- 기간 ---------- */

export type Period = { start: string; end: string };

/**
 * 기간 입력 정규화
 * 허용: 20250101-20251231 / 2025.1.1~2025.12.31 / 2025.01.01.~2025.12.31. / 2025-01-01~2025-12-31
 */
export function parsePeriod(input: string | null | undefined): Period | null {
  if (!input) return null;
  const s = input.trim();
  let parts: string[] | null = null;
  const compact = /^(\d{8})\s*[-~–]\s*(\d{8})$/.exec(s);
  if (compact) parts = [compact[1], compact[2]];
  else if (/[~～–]/.test(s)) parts = s.split(/\s*[~～–]\s*/);
  else {
    // 구분자 "-" 만 쓴 경우: "2025.1.1-2025.12.31" (ISO 형식 날짜와 혼용 불가)
    const dash = /^(\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?)\s*-\s*(\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?)$/.exec(s);
    if (dash) parts = [dash[1], dash[2]];
  }
  if (!parts || parts.length !== 2) return null;
  const start = parseDate(parts[0]);
  const end = parseDate(parts[1]);
  if (!start || !end || end < start) return null;
  return { start, end };
}

/** "2025.01.01.~2025.12.31." */
export function formatPeriod(p: Period | null): string {
  return p ? `${formatDate(p.start)}~${formatDate(p.end)}` : '';
}

/* ---------- 출생년월 (YYMMDD) ---------- */

/** 650506 → 1965-05-06. 두 자리 연도는 기준일 연도 이하면 20xx, 초과면 19xx */
export function parseBirth(input: string | null | undefined, refISO = todayISO()): string | null {
  if (!input) return null;
  const s = input.replace(/\D/g, '');
  if (s.length !== 6) return null;
  const yy = Number(s.slice(0, 2));
  const refYY = Number(refISO.slice(2, 4));
  const y = yy <= refYY ? 2000 + yy : 1900 + yy;
  const mo = Number(s.slice(2, 4));
  const d = Number(s.slice(4, 6));
  return isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
}

/** 만 나이 (기준일 표기는 화면에서) */
export function ageOn(birthISO: string, refISO: string): number {
  const [by, bm, bd] = splitISO(birthISO);
  const [ry, rm, rd] = splitISO(refISO);
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0);
}

/** 마스킹 "65****" (쉼표 표시 금지) */
export function maskBirth(input: string): string {
  const s = input.replace(/\D/g, '');
  return s.length >= 2 ? `${s.slice(0, 2)}****` : '';
}

/* ---------- 금액 ---------- */

/** 숫자만 저장. "48,000,000원" → 48000000 / 숫자 없으면 null */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : null;
  const s = input.replace(/[^\d]/g, '');
  return s ? Number(s) : null;
}

/** 화면에만 천 단위 쉼표 */
export function formatMoney(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : n.toLocaleString('ko-KR');
}

/* ---------- 심의승인번호 "YYMM-NN" ---------- */

const REVIEW_NO = /^(\d{2})(\d{2})-(\d{1,3})$/;

/**
 * 심의승인번호 정규화 (엑셀에서 날짜로 바뀐 값 복원 포함)
 * "2103-10" 그대로 / "2103-10-01"·Date(2103-10-01) → "2103-10" / "1906-01-01" → "1906-01"
 */
export function normalizeReviewNo(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  if (input instanceof Date) {
    return `${pad(input.getUTCFullYear(), 4)}-${pad(input.getUTCMonth() + 1)}`;
  }
  const s = input.trim();
  if (REVIEW_NO.test(s)) return s;
  const asDate = /^(\d{4})-(\d{2})-01(?:T.*)?$/.exec(s);
  if (asDate) return `${asDate[1]}-${asDate[2]}`;
  return null;
}

/** 심의승인번호 앞 4자리(YYMM) → 심의 연월 "2021.03." */
export function reviewYmFromNo(no: string | null | undefined): string | null {
  const m = no ? REVIEW_NO.exec(no.trim()) : null;
  if (!m) return null;
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return `${2000 + Number(m[1])}.${m[2]}.`;
}

/** 심의 연월 "2021.03." / "2021.3" / "202103" → { y, m } */
export function parseYm(input: string | null | undefined): { y: number; m: number } | null {
  if (!input) return null;
  const s = input.trim().replace(/\.$/, '');
  const m = /^(\d{4})\s*[.\-/]?\s*(\d{1,2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return mo >= 1 && mo <= 12 ? { y, m: mo } : null;
}

/* ---------- 입력값에서 날짜 추출 (공문번호 등) ---------- */

export type ExtractedDate = { iso: string; fromDoc: boolean };

/**
 * 입력 문자열에서 날짜 추출
 * - 날짜만 입력 → fromDoc false
 * - "건강증진연구소-1204(2025.12.03.)" 처럼 공문번호 안 날짜 → fromDoc true
 */
export function extractDate(input: string | null | undefined): ExtractedDate | null {
  if (!input) return null;
  const s = input.trim();
  const whole = parseDate(s);
  if (whole) return { iso: whole, fromDoc: false };
  const re = /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})|(?<!\d)((?:19|20)\d{2})(\d{2})(\d{2})(?!\d)/g;
  for (const m of s.matchAll(re)) {
    const [y, mo, d] = m[1] ? [m[1], m[2], m[3]] : [m[4], m[5], m[6]];
    if (isValidYMD(Number(y), Number(mo), Number(d))) {
      return { iso: toISO(Number(y), Number(mo), Number(d)), fromDoc: true };
    }
  }
  return null;
}

/* ---------- O / X / 해당없음 ---------- */

export const OX_VALUES = ['O', 'X', '해당없음'] as const;

/** 미이행으로 보는 입력값 */
const NOT_DONE = new Set(['x', '진행중', '진행 중', '미실시', '미제출', '-']);
export function isNotDone(v: string | null | undefined): boolean {
  return !v || !v.trim() || NOT_DONE.has(v.trim().toLowerCase());
}
export function isNotApplicable(v: string | null | undefined): boolean {
  return !!v && v.replace(/\s/g, '') === '해당없음';
}

/* ---------- 빈 칸 안내 문구 ---------- */

export const PLACEHOLDER = {
  doc: '(작성 필요) 예: 건강증진연구소-110(2025.10.10.)',
  date: '(작성 필요) 예: 20251010',
  period: '(작성 필요) 예: 20250101-20251231',
  money: '(작성 필요) 예: 50000000',
  text: '(작성 필요)',
} as const;
