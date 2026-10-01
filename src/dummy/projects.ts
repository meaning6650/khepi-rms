/** 1단계 정적 화면용 더미 데이터 (실제 과제·인물 아님) */
import type { RegimeKey } from '../domain/regimes';

export type ProjectType = 'A' | 'B' | 'C';
export const TYPE_LABEL: Record<ProjectType, string> = { A: '내부연구', B: '위탁연구', C: '수탁연구' };
export const TYPE_SHORT: Record<ProjectType, string> = { A: '내부', B: '위탁', C: '수탁' };

export type DummyProject = {
  id: string;
  type: ProjectType;
  title: string;
  reviewName: string;
  dept: string;
  org: string;
  pi: string;
  period: string;
  endDate: string;
  budget: number;
  regime: RegimeKey | null;
  regimeBasis: string;
  excelRegime?: string;
  reviewNo?: string;
  reviewYm?: string;
  reviewResult?: string;
  nextStep?: string;
  nextDue?: string;
  nextStatus?: string;
  nextTone?: 'over' | 'late' | 'neutral' | 'done';
};

export const PROJECTS: DummyProject[] = [
  {
    id: 'B-2025-3', type: 'B', title: '지역사회 통합건강증진사업 성과지표 개선 방안 연구', reviewName: '심의O',
    dept: '건강증진연구소', org: '가나대학교 산학협력단', pi: '김하늘', period: '2025.04.07.~2025.11.06.', endDate: '2025.11.06.',
    budget: 48000000, regime: 'R2025', regimeBasis: '연구종료일 2025.11.06. / 2025.8.11. 이후 종료 과제 해당',
    reviewNo: '2503-04', reviewYm: '2025.03.', reviewResult: '조건부 승인',
    nextStep: '연구 추진과정 점검', nextDue: '2026.06.30.', nextStatus: '기한 경과 92일', nextTone: 'over',
  },
  {
    id: 'A-2026-2', type: 'A', title: '청소년 신체활동 실태 기초조사', reviewName: '심의O',
    dept: '건강증진정책실', org: '한국건강증진개발원', pi: '이바다', period: '2026.03.02.~2026.12.31.', endDate: '2026.12.31.',
    budget: 15000000, regime: 'R2025', regimeBasis: '연구종료일 2026.12.31. / 2025.8.11. 이후 종료 과제 해당',
    excelRegime: '2022년도 규정', reviewNo: '2602-01', reviewYm: '2026.02.', reviewResult: '승인',
    nextStep: '연구과제 평가', nextDue: '2026.12.31.', nextStatus: 'D-92', nextTone: 'neutral',
  },
  {
    id: 'B-2026-1', type: 'B', title: '건강도시 평가체계 고도화를 위한 연구', reviewName: '심의O',
    dept: '지역건강증진실', org: '다라연구소', pi: '박소나무', period: '2026.05.01.~2026.10.20.', endDate: '2026.10.20.',
    budget: 60000000, regime: 'R2025', regimeBasis: '연구종료일 2026.10.20. / 2025.8.11. 이후 종료 과제 해당',
    reviewNo: '2604-02', reviewYm: '2026.04.', reviewResult: '승인',
    nextStep: '종료보고', nextDue: '2026.10.20.', nextStatus: 'D-20', nextTone: 'late',
  },
  {
    id: 'A-2026-1', type: 'A', title: '국민건강증진종합계획 중점과제 모니터링 지표 분석', reviewName: '심의O',
    dept: '건강증진연구소', org: '한국건강증진개발원', pi: '최여름', period: '2026.02.02.~2026.11.30.', endDate: '2026.11.30.',
    budget: 20000000, regime: 'R2025', regimeBasis: '연구종료일 2026.11.30. / 2025.8.11. 이후 종료 과제 해당',
    reviewNo: '2601-03', reviewYm: '2026.01.', reviewResult: '승인',
    nextStep: '연구과제 평가', nextDue: '2026.11.30.', nextStatus: 'D-61', nextTone: 'neutral',
  },
  {
    id: 'C-2026-1', type: 'C', title: '금연지원서비스 효과성 분석 (수탁)', reviewName: '심의X',
    dept: '금연사업실', org: '한국건강증진개발원', pi: '정가을', period: '2026.01.15.~2026.12.15.', endDate: '2026.12.15.',
    budget: 90000000, regime: null, regimeBasis: '수탁연구 / 발주처 계약조건 적용 (제27조)',
  },
  {
    id: 'B-2022-5', type: 'B', title: '비만 예방 환경 조성 정책 개발', reviewName: '심의O',
    dept: '건강증진정책실', org: '마바대학교', pi: '한겨울', period: '2022.12.01.~2023.10.31.', endDate: '2023.10.31.',
    budget: 35000000, regime: 'R2022', regimeBasis: '심의 승인 2022.11. / 2022.7.15. 이후 심의 승인 과제 해당',
    reviewNo: '2211-02', reviewYm: '2022.11.', reviewResult: '승인',
    nextStep: '-', nextStatus: '전 단계 완료', nextTone: 'done',
  },
  {
    id: 'A-2021-2', type: 'A', title: '건강생활실천 인식도 조사', reviewName: '심의O',
    dept: '건강증진연구소', org: '한국건강증진개발원', pi: '윤봄', period: '2021.05.25.~2021.10.31.', endDate: '2021.10.31.',
    budget: 8000000, regime: 'R2020', regimeBasis: '연구시작일 2021.05.25. / 2020.8.12. 이후 시작 과제 해당',
    reviewNo: '2103-10', reviewYm: '2021.03.', reviewResult: '승인',
    nextStep: '-', nextStatus: '전 단계 완료', nextTone: 'done',
  },
];

/* 진행 프로세스 탭 (B-2025-3, 오늘 2026.09.30. 기준) — 2단계에서 stages.ts 계산으로 대체 */
export type DummyStage = {
  no: number; name: string; kind: '필수' | '권고' | '해당 시'; article: string;
  content: string; forms: string; value: string; due: string;
  status: string; tone: 'done' | 'late' | 'over' | 'neutral' | 'review';
};

export const STAGES_B20253: DummyStage[] = [
  { no: 1, name: '연구과제 심의', kind: '필수', article: '제14·15조', content: '연구심의위원회 심의 결과', forms: '서식3·4호', value: '조건부 승인 (2503-04)', due: '-', status: '조건부 승인', tone: 'review' },
  { no: 2, name: '연구용역계약', kind: '해당 시', article: '제16조', content: '위탁연구 계약 체결·통보', forms: '-', value: 'O', due: '-', status: '완료', tone: 'done' },
  { no: 3, name: '착수보고', kind: '권고', article: '제21조', content: '목적·방법·일정 공유', forms: '서식7호', value: '건강증진연구소-512(2025.04.30.)', due: '-', status: '완료', tone: 'done' },
  { no: 4, name: '중간보고', kind: '권고', article: '제21조', content: '진행 상황·중간 성과 공유', forms: '서식7호', value: '', due: '-', status: '선택', tone: 'neutral' },
  { no: 5, name: '연구과제 평가', kind: '필수', article: '제23조', content: '종료 전 평가 / 3인 이상', forms: '서식11호', value: '2025.10.28.', due: '2025.11.06.', status: '기한 내 완료', tone: 'done' },
  { no: 6, name: '평가결과서 제출', kind: '필수', article: '제23조', content: '종료 후 1개월 이내 제출', forms: '서식11호', value: '건강증진연구소-1204(2025.12.03.)', due: '2025.12.06.', status: '기한 내 완료 (공문일 기준)', tone: 'done' },
  { no: 7, name: '종료보고', kind: '필수', article: '제24조', content: '연구종료일 이전 실시', forms: '서식7호', value: '2025.11.04.', due: '2025.11.06.', status: '기한 내 완료', tone: 'done' },
  { no: 8, name: '최종보고서 제출', kind: '필수', article: '제25조', content: '종료 후 3개월 이내', forms: '별지1호, 서식12·18호', value: '2026.02.20.', due: '2026.02.06.', status: '지연 14일', tone: 'late' },
  { no: 9, name: '연구과제 결과 공표', kind: '필수', article: '제26조', content: '종료 후 6개월 이내 홈페이지 게시', forms: '서식12·13·14·15호', value: '2026.04.28.', due: '2026.05.06.', status: '기한 내 완료', tone: 'done' },
  { no: 10, name: '연구 추진과정 점검', kind: '필수', article: '제29조', content: '점검표 차년도 6월까지 통보', forms: '서식16호', value: '', due: '2026.06.30.', status: '기한 경과 92일', tone: 'over' },
];

export const HISTORY_B20253 = [
  { at: '2026.02.21. 10:12', by: '이바다', field: '최종보고서 제출일', before: '', after: '2026.02.20.' },
  { at: '2025.12.04. 15:40', by: '김하늘', field: '평가결과서 제출', before: 'X', after: '건강증진연구소-1204(2025.12.03.)' },
  { at: '2025.11.05. 09:02', by: '김하늘', field: '종료보고', before: '', after: '2025.11.04.' },
];

export const FILE_CATEGORIES = ['계획서', '심의', '계약', '착수보고', '중간보고', '평가', '종료보고', '최종보고서', '공표', '기타'] as const;

export const FILES_B20253 = [
  { category: '계획서', name: 'B-2025-3_계획서_20250310_연구계획서.hwp', by: '김하늘', at: '2025.03.10.' },
  { category: '심의', name: 'B-2025-3_심의_20250325_심의결과통지서.pdf', by: '김하늘', at: '2025.03.25.' },
  { category: '평가', name: 'B-2025-3_평가_20251203_평가결과서.pdf', by: '김하늘', at: '2025.12.03.' },
  { category: '최종보고서', name: 'B-2025-3_최종보고서_20260220_최종보고서.pdf', by: '이바다', at: '2026.02.21.' },
];
