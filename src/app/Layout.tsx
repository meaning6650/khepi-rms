import { NavLink, Link, Outlet } from 'react-router-dom';
import s from './Layout.module.css';
import { Button, useToast } from '../components';
import { useAuth } from './auth';
import { ROLE_LABEL } from '../data/access';

const MENU = [
  { to: '/projects', label: '연구관리 현황' },
  { to: '/committee', label: '심의위원회 현황' },
  { to: '/regulations', label: '규정 기준' },
  { to: '/flow', label: '진행 프로세스' },
];

export function Layout() {
  const toast = useToast();
  const { user, role, signOut } = useAuth();
  return (
    <div className={s.shell}>
      <header className={s.top}>
        <Link to="/" className={s.brand} aria-label="업무 선택으로 이동">
          <img src={`${import.meta.env.BASE_URL}ci/signature.png`} alt="한국건강증진개발원 KHEPI" />
          <span className={s.divider} />
          <span className={s.appName}>연구관리 통합대장</span>
        </Link>
        <nav className={s.nav}>
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => (isActive ? s.active : undefined)}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className={s.right}>
          <span className={s.user} title={user?.email ?? ''}>
            <b>{user?.displayName || user?.email}</b> {role ? ROLE_LABEL[role] : ''}
          </span>
          <Button variant="ghost" onClick={() => toast('변경내역: 3단계(데이터 연결) 이후 제공')}>변경내역</Button>
          <Button variant="primary" onClick={() => toast('엑셀 내보내기: 8단계 구현 예정')}>엑셀 내보내기</Button>
          <Button variant="ghost" onClick={() => void signOut()}>로그아웃</Button>
        </div>
      </header>
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}
