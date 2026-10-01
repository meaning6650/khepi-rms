import type { InputHTMLAttributes } from 'react';
import s from './ui.module.css';

/** 날짜 입력: 20211210 / 2021.12.10 / 21.12.10 / 2021-12-10 허용. 정규화는 domain/fields.ts (2단계) */
export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" inputMode="numeric" className={s.input} placeholder="(작성 필요) 예: 20251010" {...props} />;
}
