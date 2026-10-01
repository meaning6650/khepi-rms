import type { SelectHTMLAttributes } from 'react';
import s from './ui.module.css';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[]; placeholder?: string };

export function Select({ options, placeholder = '선택', ...rest }: Props) {
  return (
    <select className={`${s.input} ${s.select}`} {...rest}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

/** O / X / 해당없음 드롭다운 */
export const OX_OPTIONS = ['O', 'X', '해당없음'] as const;
export function OXSelect(props: Omit<Props, 'options'>) {
  return <Select options={OX_OPTIONS} {...props} />;
}
