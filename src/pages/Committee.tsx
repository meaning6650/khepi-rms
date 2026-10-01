import { useState } from 'react';
import { useAuth } from '../app/auth';
import s from './Committee.module.css';
import { Badge, Button, Field, OXSelect, Select, Table, TextInput, ui, useToast, type BadgeTone } from '../components';
import { MEETINGS, MEMBERS, REVIEWS, type DummyMember } from '../dummy/committee';

type Cmt = 'research' | 'irb';
type Sub = '위원 명단 및 인적정보' | '회의 개최 현황' | '심의결과';
const TODAY = '2026.09.30.';
const CMT_LABEL: Record<Cmt, string> = { research: '연구심의위원회', irb: '기관생명윤리위원회' };

/** 임기 만료 3개월 이내 여부 (더미: 문자열 비교) */
const expiresSoon = (end: string) => end >= TODAY && end <= '2026.12.31.';
const birthMasked = (b: string) => `${b.slice(0, 2)}****`;
const birthFull = (b: string) => `19${b.slice(0, 2)}.${b.slice(2, 4)}.${b.slice(4, 6)}.`;
/** 만 나이 (기준일 2026.09.30.) — 2단계 fields.ts 로 이동 */
const ageOn = (b: string) => 2026 - (1900 + Number(b.slice(0, 2))) - (b.slice(2) > '0930' ? 1 : 0);
const resultTone = (r: string): BadgeTone => (r === '반려' ? 'over' : r.includes('재심의') ? 'late' : 'done');

export function Committee() {
  const [cmt, setCmt] = useState<Cmt>('research');
  const [sub, setSub] = useState<Sub>('위원 명단 및 인적정보');
  const [mask, setMask] = useState(true);
  const [sel, setSel] = useState<DummyMember | null>(MEMBERS.research[0]);
  const isAdmin = useAuth().role === 'admin';
  const toast = useToast();

  const members = MEMBERS[cmt];
  const meetings = MEETINGS[cmt];
  const external = members.filter((m) => m.external).length;
  const soon = members.filter((m) => expiresSoon(m.termEnd)).length;

  const switchCmt = (c: Cmt) => { setCmt(c); setSel(MEMBERS[c][0]); };

  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <h1 className={s.h1}>심의위원회 현황</h1>
        <div className={`${ui.segment} ${s.cmt}`} role="group">
          {(['research', 'irb'] as Cmt[]).map((c) => (
            <button key={c} aria-pressed={cmt === c} onClick={() => switchCmt(c)}>{CMT_LABEL[c]}</button>
          ))}
        </div>
      </div>

      <div className={s.cards}>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>현 위원</div><div className={s.sumNum}>{members.length}</div><div className={s.sumSub}>위원장 포함</div></div>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>외부위원</div><div className={s.sumNum}>{external}</div><div className={s.sumSub}>내부 {members.length - external}</div></div>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>임기 만료 예정 (3개월 이내)</div><div className={s.sumNum} style={{ color: soon ? 'var(--red-text)' : undefined }}>{soon}</div><div className={s.sumSub}>기준일 {TODAY}</div></div>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>최근 회의</div><div className={s.sumNum} style={{ fontSize: 18, paddingTop: 4 }}>{meetings[0]?.date ?? '-'}</div><div className={s.sumSub}>{meetings[0] ? `${meetings[0].mode} / 안건 ${meetings[0].agendaCount}건` : ''}</div></div>
      </div>

      <div className={s.bar}>
        <div className={ui.tabs} role="tablist" style={{ borderBottom: 0 }}>
          {(['위원 명단 및 인적정보', '회의 개최 현황', '심의결과'] as Sub[]).map((t) => (
            <button key={t} role="tab" aria-selected={sub === t} onClick={() => setSub(t)}>{t}</button>
          ))}
        </div>
        {sub === '위원 명단 및 인적정보' && (
          <label className={s.toggle} onClick={() => setMask((v) => (isAdmin ? !v : v))}>
            <span className={`${s.switch} ${mask ? s.on : ''}`} role="switch" aria-checked={mask} />
            개인정보 가림
          </label>
        )}
      </div>

      {sub === '위원 명단 및 인적정보' && (
        <div className={s.body}>
          <Table
            rows={members}
            rowKey={(m) => m.id}
            selectedKey={sel?.id}
            onRowClick={setSel}
            columns={[
              { key: 'role', header: '구분', render: (m) => m.role, width: 70, align: 'center' },
              { key: 'name', header: '성명', render: (m) => (mask ? m.nameMasked : m.name), width: 80, align: 'center' },
              { key: 'birth', header: '출생년월', render: (m) => (mask ? birthMasked(m.birth) : birthFull(m.birth)), width: 100, align: 'center' },
              { key: 'org', header: '소속', render: (m) => <>{m.org}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.career}</div></> },
              { key: 'ext', header: '내·외부', render: (m) => (m.external ? '외부' : '내부'), width: 70, align: 'center' },
              { key: 'gender', header: '성별', render: (m) => m.gender, width: 56, align: 'center' },
              { key: 'term', header: '임기', render: (m) => <span className={expiresSoon(m.termEnd) ? s.expire : undefined}>{m.term}</span>, width: 200, align: 'center' },
            ]}
          />
          {sel && (
            <aside className={`${ui.card} ${s.panel}`}>
              <div className={s.panelHead}>
                <span>위원 정보 수정</span>
                {isAdmin && mask && <Button variant="ghost" onClick={() => setMask(false)}>보기</Button>}
              </div>
              <div className={s.panelBody}>
                <Field label="성명" auto={mask}><TextInput readOnly={mask} value={mask ? sel.nameMasked : sel.name} onChange={() => {}} /></Field>
                <Field label="출생년월" hint={mask ? undefined : `만 ${ageOn(sel.birth)}세 (기준일 ${TODAY})`}>
                  <TextInput readOnly={mask} value={mask ? birthMasked(sel.birth) : birthFull(sel.birth)} onChange={() => {}} />
                </Field>
                <Field label="구분"><Select options={['위원장', '위원', '간사']} value={sel.role} onChange={() => {}} /></Field>
                <Field label="소속"><TextInput value={sel.org} onChange={() => {}} /></Field>
                <Field label="경력"><TextInput value={sel.career} onChange={() => {}} /></Field>
                <Field label="임기"><TextInput value={sel.term} placeholder="(작성 필요) 예: 20250101-20261231" onChange={() => {}} /></Field>
                <Field label="위촉권자"><TextInput value={sel.appointer} onChange={() => {}} /></Field>
                <Field label="정당가입 여부"><OXSelect value={sel.partyMember} onChange={() => {}} /></Field>
              </div>
              <div className={s.panelFoot}>
                <Button onClick={() => setSel(null)}>닫기</Button>
                <Button variant="primary" onClick={() => toast('저장: 7단계(데이터 연결) 이후 제공')}>저장</Button>
              </div>
            </aside>
          )}
        </div>
      )}

      {sub === '회의 개최 현황' && (
        <Table
          rows={meetings}
          rowKey={(m) => m.id}
          columns={[
            { key: 'date', header: '개최일', render: (m) => m.date, width: 110, align: 'center' },
            { key: 'mode', header: '방식', render: (m) => m.mode, width: 70, align: 'center' },
            { key: 'att', header: '재적/출석', render: (m) => `${m.enrolled} / ${m.attended}`, width: 100, align: 'center' },
            { key: 'cnt', header: '안건 수', render: (m) => m.agendaCount, width: 80, align: 'center' },
            { key: 'ag', header: '안건', render: (m) => m.agendas },
            { key: 'res', header: '결과', render: (m) => m.results, width: 200 },
            { key: 'doc', header: '공문번호', render: (m) => m.docNo, width: 170 },
          ]}
        />
      )}

      {sub === '심의결과' && (
        <Table
          rows={REVIEWS[cmt]}
          rowKey={(r) => r.id}
          columns={[
            { key: 'mt', header: '회의일', render: (r) => r.meeting, width: 110, align: 'center' },
            { key: 'kind', header: '구분', render: (r) => r.kind, width: 100, align: 'center' },
            { key: 'title', header: '연구과제명', render: (r) => r.projectTitle },
            { key: 'pi', header: '연구책임자', render: (r) => r.pi, width: 100, align: 'center' },
            { key: 'res', header: '심의결과', render: (r) => <Badge tone={resultTone(r.result)}>{r.result}</Badge>, width: 130, align: 'center' },
          ]}
        />
      )}
    </div>
  );
}
