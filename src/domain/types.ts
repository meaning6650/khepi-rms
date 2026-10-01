/**
 * 판별·기한 산정에 쓰는 과제 데이터 (지시서 4장 projects 문서 중 해당 항목)
 * 날짜는 모두 ISO 문자열 "YYYY-MM-DD" (시간대 영향 배제)
 */
import type { RegimeKey } from './regimes';

export type ProjectType = 'A' | 'B' | 'C';

export type Evaluator = { name?: string; score?: number | null };

export type ProjectInput = {
  id?: string;
  type: ProjectType;
  reviewName?: string;            // "심의O" | "심의X"
  startDate?: string | null;
  endDate?: string | null;
  regimeOverride?: RegimeKey | null;
  review?: { no?: string; ym?: string; result?: string; date?: string | null };
  contract?: { notice?: string };
  reports?: { kickoff?: string; interim?: string; final?: string };
  evaluation?: {
    evalDate?: string;
    submittedAt?: string;
    resultDoc?: string;
    evaluators?: Evaluator[];
  };
  finalReport?: { status?: string; docNo?: string; submittedAt?: string; delayRequested?: string };
  publication?: { homepageRegisteredAt?: string };
  checklist?: string;
};

/* ---------- 근거 기록 (projects/{id}/files) ---------- */

export const EVIDENCE_CATEGORIES = [
  '계획서', '심의', '계약', '착수보고', '중간보고', '평가', '종료보고', '최종보고서', '공표', '기타',
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

/**
 * 근거 기록 — 파일 업로드 대신 공문번호·공유폴더 경로 기록 (Storage 보류, 2026.10.01. 결정)
 * 추후 Storage 도입 시 storagePath 필드만 추가 (기존 기록 그대로 사용)
 */
export type EvidenceRecord = {
  category: EvidenceCategory;
  docNo: string;      // 공문번호 예: 건강증진연구소-1204(2025.12.03.)
  path: string;       // 공유폴더 경로 예: \\nas\연구관리\B.위탁연구\B-2025-3
  fileName: string;   // 관리번호_분류_YYYYMMDD_원본명
  note: string;
  by: string;         // 작성자 이메일(소문자, 보안 규칙과 동일)
  at: string;         // 기록 일시 ISO
};
