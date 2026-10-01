/**
 * 보안 규칙 에뮬레이터 테스트 — 권한별 접근 결과
 * 실행: npm run test:rules (firebase emulators:exec 로 Firestore·Storage 에뮬레이터 기동)
 * 결과표: docs/보안규칙_테스트결과.md 자동 생성
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestContext, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const PROJECT = 'demo-khepi-rms';
const USERS = {
  admin: 'admin@khepi.or.kr',
  editor: 'editor@khepi.or.kr',
  viewer: 'viewer@khepi.or.kr',
  unregistered: 'stranger@gmail.com',
} as const;
type Role = keyof typeof USERS | 'unverified' | 'anonymous';
const ROLES: Role[] = ['admin', 'editor', 'viewer', 'unregistered', 'unverified', 'anonymous'];
const ROLE_LABEL: Record<Role, string> = {
  admin: '관리자', editor: '편집자', viewer: '열람자', unregistered: '미등록(로그인)',
  unverified: '미인증 이메일', anonymous: '비로그인',
};

let env: RulesTestEnvironment;
const results: { group: string; op: string; role: Role; expected: boolean; actual: boolean }[] = [];

function ctx(role: Role): RulesTestContext {
  if (role === 'anonymous') return env.unauthenticatedContext();
  // 미인증 이메일: 관리자 이메일이지만 email_verified false
  if (role === 'unverified') return env.authenticatedContext('uid-unverified', { email: USERS.admin, email_verified: false });
  return env.authenticatedContext(`uid-${role}`, { email: USERS[role], email_verified: true });
}

/** 초기 데이터: 권한 목록, 과제 1건, 이력 1건, 위원 1명, 파일 1개 */
async function seed(membersPrivateEnabled = false) {
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'config/access'), {
      admins: [USERS.admin], editors: [USERS.editor], viewers: [USERS.viewer], membersPrivateEnabled,
    });
    await setDoc(doc(db, 'projects/B-2025-3'), { type: 'B', title: '테스트 과제' });
    await setDoc(doc(db, 'projects/B-2025-3/history/h1'), { field: 'title', before: '', after: '테스트 과제', by: USERS.editor });
    await setDoc(doc(db, 'projects/B-2025-3/files/f1'), { name: 'B-2025-3_계획서_20250310_계획서.pdf' });
    await setDoc(doc(db, 'committees/research/members/m1'), { nameMasked: '강○람' });
    await setDoc(doc(db, 'committees/research/members_private/m1'), { name: '강하람', birth: '680312' });
    await setDoc(doc(db, 'customFields/c1'), { label: '국회요구자료 제출 여부' });
    await uploadBytes(ref(c.storage(), 'projects/B-2025-3/B-2025-3_계획서_20250310_계획서.pdf'), new Uint8Array([1, 2, 3]));
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seed();
});

afterAll(async () => {
  await env?.cleanup();
  writeReport();
});

type Expect = Partial<Record<Role, boolean>>;
const only = (...roles: Role[]): Expect => Object.fromEntries(ROLES.map((r) => [r, roles.includes(r)]));
const MEMBERS: Role[] = ['admin', 'editor', 'viewer'];
const EDITORS: Role[] = ['admin', 'editor'];

/** 권한별로 같은 동작을 실행하고 기대 결과와 비교 */
function matrix(group: string, op: string, expected: Expect, run: (c: RulesTestContext, role: Role) => Promise<unknown>, before?: () => Promise<void>) {
  describe(`${group} / ${op}`, () => {
    for (const role of ROLES) {
      const allow = expected[role] ?? false;
      it(`${ROLE_LABEL[role]} → ${allow ? '허용' : '거부'}`, async () => {
        if (before) await before();
        let actual: boolean;
        try {
          await (allow ? assertSucceeds(run(ctx(role), role)) : assertFails(run(ctx(role), role)));
          actual = allow;
        } catch {
          actual = !allow;
        }
        results.push({ group, op, role, expected: allow, actual });
        expect(actual).toBe(allow);
      });
    }
  });
}

/* ---------------- Firestore ---------------- */

matrix('권한 목록 config/access', '읽기', only(...MEMBERS), (c) => getDoc(doc(c.firestore(), 'config/access')));
matrix('권한 목록 config/access', '사용자 추가', only('admin'), (c) =>
  updateDoc(doc(c.firestore(), 'config/access'), { viewers: [USERS.viewer, 'new@khepi.or.kr'] }));
matrix('권한 목록 config/access', '관리자 본인 권한 해제', only(), (c) =>
  updateDoc(doc(c.firestore(), 'config/access'), { admins: ['other@khepi.or.kr'] }));
matrix('권한 목록 config/access', '관리자 0명으로 변경', only(), (c) =>
  updateDoc(doc(c.firestore(), 'config/access'), { admins: [] }));
matrix('권한 목록 config/access', '관리자 추가 (본인 유지)', only('admin'), (c) =>
  updateDoc(doc(c.firestore(), 'config/access'), { admins: [USERS.admin, 'second@khepi.or.kr'] }));
matrix('권한 목록 config/access', '실명 저장 허용값 변경', only(), (c) =>
  updateDoc(doc(c.firestore(), 'config/access'), { membersPrivateEnabled: true }));

matrix('과제 projects', '읽기', only(...MEMBERS), (c) => getDoc(doc(c.firestore(), 'projects/B-2025-3')));
matrix('과제 projects', '수정', only(...EDITORS), (c) => updateDoc(doc(c.firestore(), 'projects/B-2025-3'), { title: '수정' }));
matrix('과제 projects', '신규 등록', only(...EDITORS), (c) => setDoc(doc(c.firestore(), 'projects/A-2026-9'), { type: 'A' }));
matrix('과제 projects', '삭제', only('admin'), (c) => deleteDoc(doc(c.firestore(), 'projects/B-2025-3')));

matrix('수정 이력 history', '읽기', only(...MEMBERS), (c) => getDoc(doc(c.firestore(), 'projects/B-2025-3/history/h1')));
matrix('수정 이력 history', '추가 (작성자 본인 이메일)', only(...EDITORS), (c, role) =>
  addDoc(collection(c.firestore(), 'projects/B-2025-3/history'), {
    field: 'title', before: 'a', after: 'b', by: role === 'anonymous' ? '' : role === 'unverified' ? USERS.admin : USERS[role],
  }));
matrix('수정 이력 history', '추가 (타인 이메일 기록)', only(), (c) =>
  addDoc(collection(c.firestore(), 'projects/B-2025-3/history'), { field: 'title', before: 'a', after: 'b', by: 'someone@khepi.or.kr' }));
matrix('수정 이력 history', '수정', only(), (c) => updateDoc(doc(c.firestore(), 'projects/B-2025-3/history/h1'), { after: '변조' }));
matrix('수정 이력 history', '삭제', only(), (c) => deleteDoc(doc(c.firestore(), 'projects/B-2025-3/history/h1')));

matrix('근거 기록 files', '읽기', only(...MEMBERS), (c) => getDoc(doc(c.firestore(), 'projects/B-2025-3/files/f1')));
matrix('근거 기록 files', '추가', only(...EDITORS), (c) =>
  addDoc(collection(c.firestore(), 'projects/B-2025-3/files'), {
    category: '최종보고서', docNo: '건강증진연구소-1204(2025.12.03.)', path: '\\\\nas\\연구관리\\B.위탁연구\\B-2025-3',
    fileName: 'B-2025-3_최종보고서_20260220_최종보고서.pdf', note: '', by: 'editor@khepi.or.kr', at: '2026-10-01',
  }));

matrix('심의위원회 members', '읽기', only(...MEMBERS), (c) => getDoc(doc(c.firestore(), 'committees/research/members/m1')));
matrix('심의위원회 members', '수정', only(...EDITORS), (c) => updateDoc(doc(c.firestore(), 'committees/research/members/m1'), { org: '수정' }));
matrix('심의위원회 meetings', '추가', only(...EDITORS), (c) =>
  addDoc(collection(c.firestore(), 'committees/irb/meetings'), { date: '2026-10-01' }));

matrix('위원 실명 members_private', '읽기', only('admin'), (c) => getDoc(doc(c.firestore(), 'committees/research/members_private/m1')));
matrix('위원 실명 members_private', '쓰기 (정보보안 확인 전)', only(), (c) =>
  setDoc(doc(c.firestore(), 'committees/research/members_private/m2'), { name: '홍길동', birth: '700101' }));
matrix('위원 실명 members_private', '쓰기 (확인 후 허용 설정 시)', only('admin'), (c) =>
  setDoc(doc(c.firestore(), 'committees/research/members_private/m2'), { name: '홍길동', birth: '700101' }),
() => seed(true));

matrix('추가 항목 customFields', '읽기', only(...MEMBERS), (c) => getDoc(doc(c.firestore(), 'customFields/c1')));
matrix('추가 항목 customFields', '추가', only('admin'), (c) => setDoc(doc(c.firestore(), 'customFields/c2'), { label: 'x' }));

matrix('정의되지 않은 경로', '읽기', only(), (c) => getDoc(doc(c.firestore(), 'other/x')));

/* ---------------- Storage ---------------- */

// Storage: 보관용 규칙 (Spark 유지로 미사용, 배포 제외)
const FILE = 'projects/B-2025-3/B-2025-3_계획서_20250310_계획서.pdf';
matrix('Storage 근거 파일 (보관·배포 제외)', '내려받기', only(...MEMBERS), (c) => getBytes(ref(c.storage(), FILE)));
matrix('Storage 근거 파일 (보관·배포 제외)', '올리기 (pdf 1KB)', only(...EDITORS), (c) =>
  uploadBytes(ref(c.storage(), 'projects/B-2025-3/B-2025-3_평가_20251203_평가결과서.pdf'), new Uint8Array(1024)));
matrix('Storage 근거 파일 (보관·배포 제외)', '올리기 (hwpx 대문자 확장자)', only(...EDITORS), (c) =>
  uploadBytes(ref(c.storage(), 'projects/B-2025-3/B-2025-3_기타_20251203_자료.HWPX'), new Uint8Array(10)));
matrix('Storage 근거 파일 (보관·배포 제외)', '올리기 (exe 확장자)', only(), (c) =>
  uploadBytes(ref(c.storage(), 'projects/B-2025-3/setup.exe'), new Uint8Array(10)));
matrix('Storage 근거 파일 (보관·배포 제외)', '올리기 (20MB 초과)', only(), (c) =>
  uploadBytes(ref(c.storage(), 'projects/B-2025-3/big.pdf'), new Uint8Array(20 * 1024 * 1024 + 1)));
matrix('Storage 근거 파일 (보관·배포 제외)', '올리기 (20MB 정확히)', only(...EDITORS), (c) =>
  uploadBytes(ref(c.storage(), 'projects/B-2025-3/limit.pdf'), new Uint8Array(20 * 1024 * 1024)));
matrix('Storage 근거 파일 (보관·배포 제외)', '삭제', only(...EDITORS), (c) => deleteObject(ref(c.storage(), FILE)));
matrix('Storage 근거 파일 (보관·배포 제외)', '경로 밖 올리기', only(), (c) => uploadBytes(ref(c.storage(), 'etc/a.pdf'), new Uint8Array(10)));

/* ---------------- 결과표 ---------------- */

function writeReport() {
  if (!results.length) return;
  const rows = new Map<string, Map<Role, { expected: boolean; actual: boolean }>>();
  for (const r of results) {
    const key = `${r.group} | ${r.op}`;
    if (!rows.has(key)) rows.set(key, new Map());
    rows.get(key)!.set(r.role, r);
  }
  const mark = (v?: { expected: boolean; actual: boolean }) =>
    !v ? '-' : `${v.actual ? '허용' : '거부'}${v.actual === v.expected ? '' : ' ⚠️기대와 다름'}`;
  const pass = results.filter((r) => r.actual === r.expected).length;
  const lines = [
    '# 보안 규칙 테스트 결과 (에뮬레이터)',
    '',
    `실행 ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC / 판정 ${pass}/${results.length} 기대 일치`,
    '',
    '- 실행: `npm run test:rules` (Firestore·Storage 에뮬레이터)',
    '- 미등록(로그인): Google 로그인했으나 config/access 허용목록에 없는 계정',
    '- 미인증 이메일: 허용목록의 관리자 이메일이지만 이메일 인증(email_verified) false',
    '- Storage: Spark 요금제 유지로 미사용, 규칙은 보관용 (배포 제외)',
    '',
    `| 대상 | 동작 | ${ROLES.map((r) => ROLE_LABEL[r]).join(' | ')} |`,
    `|---|---|${ROLES.map(() => '---').join('|')}|`,
    ...[...rows].map(([k, m]) => `| ${k} | ${ROLES.map((r) => mark(m.get(r))).join(' | ')} |`),
    '',
  ];
  writeFileSync('docs/보안규칙_테스트결과.md', lines.join('\n'));
}
