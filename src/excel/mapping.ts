/**
 * 현행 엑셀 → khepi-rms 항목 대응표 (초안, 2026.11.13.)
 * - 머리글 비교는 공백·줄바꿈 제거 후 일치 (normHeader)
 * - 이관 스크립트(scripts/migrate-from-legacy.ts)와 이후 앱 내 엑셀 가져오기에서 같이 사용
 */

export const normHeader = (h: unknown) => String(h ?? '').replace(/\s+/g, '');

/** 과제 원장 시트 (A. 내부연구 / B. 위탁연구) — 기준값 */
export const PROJECT_SHEET_FIELDS: Record<string, string> = {
  관리번호: 'id',
  연도: 'year',
  연번: 'seq',
  심의명: 'reviewName',
  '연구심의결과(최초)': 'review.result',
  연구심의번호: 'review.no',
  심의날짜: 'review.ym',
  연구과제명: 'title',
  담당부서: 'dept',
  '담당부서장(날짜및직급기입)': 'deptHead',
  '담당자(날짜및직급기입)': 'manager',
  연구기관: 'org',
  연구책임자: 'pi',
  '연구기간(최초)': 'periodInitial',
  '연구기간(최종)': 'periodFinal',
  연구종료일: 'endDate',
  연구예산: 'budget',
  집행금액: 'spent',
  계약방식: 'contract.method',
  계약근거: 'contract.basis',
  계약공람: 'contract.notice',
  '연구과제변경/통보': 'change.status',
  연구과제변경근거: 'change.basis',
  연구목적: 'purpose',
  착수보고: 'reports.kickoff',
  중간보고: 'reports.interim',
  연구과제평가결과서: 'evaluation.resultDoc',
  종료보고: 'reports.final',
  최종보고서: 'finalReport.status',
  최종보고서제출일: 'finalReport.submittedAt',
  '최종보고서제출지연신청(O/X)': 'finalReport.delayRequested',
  '공개/비공개': 'publication.openness',
  공개전환일: 'publication.openDate',
  알리오공시사유발생일: 'alio.eventDate',
  알리오공시등록일: 'alio.postedAt',
  '홈페이지등록마감기한(연구종료일+6개월)': '_excelHomepageDeadline', // 엑셀 수식값, 앱에서 재산정 → 비교만
  '홈페이지등록일(각부서)': 'publication.homepageRegisteredAt',
  연구관리상황점검표: 'checklist',
  연구관리상황점검: 'checklist',
};

/** 평가 및 공표 시트 (A·B) — 보조값 (원장과 다르면 legacyNote) */
export const EVAL_PUBLISH_FIELDS: Record<string, string> = {
  관리번호: 'id',
  연구과제명: 'title',
  연구기관: 'org',
  연구책임자: 'pi',
  연구기간: 'periodFinal',
  연구시작일: 'startDate',
  연구종료일: 'endDate',
  '연구관리규정(기준)': '_excelRegime',
  '연구평가일(실시)': 'evaluation.evalDate',
  '홈페이지공표일(실시)': 'publication.homepageRegisteredAt',
  비공개요약서: 'publication.docs.nonPublicSummary',
  최종보고서: 'publication.docs.finalReport',
  연구결과평가서: 'publication.docs.resultEval',
  연구정보요약서: 'publication.docs.infoSummary',
  연구활용결과보고서: 'publication.docs.useResult',
  공개예정일: 'publication.openDate',
};

/** 점수 및 의견반영여부 시트 (A·B) — 보조값 */
export const SCORE_FIELDS: Record<string, string> = {
  관리번호: 'id',
  연구과제명: 'title',
  연구기관: 'org',
  연구책임자: 'pi',
  연구과제평가결과서: 'evaluation.resultDoc',
  평가결과서제출일: 'evaluation.submittedAt',
  '연구관리규정(기준)': '_excelRegime',
  '연구평가일(실시)': 'evaluation.evalDate',
  평균: '_excelAverage', // 앱에서 재산정 → 비교만
  기준: 'evaluation.grade',
  평가내보완의견: 'evaluation.opinion',
  보완의견반영여부: 'evaluation.reflected',
  // 평가자1~5 / 점수1~5 → evaluation.evaluators (스크립트에서 처리)
};

/** C. 수탁연구 */
export const TRUST_SHEET_FIELDS: Record<string, string> = {
  관리번호: 'id',
  연도: 'year',
  연번: 'seq',
  연구과제명: 'title',
  연구목적: 'purpose',
  금액: 'trust.amount',
  발주기관: 'trust.orderer',
  수행기간: 'periodFinal',
  담당부서: 'dept',
  연구책임자: 'pi',
  수탁과제정보요약서: 'trust.infoSummary',
  결과보고서: 'trust.resultReport',
  '사업비지출증빙서류일체(영수증및원본대조필자료)': 'trust.evidence',
  정책반영여부: 'trust.policyReflected',
  학회지게재여부: 'trust.journal',
  비공개사유: 'publication.nonPublicReason',
};

/** 알리오공시 (관리번호 없음 → 연도·연구과제명으로 대응) */
export const ALIO_FIELDS: Record<string, string> = {
  연도: 'year',
  연번: 'seq',
  연구과제명: 'title',
  사유발생근거: 'alio.basis',
  사유발생일: 'alio.eventDate',
  알리오공시일: 'alio.postedAt',
  '공개/비공개': 'publication.openness',
  공개예정일: 'publication.openDate',
  사유: 'alio.reason',
};

/** 이관 대상 시트 이름 (연구관리현황) */
export const RESEARCH_SHEETS = {
  projectsA: 'A. 내부연구',
  projectsB: 'B. 위탁연구',
  projectsC: 'C. 수탁연구',
  evalA: 'A. 평가 및 공표',
  evalB: 'B. 평가 및 공표',
  scoreA: 'A. 점수 및 의견반영여부',
  scoreB: 'B. 점수 및 의견반영여부',
  alio: '알리오공시',
  reviews: '심의현황',
  meetings: '심의개최',
} as const;

/** 이관 대상 시트 이름 (심의위원회현황) */
export const COMMITTEE_SHEETS = {
  roster: '심의위원명단',
  meetingsIrb: '심의정보(IRB)',
  meetingsResearch: '심의정보(연심)',
  reviewsIrb: '(참고) 상세(IRB)',
} as const;

/** 인적정보 시트 — 정보보안 확인 전 이관 금지, 발견 시 읽지 않고 경고 */
export const BLOCKED_SHEETS = ['인적정보(IRB)', '인적정보(연심)', '(참고) 위원 생년월일'];
