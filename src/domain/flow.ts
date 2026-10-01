/**
 * 진행 프로세스 안내 데이터 (R2025 기준) + 구간별 변경 문구
 * 내용 문자열의 **…** 는 굵게 표시(기한·필수 요건), " / " 는 줄 구분
 */
import type { RegimeKey } from './regimes';

export type StepKind = '필수' | '권고' | '해당 시';

export type FlowStep = {
  id: string;
  name: string;
  kind: StepKind;
  owner: string;
  content: string;
  article: string;
  forms: string;
};

export type FlowGroup = { id: string; name: string; color: string; steps: FlowStep[] };

export const FLOW_R2025: FlowGroup[] = [
  {
    id: 'prep', name: '연구과제 준비', color: '#706F6F',
    steps: [
      { id: 'prep', name: '연구과제 준비', kind: '필수', owner: '총괄책임자', content: '추진계획 수립 / 착수~종료 관리·감독', article: '제10조', forms: '-' },
    ],
  },
  {
    id: 'review', name: '연구과제 심의', color: '#00855A',
    steps: [
      { id: 'apply', name: '연구과제 심의 신청', kind: '필수', owner: '추진부서', content: '내부: 계획서·심의신청서 / 위탁: 심의신청서·RFP / **신청 전 사무국 사전협의 필요** / 온나라정책연구 등 중복 사전 검토', article: '제11·12·13조', forms: '서식1·2호, RFP' },
      { id: 'review', name: '연구과제 심의', kind: '필수', owner: '위원회', content: '접수 및 연구심의위원회 개최 / 사무국 유사·중복성 검토, 위원 심의(서면 가능)', article: '제14조', forms: '서식3호' },
      { id: 'notify', name: '심의결과 통보', kind: '필수', owner: '위원회', content: '승인·조건부 승인·보완 후 재심의·반려 / 조건부: 의견 반영 대비표 후 위원장 최종 승인 / 재심의: 계획서·신청서 재작성 / 승인된 내부연구 기본정보 통보', article: '제15조', forms: '서식4·5호' },
    ],
  },
  {
    id: 'run', name: '연구과제 수행', color: '#373736',
    steps: [
      { id: 'contract', name: '연구용역계약', kind: '해당 시', owner: '추진부서', content: '위탁연구만, 계약사무규칙 준수 / 계약 후 과제명·연구진·기관·기간·목적·주요내용·금액·계획서 통보', article: '제16조', forms: '-' },
      { id: 'trust', name: '수탁과제 정보 요약', kind: '해당 시', owner: '연구책임자', content: '수탁연구만, 수행 결정 시 작성·통보 / 결과보고는 계약조건', article: '제18·27조', forms: '서식6호' },
      { id: 'kickoff', name: '착수보고', kind: '권고', owner: '총괄책임자', content: '목적·방법·일정 공유 / 서면 또는 회의, 회의 시 위원회 일정 협의 / 실시 후 보고서', article: '제21조', forms: '서식7호' },
      { id: 'interim', name: '중간보고', kind: '권고', owner: '총괄책임자', content: '진행 상황·예산 집행·중간 성과 공유 / 실시 후 보고서', article: '제21조', forms: '서식7호' },
      { id: 'change', name: '연구과제 변경', kind: '해당 시', owner: '총괄책임자', content: '심의 대상: 타 과제 변경, 연구비 증액, 연구책임자 변경, 비목 간 30% 이상 / 통보 대상: 참여연구원·기간·예산내역(30% 미만)·경미한 과제명 / 인건비 총액 증액 불가', article: '제22조', forms: '서식8·9·10호' },
      { id: 'evaluation', name: '연구과제 평가', kind: '필수', owner: '추진부서', content: '**종료 전** 결과물 평가 / 외부 전문가 등 **3인 이상** / 평가결과서 **종료 후 1개월 이내** / 60점 미만 부적격 재평가(1회)', article: '제23조', forms: '서식11호' },
      { id: 'finalBrief', name: '종료보고', kind: '필수', owner: '연구책임자', content: '**연구종료일 이전** / 평가 결과·보완사항 공유 / 위원회(사무국) 참석', article: '제24조', forms: '서식7호' },
    ],
  },
  {
    id: 'end', name: '연구과제 종료', color: '#F08A01',
    steps: [
      { id: 'finalReport', name: '최종보고서 제출', kind: '필수', owner: '총괄책임자', content: '**종료 후 3개월 이내** 최종보고서·연구결과 평가서 제출 / 평가 보완의견 반영 / 연기 1회 최대 3개월', article: '제25조', forms: '별지1호, 서식12·18호' },
      { id: 'publication', name: '연구과제 결과 공표', kind: '필수', owner: '총괄책임자', content: '**종료 후 6개월 이내** 홈페이지 게시 / 대상: 최종보고서, 연구결과 평가서, 연구활용 결과보고서, 연구정보 요약서 / 비공개: 요약문 대체, 원문 위원회 제출, 기간 경과 후 **3개월 이내** 교체', article: '제26조', forms: '서식12·13·14·15호' },
    ],
  },
  {
    id: 'manage', name: '연구과제 관리', color: '#7A6A45',
    steps: [
      { id: 'checklist', name: '연구 추진과정 점검', kind: '필수', owner: '위원회', content: '점검표 작성, **차년도 6월까지** 통보', article: '제29조', forms: '서식16호' },
      { id: 'use', name: '연구결과 활용', kind: '해당 시', owner: '연구책임자', content: '위탁연구 결과물 활용 시 신청, 허용 후 활용·결과 통보·출처 표기', article: '제30조', forms: '서식17호' },
    ],
  },
];

/** 구간별 변경 사항. null = 해당 구간에 단계 없음 */
type Patch = Partial<Omit<FlowStep, 'id'>> | null;

const R2022_PATCH: Record<string, Patch> = {
  apply: { content: '내부: 계획서(서식1호) / 위탁: 계획서·RFP / 정책연구관리시스템 등 중복 사전 검토', forms: '서식1호, RFP' },
  review: { forms: '서식3호' },
  notify: { content: '승인·조건부 승인·보완 후 재심의·반려 / 조건부: 의견 반영 대비표 후 위원장 승인', forms: '서식4·5호' },
  trust: { content: '수탁연구 선정 시 위원회 통보 / 결과보고는 계약조건', forms: '-' },
  kickoff: { forms: '서식6호' },
  interim: { forms: '서식6호' },
  change: { content: '심의 대상: 타 과제 변경, 연구비 증액, 연구책임자 변경 등 / 그 외 변경은 통보', forms: '서식7호' },
  evaluation: { content: '**종료 전** 결과물 평가 / **3인 이상** / 위원회 의뢰 시 종료 5주 전 계획 통보, 3주 전 의뢰 / 자체평가 결과서 **종료 후 1개월 이내**', forms: '서식8호' },
  finalBrief: { forms: '서식6호' },
  finalReport: { content: '**종료 후 1개월 이내** 최종보고서 제출 / 평가 내용 반영', forms: '-' },
  publication: { content: '**종료 후 6개월 이내** 홈페이지 게시 / 대상: 최종보고서, 연구결과 평가서, 연구활용 결과보고서, 연구정보 요약서 / 비공개: 요약문 위원회 제출', forms: '서식9·10·11·12호' },
  checklist: { content: '점검표 작성, **차년도 6월 이전** 통보', forms: '서식13호' },
  use: { forms: '서식14호' },
};

const R2023_PATCH: Record<string, Patch> = {
  ...R2022_PATCH,
  apply: { content: '내부: 계획서(서식1호) / 위탁: 심의신청서(서식2호)·RFP / 정책연구관리시스템 등 중복 사전 검토', forms: '서식1·2호, RFP' },
  notify: { content: '승인·조건부 승인·보완 후 재심의·반려 / 조건부: 의견 반영 대비표 후 위원장 최종 승인 통보', forms: '서식4·5호' },
};

const R2020_PATCH: Record<string, Patch> = {
  prep: { content: '추진부서장 추진계획 수립', article: '제8조', owner: '추진부서장' },
  apply: { content: '신청서(서식1호)·계획서(서식2호) 제출 / 정책연구관리시스템 등 중복 사전 검토', article: '제9조', forms: '서식1·2호', owner: '추진부서장' },
  review: { content: '위원회 심의 (재적 과반수 출석, 출석 과반수 찬성) / 유사·중복성 검토', article: '제5·9조', forms: '서식3호' },
  notify: { content: '심의결과 통지서 / 심의의견 반영 대비표 제출', article: '제5조', forms: '서식4·5호' },
  contract: { content: '「용역사업관리규정」 따름 / 계약 후 연구자·기간·금액 통보', article: '제10조', owner: '추진부서장' },
  trust: null, kickoff: null, interim: null,
  change: { content: '변경요청서 제출·보고 / 타 과제 변경·연구비 증액은 심의', article: '제11조', forms: '서식6호', owner: '추진부서장' },
  evaluation: { content: '**종료 후 1개월 이내** 결과 평가 / 결과평가서·결과 활용 계획서 제출', article: '제12조', forms: '서식7·8호', owner: '추진부서장' },
  finalBrief: null, finalReport: null,
  publication: { content: '공개 가능한 때 **지체 없이** 홈페이지 공개 (기한 없음) / 비공개 기간 2년 범위', article: '제12조', forms: '-', owner: '추진부서장' },
  checklist: null, use: null,
};

const R2019_PATCH: Record<string, Patch> = {
  ...R2020_PATCH,
  prep: { content: '추진부서장 추진계획 수립', article: '제7조', owner: '추진부서장' },
  apply: { content: '신청서(서식1호) 제출 / 정책연구관리시스템 등 중복 사전 검토', article: '제8조', forms: '서식1호', owner: '추진부서장' },
  review: { article: '제5·8조', forms: '서식3호' },
  notify: { content: '심의 결과 확인서', article: '제5조', forms: '서식3호' },
  contract: { content: '「용역사업관리규정」 따름 / 계약 후 통보', article: '제9조', owner: '추진부서장' },
  change: null,
  evaluation: { content: '**종료 후 1개월 이내** 결과 평가 / 결과평가서·결과 활용 계획서 제출', article: '제10조', forms: '서식2호', owner: '추진부서장' },
  publication: { content: '공개 가능한 때 **지체 없이** 건강증진 연구관리 시스템 공개 (기한 없음)', article: '제10조', forms: '-', owner: '추진부서장' },
};

const PATCHES: Record<RegimeKey, Record<string, Patch>> = {
  R2025: {},
  R2023: R2023_PATCH,
  R2022: R2022_PATCH,
  R2020: R2020_PATCH,
  R2019: R2019_PATCH,
};

/** 구간별 진행 프로세스. 해당 구간에 없는 단계는 제외 */
export function flowFor(regime: RegimeKey): FlowGroup[] {
  const patch = PATCHES[regime];
  return FLOW_R2025.map((g) => ({
    ...g,
    steps: g.steps
      .filter((s) => patch[s.id] !== null)
      .map((s) => ({ ...s, ...(patch[s.id] ?? {}) })),
  })).filter((g) => g.steps.length > 0);
}
