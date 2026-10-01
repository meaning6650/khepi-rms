/**
 * 단계별 기한·이행 상태 (지시서 6장)
 * E = 연구종료일. 월 단위 더하기는 말일 보정(EDATE 방식)
 */
import { addDays, addMonths, diffDays, extractDate, formatDate, isNotApplicable, isNotDone } from './fields';
import { STAGE_REFS, type RegimeKey, type StageKey } from './regimes';
import type { ProjectInput } from './types';

export type StageKind = '필수' | '권고' | '해당 시';

export type StageTone =
  | 'done'     // 완료·기한 내 완료
  | 'late'     // 지연 완료
  | 'over'     // 기한 경과·반려
  | 'soon'     // 30일 이내
  | 'pending'  // 기한 남음
  | 'missing'  // 필수 미입력(기한 없음)
  | 'optional' // 권고·해당 시 미입력
  | 'na';      // 해당없음

export type StageResult = {
  key: StageKey;
  no: number;
  name: string;
  kind: StageKind;
  article: string;
  forms: string;
  due: string | null;       // ISO
  dueLabel: string;         // "2026.02.06." / "-" / "기한 없음"
  value: string;            // 입력값 원문
  status: string;           // 화면 표시 상태
  tone: StageTone;
  completed: boolean;       // 이행 완료(기한 내·지연·해당없음 포함)
  notes: string[];          // 단계별 안내 문구
};

/** R2022·R2023 제23조 위원회 의뢰 평가 안내 (안 1: 기한 산정·상태 판정 제외, 문구만 표시) */
export const COMMITTEE_EVAL_NOTE =
  '위원회 의뢰 평가 시 원문 기한 상이 / 계획 통보 종료 5주 전, 의뢰 3주 전, 결과서 교부 2주 전';

/**
 * 안내 문구에 기준일 표시 ("최소 5주 전" = 연구종료일 −35일)
 * 종료일 없으면 기준일 없는 기존 문구
 */
export function committeeEvalNote(endDate: string | null | undefined): string {
  if (!endDate) return COMMITTEE_EVAL_NOTE;
  const d = (n: number) => formatDate(addDays(endDate, -n));
  return `위원회 의뢰 평가 시 원문 기한 상이 / 계획 통보 ${d(35)}(종료 5주 전) / 의뢰 ${d(21)}(3주 전) / 교부 ${d(14)}(2주 전)`;
}

const OLD: RegimeKey[] = ['R2019', 'R2020'];

type StageDef = {
  key: StageKey;
  no: number;
  name: string;
  kind: StageKind;
  /** 해당 구간에 단계가 없으면 false */
  exists: (r: RegimeKey, p: ProjectInput) => boolean;
  /** 기한 산정 (null = 기한 규정 없음) */
  due: (r: RegimeKey, end: string, p: ProjectInput) => string | null;
  noDueLabel: string;
  value: (p: ProjectInput) => string;
};

const STAGES: StageDef[] = [
  {
    key: 'review', no: 1, name: '연구과제 심의', kind: '필수',
    exists: () => true, due: () => null, noDueLabel: '-',
    value: (p) => p.review?.result ?? '',
  },
  {
    key: 'contract', no: 2, name: '연구용역계약', kind: '해당 시',
    exists: (_r, p) => p.type === 'B', due: () => null, noDueLabel: '-',
    value: (p) => p.contract?.notice ?? '',
  },
  {
    key: 'kickoff', no: 3, name: '착수보고', kind: '권고',
    exists: (r) => !OLD.includes(r), // R2019·R2020 해당 규정 없음 → 참고 기록으로만 표시
    due: () => null, noDueLabel: '-',
    value: (p) => p.reports?.kickoff ?? '',
  },
  {
    key: 'interim', no: 4, name: '중간보고', kind: '권고',
    exists: (r) => !OLD.includes(r),
    due: () => null, noDueLabel: '-',
    value: (p) => p.reports?.interim ?? '',
  },
  {
    key: 'evaluation', no: 5, name: '연구과제 평가', kind: '필수',
    exists: () => true,
    due: (r, e) => (OLD.includes(r) ? addMonths(e, 1) : e),
    noDueLabel: '-',
    value: (p) => p.evaluation?.evalDate || p.evaluation?.submittedAt || '',
  },
  {
    key: 'evalDoc', no: 6, name: '평가결과서 제출', kind: '필수',
    exists: () => true,
    due: (_r, e) => addMonths(e, 1),
    noDueLabel: '-',
    value: (p) => p.evaluation?.submittedAt || p.evaluation?.resultDoc || '',
  },
  {
    key: 'finalBrief', no: 7, name: '종료보고', kind: '필수',
    exists: (r) => !OLD.includes(r),
    due: (_r, e) => e,
    noDueLabel: '-',
    value: (p) => p.reports?.final ?? '',
  },
  {
    key: 'finalReport', no: 8, name: '최종보고서 제출', kind: '필수',
    exists: (r) => !OLD.includes(r),
    due: (r, e, p) => (r === 'R2025' ? addMonths(e, p.finalReport?.delayRequested?.trim().toUpperCase() === 'O' ? 6 : 3) : addMonths(e, 1)),
    noDueLabel: '-',
    value: (p) => p.finalReport?.submittedAt || p.finalReport?.docNo || p.finalReport?.status || '',
  },
  {
    key: 'publication', no: 9, name: '연구과제 결과 공표', kind: '필수',
    exists: () => true,
    due: (r, e) => (OLD.includes(r) ? null : addMonths(e, 6)),
    noDueLabel: '기한 없음',
    value: (p) => p.publication?.homepageRegisteredAt ?? '',
  },
  {
    key: 'checklist', no: 10, name: '연구 추진과정 점검', kind: '필수',
    exists: (r) => !OLD.includes(r),
    due: (_r, e) => `${Number(e.slice(0, 4)) + 1}-06-30`,
    noDueLabel: '-',
    value: (p) => p.checklist ?? '',
  },
];

/** 상태 판정 */
function judge(kind: StageKind, value: string, due: string | null, today: string):
  Pick<StageResult, 'status' | 'tone' | 'completed'> {
  if (isNotApplicable(value)) return { status: '해당없음', tone: 'na', completed: true };

  if (isNotDone(value)) {
    if (!due) {
      return kind === '필수'
        ? { status: '미입력', tone: 'missing', completed: false }
        : { status: '선택', tone: 'optional', completed: false };
    }
    const left = diffDays(today, due);
    if (left < 0) return { status: `기한 경과 ${-left}일`, tone: 'over', completed: false };
    return { status: `D-${left}`, tone: left <= 30 ? 'soon' : 'pending', completed: false };
  }

  const found = extractDate(value);
  if (!found) return { status: '완료(날짜 미기재)', tone: 'done', completed: true };
  const suffix = found.fromDoc ? ' (공문일 기준)' : '';
  if (!due) return { status: `완료${suffix}`, tone: 'done', completed: true };
  const late = diffDays(due, found.iso);
  return late <= 0
    ? { status: `기한 내 완료${suffix}`, tone: 'done', completed: true }
    : { status: `지연 ${late}일${suffix}`, tone: 'late', completed: true };
}

/** 심의 단계: 결과값 그대로, 반려는 빨강 */
function judgeReview(p: ProjectInput, value: string): Pick<StageResult, 'status' | 'tone' | 'completed'> {
  const v = value.trim();
  if (!v) {
    if (p.reviewName && /^심의\s*x$/i.test(p.reviewName.trim())) return { status: '해당없음', tone: 'na', completed: true };
    return { status: '미입력', tone: 'missing', completed: false };
  }
  if (isNotApplicable(v)) return { status: '해당없음', tone: 'na', completed: true };
  if (v.includes('반려')) return { status: v, tone: 'over', completed: true };
  if (v.includes('재심의')) return { status: v, tone: 'late', completed: false };
  return { status: v, tone: 'done', completed: true };
}

/**
 * 단계별 기한·이행 상태 산정
 * regime null(수탁·판별 불가) → 빈 배열
 */
export function computeStages(p: ProjectInput, regime: RegimeKey | null, today: string): StageResult[] {
  if (!regime) return [];
  const refs = STAGE_REFS[regime];
  return STAGES.filter((s) => s.exists(regime, p)).map((s) => {
    const due = p.endDate ? s.due(regime, p.endDate, p) : null;
    const value = s.value(p);
    const judged = s.key === 'review' ? judgeReview(p, value) : judge(s.kind, value, due, today);
    const ref = refs[s.key];
    const notes: string[] = [];
    if ((regime === 'R2022' || regime === 'R2023') && (s.key === 'evaluation' || s.key === 'evalDoc')) {
      notes.push(committeeEvalNote(p.endDate));
    }
    // 연구종료일이 없을 때: 기한 규정이 있는 단계는 '연구종료일 미입력' 표시
    const hasDueRule = s.due(regime, '2000-01-31', p) !== null;
    return {
      key: s.key,
      no: s.no,
      name: s.name,
      kind: s.kind,
      article: ref?.article ?? '규정 없음',
      forms: ref?.forms ?? '-',
      due,
      dueLabel: due ? formatDate(due) : hasDueRule ? '연구종료일 미입력' : s.noDueLabel,
      value,
      notes,
      ...judged,
    };
  });
}

/* ---------- 참고 기록 (해당 규정 없는 단계의 입력값) ---------- */

export type ReferenceRecord = { key: StageKey; name: string; value: string; label: string };

export const REFERENCE_LABEL = '참고 기록 / 해당 규정 없음';

/**
 * R2019·R2020 과제의 착수·중간보고 입력값
 * 단계 목록에서는 제외, 입력값이 있을 때만 목록 하단에 표시 (상태 판정·배지 없음)
 */
export function referenceRecords(p: ProjectInput, regime: RegimeKey | null): ReferenceRecord[] {
  if (!regime || !OLD.includes(regime)) return [];
  const items: [StageKey, string, string | undefined][] = [
    ['kickoff', '착수보고', p.reports?.kickoff],
    ['interim', '중간보고', p.reports?.interim],
  ];
  return items
    .filter(([, , v]) => !!v && !!v.trim())
    .map(([key, name, v]) => ({ key, name, value: v!.trim(), label: REFERENCE_LABEL }));
}

/* ---------- 평가 검증 ---------- */

export type EvaluationCheck = { count: number; average: number | null; warnings: string[] };

export function checkEvaluation(p: ProjectInput, regime: RegimeKey | null): EvaluationCheck {
  const scores = (p.evaluation?.evaluators ?? [])
    .map((e) => e.score)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const count = (p.evaluation?.evaluators ?? []).filter((e) => e.name?.trim() || typeof e.score === 'number').length;
  const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const warnings: string[] = [];
  if (!regime || OLD.includes(regime)) return { count, average, warnings };
  if (count > 0 && count < 3) warnings.push(`평가위원 ${count}명 / 3인 이상 필요 (${3 - count}명 부족)`);
  if (regime === 'R2025' && average !== null && average < 60) warnings.push('부적격, 보완 후 재평가 대상(제23조 제4항)');
  return { count, average, warnings };
}

/* ---------- 진행현황 요약 ---------- */

export type ProgressSummary = {
  done: number;          // 기한 내·날짜 미기재 완료 + 해당없음
  lateDone: number;      // 지연 완료
  attention: number;     // 기한 경과 + 필수 미입력
  next: StageResult | null;   // 다음 미완료 단계 (기한 오름차순, 기한 없는 필수는 뒤)
  inProgress: boolean;   // 종료일 없음 또는 종료 후 365일 이내 + 미완료 단계 보유
  within30: boolean;     // 다음 미완료 단계 기한 30일 이내
  overdue: boolean;      // 기한 경과 단계 보유
};

export function summarize(stages: StageResult[], endDate: string | null | undefined, today: string): ProgressSummary {
  const open = stages.filter((s) => !s.completed && s.tone !== 'optional');
  const next = [...open].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))[0] ?? null;
  const recent = !endDate || diffDays(endDate, today) <= 365;
  return {
    done: stages.filter((s) => s.tone === 'done' || s.tone === 'na').length,
    lateDone: stages.filter((s) => s.tone === 'late' && s.completed).length,
    attention: stages.filter((s) => s.tone === 'over' || s.tone === 'missing').length,
    next,
    inProgress: recent && open.length > 0,
    within30: !!next?.due && diffDays(today, next.due) >= 0 && diffDays(today, next.due) <= 30,
    overdue: stages.some((s) => s.tone === 'over'),
  };
}
