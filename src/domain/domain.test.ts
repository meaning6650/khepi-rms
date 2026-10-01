import { describe, expect, it } from 'vitest';
import {
  addMonths, ageOn, extractDate, formatDate, formatMoney, formatPeriod, normalizeReviewNo,
  parseBirth, parseDate, parseMoney, parsePeriod, reviewYmFromNo,
} from './fields';
import { compareExcelRegime, determineRegime, reviewApprovalDate } from './regimes';
import {
  COMMITTEE_EVAL_NOTE, REFERENCE_LABEL, checkEvaluation, committeeEvalNote, computeStages, referenceRecords, summarize, type StageResult,
} from './stages';
import { flowFor } from './flow';
import type { ProjectInput } from './types';

const TODAY = '2026-10-01';
const byKey = (stages: StageResult[], key: string) => stages.find((s) => s.key === key);

/* ================= 지시서 12장 2단계 필수 사례 ================= */

describe('필수 사례 1: B-2025-3 (종료 2025.11.06.)', () => {
  const p: ProjectInput = {
    id: 'B-2025-3', type: 'B', reviewName: '심의O',
    startDate: '2025-04-07', endDate: '2025-11-06',
    review: { no: '2503-04', ym: '2025.03.', result: '조건부 승인' },
  };
  const r = determineRegime(p);
  const stages = computeStages(p, r.regime, TODAY);

  it('R2025 판별, 판단 근거 연구종료일', () => {
    expect(r.regime).toBe('R2025');
    expect(r.basis).toBe('연구종료일 2025.11.06. / 2025.8.11. 이후 종료 과제 해당');
  });
  it('최종보고서 기한 2026.02.06.', () => expect(byKey(stages, 'finalReport')?.due).toBe('2026-02-06'));
  it('공표 기한 2026.05.06.', () => expect(byKey(stages, 'publication')?.due).toBe('2026-05-06'));
  it('점검표 기한 2026.06.30.', () => expect(byKey(stages, 'checklist')?.due).toBe('2026-06-30'));
});

describe('필수 사례 2: 심의 2022.11. 승인, 종료 2023.10.31.', () => {
  const p: ProjectInput = {
    type: 'B', reviewName: '심의O', startDate: '2022-12-01', endDate: '2023-10-31',
    review: { ym: '2022.11.' },
  };
  const r = determineRegime(p);
  it('R2022 판별 (심의 승인일 기준)', () => {
    expect(r.regime).toBe('R2022');
    expect(r.status === 'ok' && r.by).toBe('review');
  });
  it('최종보고서 기한 2023.11.30.', () => {
    expect(byKey(computeStages(p, r.regime, TODAY), 'finalReport')?.due).toBe('2023-11-30');
  });
});

describe('필수 사례 3: 연구시작 2021.05.25. 종료 2021.10.31.', () => {
  const p: ProjectInput = { type: 'A', reviewName: '심의O', startDate: '2021-05-25', endDate: '2021-10-31' };
  const r = determineRegime(p);
  const keys = computeStages(p, r.regime, TODAY).map((s) => s.key);
  it('R2020 판별', () => expect(r.regime).toBe('R2020'));
  it('종료보고·점검표 단계 없음', () => {
    expect(keys).not.toContain('finalBrief');
    expect(keys).not.toContain('checklist');
  });
  it('최종보고서 단계 없음, 공표 기한 없음', () => {
    expect(keys).not.toContain('finalReport');
    const pub = byKey(computeStages(p, r.regime, TODAY), 'publication');
    expect(pub?.due).toBeNull();
    expect(pub?.dueLabel).toBe('기한 없음');
  });
});

describe('필수 사례 4: 입력 변환', () => {
  it('2103-10 → 2021.03.', () => expect(reviewYmFromNo('2103-10')).toBe('2021.03.'));
  it('20211210 → 2021.12.10.', () => expect(formatDate(parseDate('20211210'))).toBe('2021.12.10.'));
  it('650506 → 1965.05.06.', () => expect(formatDate(parseBirth('650506', TODAY))).toBe('1965.05.06.'));
});

/* ================= 제23조 위원회 의뢰 평가 안내 (안 1) ================= */

describe('제23조 안내 문구: R2022·R2023 의 5·6단계에만 표시', () => {
  const base: ProjectInput = { type: 'A', reviewName: '심의O', endDate: '2024-10-31' };
  const NOTE_HEAD = '위원회 의뢰 평가 시 원문 기한 상이';
  const notesOf = (regime: 'R2019' | 'R2020' | 'R2022' | 'R2023' | 'R2025') =>
    computeStages(base, regime, TODAY).filter((s) => s.notes.some((n) => n.startsWith(NOTE_HEAD))).map((s) => s.key);

  it('R2022·R2023: 평가(5)·평가결과서(6) 두 단계에 표시', () => {
    expect(notesOf('R2022')).toEqual(['evaluation', 'evalDoc']);
    expect(notesOf('R2023')).toEqual(['evaluation', 'evalDoc']);
  });
  it('R2025·R2020·R2019: 표시 안 함', () => {
    expect(notesOf('R2025')).toEqual([]);
    expect(notesOf('R2020')).toEqual([]);
    expect(notesOf('R2019')).toEqual([]);
  });
  it('종료일 있으면 기준일 표시 (종료 −35·−21·−14일)', () => {
    const ev = computeStages(base, 'R2022', TODAY).find((x) => x.key === 'evaluation');
    expect(ev?.notes).toEqual(['위원회 의뢰 평가 시 원문 기한 상이 / 계획 통보 2024.09.26.(종료 5주 전) / 의뢰 2024.10.10.(3주 전) / 교부 2024.10.17.(2주 전)']);
  });
  it('종료일 없으면 기존 문구만', () => {
    expect(committeeEvalNote(null)).toBe('위원회 의뢰 평가 시 원문 기한 상이 / 계획 통보 종료 5주 전, 의뢰 3주 전, 결과서 교부 2주 전');
    const ev = computeStages({ type: 'A' }, 'R2023', TODAY).find((x) => x.key === 'evalDoc');
    expect(ev?.notes).toEqual([COMMITTEE_EVAL_NOTE]);
  });
  it('기한 산정에는 영향 없음 (R2022 평가 기한 = 종료일, 평가결과서 = 종료+1개월)', () => {
    const s = computeStages(base, 'R2022', TODAY);
    expect(byKey(s, 'evaluation')?.due).toBe('2024-10-31');
    expect(byKey(s, 'evalDoc')?.due).toBe('2024-11-30');
  });
});

/* ================= R2019·R2020 착수·중간보고 ================= */

describe('R2019·R2020 단계 수 (착수·중간보고 제외)', () => {
  const keysOf = (p: ProjectInput, r: 'R2019' | 'R2020') => computeStages(p, r, TODAY).map((s) => s.key);
  it.each(['R2019', 'R2020'] as const)('%s 내부연구: 심의·평가·평가결과서·공표 4단계', (r) => {
    expect(keysOf({ type: 'A', endDate: '2021-10-31' }, r)).toEqual(['review', 'evaluation', 'evalDoc', 'publication']);
  });
  it.each(['R2019', 'R2020'] as const)('%s 위탁연구: 연구용역계약 포함 5단계', (r) => {
    expect(keysOf({ type: 'B', endDate: '2021-10-31' }, r)).toHaveLength(5);
  });
  it('R2022 이후는 착수·중간보고 포함 (내부 9단계, 위탁 10단계)', () => {
    expect(computeStages({ type: 'A', endDate: '2023-10-31' }, 'R2022', TODAY)).toHaveLength(9);
    expect(computeStages({ type: 'B', endDate: '2026-10-31' }, 'R2025', TODAY)).toHaveLength(10);
  });
  it('입력값이 있으면 참고 기록으로 표시 (상태·배지 없음)', () => {
    const p: ProjectInput = { type: 'A', endDate: '2021-10-31', reports: { kickoff: '연구통계팀-88(2021.06.10.)', interim: '' } };
    expect(referenceRecords(p, 'R2020')).toEqual([
      { key: 'kickoff', name: '착수보고', value: '연구통계팀-88(2021.06.10.)', label: REFERENCE_LABEL },
    ]);
    expect(REFERENCE_LABEL).toBe('참고 기록 / 해당 규정 없음');
  });
  it('입력값 없거나 R2022 이후면 참고 기록 없음', () => {
    expect(referenceRecords({ type: 'A' }, 'R2019')).toEqual([]);
    expect(referenceRecords({ type: 'A', reports: { kickoff: '2023.01.10.' } }, 'R2022')).toEqual([]);
  });
});

/* ================= 적용 규정 판별 ================= */

describe('determineRegime', () => {
  it('수동 지정 우선', () => {
    expect(determineRegime({ type: 'B', endDate: '2025-12-31', regimeOverride: 'R2022' }).regime).toBe('R2022');
  });
  it('수탁(C) 판별 제외', () => {
    const r = determineRegime({ type: 'C', endDate: '2026-12-15' });
    expect(r.status).toBe('excluded');
    expect(r.basis).toContain('제27조');
  });
  it('종료일 2025.8.11. 당일 → R2025, 전날 → 심의·시작일 기준', () => {
    expect(determineRegime({ type: 'A', endDate: '2025-08-11', startDate: '2025-01-02' }).regime).toBe('R2025');
    expect(determineRegime({ type: 'A', endDate: '2025-08-10', startDate: '2025-01-02' }).regime).toBe('R2023');
  });
  it('심의 승인 2023.06. → R2023 (시작일보다 우선)', () => {
    expect(determineRegime({ type: 'A', reviewName: '심의O', review: { ym: '2023.06.' }, startDate: '2022-01-01', endDate: '2023-12-31' }).regime).toBe('R2023');
  });
  it('심의승인번호만 있을 때 YYMM 사용: 2211-02 → R2022', () => {
    expect(determineRegime({ type: 'B', reviewName: '심의O', review: { no: '2211-02' }, endDate: '2023-06-30' }).regime).toBe('R2022');
  });
  it('심의X 이면 심의 승인일 무시 → 시작일 기준', () => {
    const p: ProjectInput = { type: 'A', reviewName: '심의X', review: { ym: '2023.06.' }, startDate: '2021-03-02', endDate: '2023-12-31' };
    const r = determineRegime(p);
    expect(r.regime).toBe('R2020');
    expect(r.basis).toBe('연구시작일 2021.03.02. / 2020.8.12. 이후 시작 과제 해당');
  });
  it('심의 승인 2021.03. (구간 이전) → 시작일 기준 R2020', () => {
    expect(determineRegime({ type: 'A', review: { no: '2103-10' }, startDate: '2021-05-25', endDate: '2021-10-31' }).regime).toBe('R2020');
  });
  it('시작일 2020.8.12. 이전 → R2019', () => {
    expect(determineRegime({ type: 'A', startDate: '2020-03-02', endDate: '2020-11-30' }).regime).toBe('R2019');
  });
  it('시작일 없으면 심의 승인일로 대체', () => {
    const r = determineRegime({ type: 'A', review: { ym: '2021.03.' }, endDate: '2021-12-31' });
    expect(r.regime).toBe('R2020');
    expect(r.basis).toContain('연구시작일 미입력');
  });
  it('연구기간·심의 모두 없음 → 판별 불가', () => {
    const r = determineRegime({ type: 'A' });
    expect(r.status).toBe('unknown');
    expect(r.basis).toBe('연구기간 미입력 / 적용 규정 판별 불가');
  });
  it('심의 승인일: 개최 목록과 같은 연월이면 개최일 사용', () => {
    expect(reviewApprovalDate({ ym: '2022.11.' }, ['2022-10-20', '2022-11-17', '2022-11-03'])?.iso).toBe('2022-11-03');
    expect(reviewApprovalDate({ ym: '2022.11.' }, [])?.iso).toBe('2022-11-01');
  });
});

describe('compareExcelRegime', () => {
  it('A-2026-2: 엑셀 2022년도 vs R2025 → 확인 필요', () => {
    expect(compareExcelRegime('R2025', '2022년도 규정')).toEqual({ level: 'warn', text: '엑셀 표기 2022년도 규정 / 판단 기준 상이, 확인 필요' });
  });
  it('R2023 vs 엑셀 2022년도 → 라벨만 상이', () => {
    expect(compareExcelRegime('R2023', '2022년도 규정')?.text).toBe('엑셀 표기 2022년도 규정 / 기한 산정 동일, 라벨만 상이');
  });
  it('같으면 null', () => expect(compareExcelRegime('R2022', '2022년도 규정')).toBeNull());
});

/* ================= 기한·상태 ================= */

describe('computeStages 상태 판정 (B-2025-3 더미 입력, 기준일 2026.10.01.)', () => {
  const p: ProjectInput = {
    type: 'B', reviewName: '심의O', startDate: '2025-04-07', endDate: '2025-11-06',
    review: { result: '조건부 승인' },
    contract: { notice: 'O' },
    reports: { kickoff: '건강증진연구소-512(2025.04.30.)', final: '2025.11.04.' },
    evaluation: { evalDate: '2025.10.28.', submittedAt: '건강증진연구소-1204(2025.12.03.)' },
    finalReport: { submittedAt: '20260220' },
    publication: { homepageRegisteredAt: '2026.04.28.' },
  };
  const s = computeStages(p, 'R2025', TODAY);

  it('심의: 결과값 그대로', () => expect(byKey(s, 'review')?.status).toBe('조건부 승인'));
  it('계약 O → 완료(날짜 미기재)', () => expect(byKey(s, 'contract')?.status).toBe('완료(날짜 미기재)'));
  it('중간보고 미입력(권고) → 선택', () => expect(byKey(s, 'interim')?.status).toBe('선택'));
  it('평가 종료 전 → 기한 내 완료', () => expect(byKey(s, 'evaluation')?.status).toBe('기한 내 완료'));
  it('평가결과서 공문 날짜 → 기한 내 완료 (공문일 기준)', () => expect(byKey(s, 'evalDoc')?.status).toBe('기한 내 완료 (공문일 기준)'));
  it('최종보고서 2026.02.20. → 지연 14일', () => {
    expect(byKey(s, 'finalReport')?.status).toBe('지연 14일');
    expect(byKey(s, 'finalReport')?.tone).toBe('late');
  });
  it('점검표 미입력 → 기한 경과 93일', () => {
    expect(byKey(s, 'checklist')?.status).toBe('기한 경과 93일');
    expect(byKey(s, 'checklist')?.tone).toBe('over');
  });
  it('관련 조항·서식은 R2025 번호', () => {
    expect(byKey(s, 'evaluation')?.forms).toBe('서식11호');
    expect(computeStages(p, 'R2022', TODAY).find((x) => x.key === 'evaluation')?.forms).toBe('서식8호');
  });
  it('요약: 다음 조치 = 점검, 기한 경과 보유', () => {
    const sum = summarize(s, p.endDate, TODAY);
    expect(sum.next?.key).toBe('checklist');
    expect(sum.overdue).toBe(true);
    expect(sum.lateDone).toBe(1);
    expect(sum.inProgress).toBe(true);
  });
});

describe('computeStages 기타', () => {
  it('최종보고서 연기 신청(O) → E+6개월', () => {
    const s = computeStages({ type: 'A', endDate: '2025-11-06', finalReport: { delayRequested: 'O' } }, 'R2025', TODAY);
    expect(byKey(s, 'finalReport')?.due).toBe('2026-05-06');
  });
  it('R2019·R2020 평가 기한 E+1개월', () => {
    expect(byKey(computeStages({ type: 'A', endDate: '2021-10-31' }, 'R2020', TODAY), 'evaluation')?.due).toBe('2021-11-30');
  });
  it('D-N: 30일 이내 soon, 그 외 pending', () => {
    const s = computeStages({ type: 'A', endDate: '2026-10-20' }, 'R2025', TODAY);
    expect(byKey(s, 'finalBrief')?.status).toBe('D-19');
    expect(byKey(s, 'finalBrief')?.tone).toBe('soon');
    expect(byKey(s, 'evalDoc')?.tone).toBe('pending');
  });
  it('해당없음 입력', () => {
    expect(byKey(computeStages({ type: 'A', endDate: '2025-11-06', checklist: '해당없음' }, 'R2025', TODAY), 'checklist')?.status).toBe('해당없음');
  });
  it('X 입력은 미이행', () => {
    expect(byKey(computeStages({ type: 'A', endDate: '2025-11-06', finalReport: { status: 'X' } }, 'R2025', TODAY), 'finalReport')?.tone).toBe('over');
  });
  it('반려는 빨강', () => {
    expect(byKey(computeStages({ type: 'A', review: { result: '반려' } }, 'R2025', TODAY), 'review')?.tone).toBe('over');
  });
  it('위탁만 연구용역계약 단계', () => {
    expect(computeStages({ type: 'A', endDate: '2025-11-06' }, 'R2025', TODAY).map((s) => s.key)).not.toContain('contract');
    expect(computeStages({ type: 'B', endDate: '2025-11-06' }, 'R2025', TODAY).map((s) => s.key)).toContain('contract');
  });
  it('연구종료일 없음 → 기한 규정 있는 단계 "연구종료일 미입력"', () => {
    const s = computeStages({ type: 'A' }, 'R2025', TODAY);
    expect(byKey(s, 'finalReport')?.dueLabel).toBe('연구종료일 미입력');
    expect(byKey(s, 'kickoff')?.dueLabel).toBe('-');
  });
  it('수탁(regime null) → 단계 없음', () => expect(computeStages({ type: 'C' }, null, TODAY)).toEqual([]));
});

describe('checkEvaluation', () => {
  it('R2022 이후 평가위원 2명 → 1명 부족', () => {
    const c = checkEvaluation({ type: 'A', evaluation: { evaluators: [{ score: 80 }, { score: 70 }] } }, 'R2022');
    expect(c.warnings).toEqual(['평가위원 2명 / 3인 이상 필요 (1명 부족)']);
    expect(c.average).toBe(75);
  });
  it('R2025 평균 60점 미만 → 부적격', () => {
    const c = checkEvaluation({ type: 'A', evaluation: { evaluators: [{ score: 55 }, { score: 60 }, { score: 58 }] } }, 'R2025');
    expect(c.average).toBe(57.7);
    expect(c.warnings).toEqual(['부적격, 보완 후 재평가 대상(제23조 제4항)']);
  });
  it('R2022 평균 60점 미만은 경고 없음 (R2025 규정)', () => {
    expect(checkEvaluation({ type: 'A', evaluation: { evaluators: [{ score: 50 }, { score: 50 }, { score: 50 }] } }, 'R2022').warnings).toEqual([]);
  });
  it('R2020 평가위원 규정 없음', () => {
    expect(checkEvaluation({ type: 'A', evaluation: { evaluators: [{ score: 80 }] } }, 'R2020').warnings).toEqual([]);
  });
});

/* ================= 입력 규칙 ================= */

describe('fields 날짜', () => {
  it.each([
    ['20211210', '2021-12-10'], ['2021.12.10', '2021-12-10'], ['2021.12.10.', '2021-12-10'],
    ['21.12.10', '2021-12-10'], ['2021-12-10', '2021-12-10'], ['2021. 12. 10.', '2021-12-10'], ['2021/1/5', '2021-01-05'],
  ])('%s → %s', (input, iso) => expect(parseDate(input)).toBe(iso));
  it.each(['20210230', '2021.13.01', '건강증진연구소-110', '', '2021'])('해석 불가: "%s"', (input) => expect(parseDate(input)).toBeNull());
  it('EDATE 말일 보정', () => {
    expect(addMonths('2025-08-31', 1)).toBe('2025-09-30');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2025-11-06', 3)).toBe('2026-02-06');
  });
});

describe('fields 기간', () => {
  it.each([
    ['20250101-20251231', '2025.01.01.~2025.12.31.'],
    ['2025.1.1~2025.12.31', '2025.01.01.~2025.12.31.'],
    ['2025.01.01.~2025.12.31.', '2025.01.01.~2025.12.31.'],
    ['2025.1.1-2025.12.31', '2025.01.01.~2025.12.31.'],
  ])('%s → %s', (input, out) => expect(formatPeriod(parsePeriod(input))).toBe(out));
  it('종료일이 시작일보다 앞이면 null', () => expect(parsePeriod('20251231-20250101')).toBeNull());
});

describe('fields 출생년월·금액·심의승인번호·날짜 추출', () => {
  it('연령 산정 (기준일 2026.10.01.)', () => {
    expect(ageOn('1965-05-06', TODAY)).toBe(61);
    expect(ageOn('1965-10-02', TODAY)).toBe(60);
  });
  it('금액: 숫자만 저장, 표시만 쉼표', () => {
    expect(parseMoney('48,000,000원')).toBe(48000000);
    expect(formatMoney(48000000)).toBe('48,000,000');
  });
  it('엑셀 날짜로 바뀐 심의승인번호 복원', () => {
    expect(normalizeReviewNo('2103-10-01')).toBe('2103-10');
    expect(normalizeReviewNo('1906-01-01')).toBe('1906-01');
    expect(normalizeReviewNo(new Date(Date.UTC(2103, 9, 1)))).toBe('2103-10');
    expect(normalizeReviewNo('2503-04')).toBe('2503-04');
  });
  it('공문번호 안 날짜 추출', () => {
    expect(extractDate('건강증진연구소-1204(2025.12.03.)')).toEqual({ iso: '2025-12-03', fromDoc: true });
    expect(extractDate('2025.11.04.')).toEqual({ iso: '2025-11-04', fromDoc: false });
    expect(extractDate('건강증진연구소-1204')).toBeNull();
  });
});

describe('flow 구간별 안내', () => {
  it('R2020 에는 종료보고·최종보고서·점검 단계 없음', () => {
    const ids = flowFor('R2020').flatMap((g) => g.steps.map((s) => s.id));
    expect(ids).not.toContain('finalBrief');
    expect(ids).not.toContain('finalReport');
    expect(ids).not.toContain('checklist');
  });
  it('R2025 평가 서식11호, R2022 서식8호', () => {
    const find = (r: 'R2025' | 'R2022') => flowFor(r).flatMap((g) => g.steps).find((s) => s.id === 'evaluation');
    expect(find('R2025')?.forms).toBe('서식11호');
    expect(find('R2022')?.forms).toBe('서식8호');
  });
});
