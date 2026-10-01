import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import s from './AuthGate.module.css';
import { Button } from '../components';
import { useAuth } from './auth';
import { missingConfig, isEmulator } from '../data/firebase';
import type { Role } from '../data/access';

function Frame({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <img className={s.logo} src={`${import.meta.env.BASE_URL}ci/signature.png`} alt="한국건강증진개발원 KHEPI" />
        <h1 className={s.title}>{title}</h1>
        {sub && <p className={s.sub}>{sub}</p>}
        <div className={s.body}>{children}</div>
        <div className={s.foot}>연구관리 통합대장 / 건강증진연구소{isEmulator ? ' / 에뮬레이터 연결' : ''}</div>
      </div>
    </div>
  );
}

/** 로그인 필수 + config/access 허용목록 등록 계정만 진입 */
export function AuthGate({ children }: { children: ReactNode }) {
  const a = useAuth();

  if (a.status === 'config-missing') {
    return (
      <Frame title="Firebase 설정 미입력" sub="접속 정보 누락 / 관리자 설정 필요">
        <div className={`${s.msg} ${s.err}`}>누락 항목: {missingConfig.join(', ')}</div>
        <ul className={s.list}>
          <li>로컬: <span className={s.code}>.env.local</span> 작성 (.env.example 참고)</li>
          <li>배포: GitHub Actions Secrets 등록</li>
        </ul>
      </Frame>
    );
  }
  if (a.status === 'loading') {
    return <Frame title="로그인 확인 중" sub="권한 확인 중" />;
  }
  if (a.status === 'signed-out') {
    return (
      <Frame title="연구관리 통합대장" sub="기관 Google 계정 로그인 필요 / 등록된 사용자만 이용 가능">
        <Button variant="primary" size="lg" className={s.google} onClick={() => void a.signIn()}>Google 계정으로 로그인</Button>
        {a.error && <div className={`${s.msg} ${s.err}`}>{a.error}</div>}
      </Frame>
    );
  }
  if (a.status === 'no-access') {
    return (
      <Frame title="접근 권한 없음" sub="허용목록 미등록 계정">
        <div className={`${s.msg} ${s.warn}`}>
          <span className={s.email}>{a.user?.email}</span>
          <br />관리자에게 권한 등록 요청 필요 / 등록 후 다시 확인
        </div>
        <Button onClick={() => void a.refreshAccess()}>다시 확인</Button>
        <Button variant="ghost" onClick={() => void a.signOut()}>다른 계정으로 로그인</Button>
      </Frame>
    );
  }
  if (a.status === 'error') {
    return (
      <Frame title="권한 확인 실패" sub="네트워크 또는 설정 확인 필요">
        <div className={`${s.msg} ${s.err}`}>{a.error}</div>
        <Button onClick={() => void a.refreshAccess()}>다시 시도</Button>
        <Button variant="ghost" onClick={() => void a.signOut()}>로그아웃</Button>
      </Frame>
    );
  }
  return <>{children}</>;
}

/** 화면 단위 권한 (예: 관리 화면은 관리자만) */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { role: mine } = useAuth();
  const rank: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };
  if (!mine || rank[mine] < rank[role]) return <Navigate to="/" replace />;
  return <>{children}</>;
}
