/**
 * 권한 (config/access 허용목록)
 * { admins: [], editors: [], viewers: [], membersPrivateEnabled?: false }
 * 이메일은 소문자로 저장·비교
 */
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { firebase } from './firebase';

export type Role = 'admin' | 'editor' | 'viewer';
export const ROLE_LABEL: Record<Role, string> = { admin: '관리자', editor: '편집자', viewer: '열람자' };
const LIST: Record<Role, 'admins' | 'editors' | 'viewers'> = { admin: 'admins', editor: 'editors', viewer: 'viewers' };

export type AccessDoc = { admins: string[]; editors: string[]; viewers: string[]; membersPrivateEnabled?: boolean };

const accessRef = () => doc(firebase().db, 'config/access');
export const normEmail = (e: string) => e.trim().toLowerCase();

/** 허용목록 조회 — 미등록 계정은 규칙상 읽기 거부 → null */
export async function loadAccess(): Promise<AccessDoc | null> {
  try {
    const snap = await getDoc(accessRef());
    return snap.exists() ? (snap.data() as AccessDoc) : null;
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') return null;
    throw e;
  }
}

export function roleOf(access: AccessDoc | null, email: string | null | undefined): Role | null {
  if (!access || !email) return null;
  const e = normEmail(email);
  if (access.admins?.includes(e)) return 'admin';
  if (access.editors?.includes(e)) return 'editor';
  if (access.viewers?.includes(e)) return 'viewer';
  return null;
}

/** 사용자 권한 지정 (다른 목록에서 제거 후 추가) — 관리자 전용 */
export async function setUserRole(email: string, role: Role | null, me?: string | null): Promise<AccessDoc> {
  const e = normEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('이메일 형식 오류 / 확인 필요');
  return runTransaction(firebase().db, async (tx) => {
    const snap = await tx.get(accessRef());
    if (!snap.exists()) throw new Error('config/access 문서 없음 / Firebase 콘솔에서 최초 생성 필요');
    const cur = snap.data() as AccessDoc;
    const next: AccessDoc = {
      ...cur,
      admins: (cur.admins ?? []).filter((x) => x !== e),
      editors: (cur.editors ?? []).filter((x) => x !== e),
      viewers: (cur.viewers ?? []).filter((x) => x !== e),
    };
    if (role) next[LIST[role]] = [...next[LIST[role]], e];
    // 보안 규칙과 동일: 관리자 0명·본인 관리자 해제 불가
    if (next.admins.length === 0) throw new Error('관리자 최소 1명 필요');
    if (me && !next.admins.includes(normEmail(me))) throw new Error('본인 관리자 권한 해제 불가');
    tx.update(accessRef(), { admins: next.admins, editors: next.editors, viewers: next.viewers });
    return next;
  });
}
