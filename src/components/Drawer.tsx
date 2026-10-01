import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Button } from './Button';

type Props = { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode };

export function Drawer({ open, title, onClose, children, footer }: Props) {
  if (!open) return null;
  return (
    <>
      <div className={s.drawerBack} onClick={onClose} />
      <aside className={s.drawer} role="dialog" aria-label={typeof title === 'string' ? title : undefined}>
        <div className={s.drawerHead}>
          <span>{title}</span>
          <Button variant="ghost" onClick={onClose} aria-label="닫기">닫기</Button>
        </div>
        <div className={s.drawerBody}>{children}</div>
        {footer && <div className={s.drawerFoot}>{footer}</div>}
      </aside>
    </>
  );
}
