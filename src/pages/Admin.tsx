import { useState } from 'react';
import { Button, Field, Select, Table, TextInput, ui, useToast } from '../components';
import { useAuth } from '../app/auth';
import { ROLE_LABEL, normEmail, setUserRole, type Role } from '../data/access';

const CUSTOM = [{ label: '국회요구자료 제출 여부', type: '선택형', options: 'O / X / 해당없음' }];
const ROLE_BY_LABEL: Record<string, Role> = { 관리자: 'admin', 편집자: 'editor', 열람자: 'viewer' };

/** 07 관리 (관리자 전용) — 사용자 권한은 config/access 연결 / 추가 항목·엑셀은 이후 단계 */
export function Admin() {
  const { access, user, refreshAccess } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const me = normEmail(user?.email ?? '');

  const users = access
    ? (['admin', 'editor', 'viewer'] as Role[]).flatMap((r) =>
        (access[r === 'admin' ? 'admins' : r === 'editor' ? 'editors' : 'viewers'] ?? []).map((e) => ({ email: e, role: r })))
    : [];

  const apply = async (target: string, role: Role | null, done: string) => {
    setBusy(true);
    try {
      await setUserRole(target, role, user?.email);
      await refreshAccess();
      toast(done);
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === 'permission-denied' ? '권한 없음 / 관리자 0명·본인 권한 해제 불가' : (e as Error).message, true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const role = ROLE_BY_LABEL[roleLabel];
    if (!email.trim() || !role) { toast('이메일·권한 선택 필요', true); return; }
    if (await apply(email, role, `${normEmail(email)} / ${roleLabel} 지정 완료`)) { setEmail(''); setRoleLabel(''); }
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 24px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>관리</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>관리자 전용 / 사용자 권한·추가 항목·엑셀 가져오기·내보내기</p>
      </div>
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>사용자 권한</h2>
        <Table rows={users} rowKey={(u) => u.email} columns={[
          { key: 'e', header: '이메일', render: (u) => <>{u.email}{u.email === me && <span style={{ color: 'var(--muted)', fontSize: 12 }}> (본인)</span>}</> },
          { key: 'r', header: '권한', width: 160, align: 'center', render: (u) => (
            <Select
              options={['관리자', '편집자', '열람자']}
              value={ROLE_LABEL[u.role]}
              disabled={busy || u.email === me}
              onChange={(ev) => { const r = ROLE_BY_LABEL[ev.target.value]; if (r && r !== u.role) void apply(u.email, r, `${u.email} / ${ev.target.value} 변경 완료`); }}
            />
          ) },
          { key: 'x', header: '', width: 90, align: 'center', render: (u) => (
            <Button variant="ghost" disabled={busy || u.email === me} onClick={() => {
              if (window.confirm(`${u.email} 권한 삭제`)) void apply(u.email, null, `${u.email} / 권한 삭제 완료`);
            }}>삭제</Button>
          ) },
        ]} />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>본인 권한 변경·삭제 불가 (관리자 잠금 방지) / 위원 실명 저장 허용은 정보보안 확인 후 Firebase 콘솔에서만 변경</p>
        <div className={ui.card} style={{ padding: '4px 20px', marginTop: 12 }}>
          <Field label="이메일 추가"><TextInput placeholder="(작성 필요) 예: name@khepi.or.kr" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="권한"><Select options={['관리자', '편집자', '열람자']} value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0' }}>
            <Button variant="primary" disabled={busy} onClick={() => void add()}>추가</Button>
          </div>
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>추가 항목 (국회요구자료 등)</h2>
        <Table rows={CUSTOM} rowKey={(c) => c.label} columns={[
          { key: 'l', header: '항목명', render: (c) => c.label },
          { key: 't', header: '형식', render: (c) => c.type, width: 100, align: 'center' },
          { key: 'o', header: '선택지', render: (c) => c.options },
        ]} />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>예시 데이터 / 추가 항목 저장은 5단계 데이터 연결 시 제공</p>
      </section>
      <section style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary">엑셀 내보내기 (표준 원자료)</Button>
        <Button>홈페이지 게시현황 양식</Button>
        <Button>국회요구자료 맞춤</Button>
      </section>
    </div>
  );
}
