/** 1단계 정적 화면용 더미 데이터 (가상 인물) */
export type DummyMember = {
  id: string; name: string; nameMasked: string; birth: string; role: string; org: string; career: string;
  gender: '남' | '여'; term: string; termEnd: string; appointer: string; partyMember: string; external: boolean; active: boolean;
};

export const MEMBERS: Record<'research' | 'irb', DummyMember[]> = {
  research: [
    { id: 'm1', name: '강하람', nameMasked: '강○람', birth: '680312', role: '위원장', org: '한국건강증진개발원', career: '건강증진정책본부장', gender: '남', term: '2025.04.01.~2027.03.31.', termEnd: '2027.03.31.', appointer: '원장', partyMember: 'X', external: false, active: true },
    { id: 'm2', name: '서다온', nameMasked: '서○온', birth: '750821', role: '위원', org: '사아대학교', career: '보건대학원 교수', gender: '여', term: '2024.11.01.~2026.10.31.', termEnd: '2026.10.31.', appointer: '원장', partyMember: 'X', external: true, active: true },
    { id: 'm3', name: '문하진', nameMasked: '문○진', birth: '810105', role: '위원', org: '자차연구원', career: '선임연구위원', gender: '남', term: '2024.12.01.~2026.11.30.', termEnd: '2026.11.30.', appointer: '원장', partyMember: 'X', external: true, active: true },
    { id: 'm4', name: '오세린', nameMasked: '오○린', birth: '790930', role: '위원', org: '한국건강증진개발원', career: '건강증진연구소장', gender: '여', term: '2025.04.01.~2027.03.31.', termEnd: '2027.03.31.', appointer: '원장', partyMember: 'X', external: false, active: true },
    { id: 'm5', name: '임도윤', nameMasked: '임○윤', birth: '720417', role: '위원', org: '카타대학교', career: '예방의학과 교수', gender: '남', term: '2025.08.11.~2027.08.10.', termEnd: '2027.08.10.', appointer: '원장', partyMember: 'X', external: true, active: true },
  ],
  irb: [
    { id: 'i1', name: '백서연', nameMasked: '백○연', birth: '700228', role: '위원장', org: '파하대학교', career: '간호학과 교수', gender: '여', term: '2025.01.01.~2026.12.31.', termEnd: '2026.12.31.', appointer: '원장', partyMember: 'X', external: true, active: true },
    { id: 'i2', name: '조은결', nameMasked: '조○결', birth: '850615', role: '위원', org: '법무법인 가온', career: '변호사', gender: '남', term: '2025.01.01.~2026.12.31.', termEnd: '2026.12.31.', appointer: '원장', partyMember: 'X', external: true, active: true },
    { id: 'i3', name: '남유나', nameMasked: '남○나', birth: '880902', role: '위원', org: '한국건강증진개발원', career: '연구원', gender: '여', term: '2025.01.01.~2026.12.31.', termEnd: '2026.12.31.', appointer: '원장', partyMember: 'X', external: false, active: true },
  ],
};

export type DummyMeeting = {
  id: string; date: string; mode: string; enrolled: number; attended: number; agendaCount: number; agendas: string; results: string; docNo: string;
};

export const MEETINGS: Record<'research' | 'irb', DummyMeeting[]> = {
  research: [
    { id: 'g1', date: '2026.09.15.', mode: '서면', enrolled: 5, attended: 5, agendaCount: 2, agendas: '건강도시 평가체계 고도화 과제 변경 외 1건', results: '승인 1 / 조건부승인 1', docNo: '건강증진연구소-1450' },
    { id: 'g2', date: '2026.04.10.', mode: '대면', enrolled: 5, attended: 4, agendaCount: 3, agendas: '건강도시 평가체계 고도화 외 2건', results: '승인 2 / 보완후재심의 1', docNo: '건강증진연구소-602' },
    { id: 'g3', date: '2026.02.12.', mode: '대면', enrolled: 5, attended: 5, agendaCount: 2, agendas: '청소년 신체활동 실태 기초조사 외 1건', results: '승인 2', docNo: '건강증진연구소-210' },
  ],
  irb: [
    { id: 'h1', date: '2026.08.20.', mode: '대면', enrolled: 3, attended: 3, agendaCount: 1, agendas: '청소년 신체활동 실태 기초조사', results: '승인 1', docNo: 'IRB-2026-08' },
  ],
};

export type DummyReview = { id: string; meeting: string; kind: string; projectTitle: string; pi: string; result: string };

export const REVIEWS: Record<'research' | 'irb', DummyReview[]> = {
  research: [
    { id: 'r1', meeting: '2026.09.15.', kind: '변경심의', projectTitle: '건강도시 평가체계 고도화를 위한 연구', pi: '박소나무', result: '승인' },
    { id: 'r2', meeting: '2026.09.15.', kind: '신규심의', projectTitle: '고령층 건강정보 이해능력 조사', pi: '이바다', result: '조건부승인' },
    { id: 'r3', meeting: '2026.04.10.', kind: '신규심의', projectTitle: '건강도시 평가체계 고도화를 위한 연구', pi: '박소나무', result: '승인' },
    { id: 'r4', meeting: '2026.04.10.', kind: '신규심의', projectTitle: '직장인 정신건강 증진 프로그램 개발', pi: '최여름', result: '보완후재심의' },
  ],
  irb: [
    { id: 's1', meeting: '2026.08.20.', kind: '신규심의', projectTitle: '청소년 신체활동 실태 기초조사', pi: '이바다', result: '승인' },
  ],
};
