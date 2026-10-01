import type { InputHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

type FieldProps = { label: ReactNode; auto?: boolean; hint?: ReactNode; children: ReactNode };

/** 라벨 220px + 입력 한 행 */
export function Field({ label, auto, hint, children }: FieldProps) {
  return (
    <div className={s.field}>
      <div className={s.fieldLabel}>
        {label}
        {auto && <span className={s.auto}>자동계산</span>}
      </div>
      <div>
        {children}
        {hint && <div className={s.fieldHint}>{hint}</div>}
      </div>
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={s.input} {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={s.input} {...props} />;
}
