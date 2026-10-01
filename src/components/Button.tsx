import type { ButtonHTMLAttributes } from 'react';
import s from './ui.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'md' | 'lg';
};

export function Button({ variant = 'default', size = 'md', className, ...rest }: Props) {
  const cls = [s.btn, variant === 'primary' && s.primary, variant === 'ghost' && s.ghost, size === 'lg' && s.lg, className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={cls} {...rest} />;
}
