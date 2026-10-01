import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import s from './Projects.module.css';
import {
  Badge, Button, DateInput, Drawer, Field, OXSelect, Select, Table, TextArea, TextInput, ui, useToast,
} from '../components';
import { PROJECTS, TYPE_LABEL, TYPE_SHORT, FILES_B20253, FILE_CATEGORIES, HISTORY_B20253, type DummyProject, type ProjectType } from '../dummy/projects';
import { REGIMES, regimeTitle } from '../domain/regimes';
import { ProgressTab } from './Progress';

const TYPE_COLOR: Record<ProjectType, string> = { A: 'var(--type-a)', B: 'var(--type-b)', C: 'var(--type-c)' };
const P = {
  doc: '(작성 필요) 예: 건강증진연구소-110(2025.10.10.)',
  date: '(작성 필요) 예: 20251010',
  period: '(작성 필요) 예: 20250101-20251231',
  money: '(작성 필요) 예: 50000000',
  text: '(작성 필요)',
};
const won = (n: number) => n.toLocaleString('ko-KR');

type Tab = '항목' | '진행 프로세스' | '근거 파일' | '수정 이력';

export function Projects() {
  const { id } = useParams();
  const [seg, setSeg] = useState<'과제별' | '진행현황'>('과제별');
  const [q, setQ] = useState('');
  const [type, setType] = useState<ProjectType | 'ALL'>('ALL');

  const counts = useMemo(() => {
    const c = { ALL: PROJECTS.length, A: 0, B: 0, C: 0 };
    PROJECTS.forEach((p) => c[p.type]++);
    return c;
  }, []);

  const list = PROJECTS.filter((p) => (type === 'ALL' || p.type === type))
    .filter((p) => !q || [p.id, p.title, p.pi, p.dept].some((v) => v.includes(q)))
    .filter((p) => seg === '과제별' || (p.nextTone && p.nextTone !== 'done'));
  if (seg === '진행현황') list.sort((a, b) => (a.nextDue ?? '9').localeCompare(b.nextDue ?? '9'));

  const current = PROJECTS.find((p) => p.id === (id ?? 'B-2025-3')) ?? PROJECTS[0];

  return (
    <div className={s.layout}>
      <aside className={s.side}>
        <div className={s.sideTop}>
          <div className={ui.segment} role="group">
            {(['과제별', '진행현황'] as const).map((v) => (
              <button key={v} aria-pressed={seg === v} onClick={() => setSeg(v)}>{v}</button>
            ))}
          </div>
          <input className={`${ui.input} ${s.search}`} placeholder="관리번호·과제명·연구책임자·부서 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className={s.chips}>
            {(['ALL', 'A', 'B', 'C'] as const).map((t) => (
              <button key={t} className={ui.chip} aria-pressed={type === t} onClick={() => setType(t)}>
                {t === 'ALL' ? '전체' : TYPE_SHORT[t]} <span className={ui.chipCount}>{counts[t]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={s.list}>
          {list.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className={`${s.item} ${p.id === current.id ? s.sel : ''}`}>
              <div className={s.itemTop}>
                <span className={s.pid} style={{ color: TYPE_COLOR[p.type] }}>{p.id}</span>
                {seg === '진행현황' && p.nextStatus
                  ? <Badge tone={p.nextTone === 'over' ? 'over' : p.nextTone === 'late' ? 'late' : 'neutral'}>{p.nextStatus}</Badge>
                  : <span style={{ fontSize: 12, color: 'var(--muted)' }}>{TYPE_LABEL[p.type]}</span>}
              </div>
              <div className={s.itemTitle}>{p.title}</div>
              <div className={s.itemMeta}>
                <span>연구책임자 {p.pi}</span>
                <span>{seg === '진행현황' ? `${p.nextStep} ${p.nextDue ?? ''}` : p.regime ? REGIMES[p.regime].label : '판별 제외(수탁)'}</span>
              </div>
            </Link>
          ))}
          {list.length === 0 && <div className={s.empty}>검색 결과 없음</div>}
        </div>
      </aside>
      <Detail key={current.id} p={current} />
    </div>
  );
}

function Detail({ p }: { p: DummyProject }) {
  const [tab, setTab] = useState<Tab>('항목');
  const [drawer, setDrawer] = useState(false);
  const toast = useToast();
  const reg = p.regime ? REGIMES[p.regime] : null;
  const mismatch = p.excelRegime && reg && p.excelRegime !== reg.label;

  return (
    <section className={s.detail}>
      <div className={`${ui.card} ${s.headCard}`}>
        <div className={s.badges}>
          <span className={s.idBadge} style={{ background: TYPE_COLOR[p.type] }}>{p.id}</span>
          <Badge tone="neutral">{TYPE_LABEL[p.type]}</Badge>
          {reg ? <Badge tone="done">{reg.label}</Badge> : <Badge tone="conditional">판별 제외</Badge>}
        </div>
        <h1 className={s.h1}>{p.title}</h1>
        <div className={s.info}>
          <div><div className={s.infoLabel}>연구책임자</div><div className={s.infoVal}>{p.pi}</div></div>
          <div><div className={s.infoLabel}>연구기관</div><div className={s.infoVal}>{p.org}</div></div>
          <div><div className={s.infoLabel}>담당부서</div><div className={s.infoVal}>{p.dept}</div></div>
          <div><div className={s.infoLabel}>연구기간</div><div className={s.infoVal}>{p.period}</div></div>
        </div>
        <div className={s.regBox}>
          <div>
            <div className={s.regLabel}>적용 규정</div>
            <div className={s.regVal}>{p.regime ? regimeTitle(p.regime) : '수탁연구 / 발주처 계약조건 (제27조)'}</div>
          </div>
          <div>
            <div className={s.regLabel}>판단 근거</div>
            <div className={s.regVal}>{p.regimeBasis}</div>
          </div>
          <div>
            <div className={s.regLabel}>주요 기한</div>
            <div className={s.regVal}>
              {p.id === 'B-2025-3' ? (
                <ul><li>최종보고서 2026.02.06.</li><li>결과 공표 2026.05.06.</li><li>점검표 2026.06.30.</li></ul>
              ) : p.nextDue ? `${p.nextStep} ${p.nextDue}` : '-'}
            </div>
          </div>
        </div>
        {mismatch && (
          <div className={`${ui.notice} ${s.warn}`}>
            엑셀 표기 {p.excelRegime} / 판단 기준 상이, 확인 필요
          </div>
        )}
        <div className={ui.tabs} role="tablist">
          {(['항목', '진행 프로세스', '근거 파일', '수정 이력'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {tab === '항목' && (
        <>
          <ItemsTab p={p} />
          <div className={s.saveBar}>
            <Button onClick={() => setDrawer(true)}>변경내역 확인</Button>
            <Button variant="primary" onClick={() => toast('저장: 5단계(데이터 연결) 이후 제공')}>저장</Button>
          </div>
        </>
      )}
      {tab === '진행 프로세스' && <ProgressTab p={p} />}
      {tab === '근거 파일' && <FilesTab p={p} />}
      {tab === '수정 이력' && (
        <div style={{ marginTop: 16 }}>
          <Table
            rows={p.id === 'B-2025-3' ? HISTORY_B20253 : []}
            rowKey={(r) => r.at + r.field}
            columns={[
              { key: 'at', header: '일시', render: (r) => r.at, width: 150 },
              { key: 'by', header: '수정자', render: (r) => r.by, width: 90, align: 'center' },
              { key: 'field', header: '항목', render: (r) => r.field, width: 180 },
              { key: 'b', header: '변경 전', render: (r) => r.before || <span style={{ color: 'var(--muted)' }}>(빈 칸)</span> },
              { key: 'a', header: '변경 후', render: (r) => r.after },
            ]}
          />
        </div>
      )}

      <Drawer
        open={drawer}
        title="변경내역 (저장 전)"
        onClose={() => setDrawer(false)}
        footer={<><Button onClick={() => setDrawer(false)}>닫기</Button><Button variant="primary">저장</Button></>}
      >
        <Table
          rows={[{ f: '최종보고서 제출일', b: '', a: '2026.02.20.' }, { f: '연구기간(최종)', b: '2025.04.07.~2025.10.31.', a: '2025.04.07.~2025.11.06.' }]}
          rowKey={(r) => r.f}
          columns={[
            { key: 'f', header: '항목', render: (r) => r.f },
            { key: 'c', header: '변경', render: (r) => <><div style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>{r.b || '(빈 칸)'}</div><div>{r.a}</div></> },
            { key: 'u', header: '', render: () => <Button variant="ghost">되돌리기</Button>, width: 90 },
          ]}
        />
      </Drawer>
    </section>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`${ui.card} ${s.section}`}>
      <div className={s.sectionTitle}><span className={s.sectionBar} style={{ background: color }} />{title}</div>
      {children}
    </div>
  );
}

function ItemsTab({ p }: { p: DummyProject }) {
  const b = p.id === 'B-2025-3';
  return (
    <>
      <Section title="기본정보" color="var(--silver)">
        <Field label="연구과제명"><TextInput defaultValue={p.title} /></Field>
        <Field label="연구기간(최초)"><TextInput defaultValue={p.period} placeholder={P.period} /></Field>
        <Field label="연구기간(최종)"><TextInput defaultValue={p.period} placeholder={P.period} /></Field>
        <Field label="연구비(원)" hint={`${won(p.budget)}원`}><TextInput inputMode="numeric" defaultValue={String(p.budget)} placeholder={P.money} /></Field>
        <Field label="적용 규정" auto><TextInput readOnly value={p.regime ? regimeTitle(p.regime) : '판별 제외(수탁연구)'} /></Field>
      </Section>
      <Section title="심의" color="var(--green)">
        <Field label="심의명"><Select options={['심의O', '심의X']} defaultValue={p.reviewName} /></Field>
        <Field label="심의승인번호" hint="YYMM-NN 형식"><TextInput defaultValue={p.reviewNo} placeholder="(작성 필요) 예: 2503-04" /></Field>
        <Field label="심의 개최연월"><TextInput defaultValue={p.reviewYm} placeholder="(작성 필요) 예: 2025.03." /></Field>
        <Field label="심의결과"><Select options={['승인', '조건부 승인', '보완 후 재심의', '반려']} defaultValue={p.reviewResult} /></Field>
        {p.type === 'B' && <Field label="계약공람"><OXSelect defaultValue={b ? 'O' : ''} /></Field>}
      </Section>
      <Section title="진행" color="var(--black)">
        <Field label="착수보고"><TextInput defaultValue={b ? '건강증진연구소-512(2025.04.30.)' : ''} placeholder={P.doc} /></Field>
        <Field label="중간보고"><TextInput placeholder={P.doc} /></Field>
        <Field label="연구과제 변경/통보"><OXSelect /></Field>
        <Field label="변경 근거"><TextInput placeholder={P.doc} /></Field>
        <Field label="종료보고"><TextInput defaultValue={b ? '2025.11.04.' : ''} placeholder={P.doc} /></Field>
      </Section>
      <Section title="평가·결과물" color="var(--orange)">
        <Field label="평가일"><DateInput defaultValue={b ? '2025.10.28.' : ''} /></Field>
        <Field label="평가위원 점수" hint={b ? '평가위원 3명 / 평균 81.3점 / 적격' : undefined}><TextInput defaultValue={b ? '82, 79, 83' : ''} placeholder="(작성 필요) 예: 82, 79, 83" /></Field>
        <Field label="평균점수" auto><TextInput readOnly value={b ? '81.3' : ''} /></Field>
        <Field label="연구과제 평가결과서"><TextInput defaultValue={b ? '건강증진연구소-1204(2025.12.03.)' : ''} placeholder={P.doc} /></Field>
        <Field label="최종보고서"><OXSelect defaultValue={b ? 'O' : ''} /></Field>
        <Field label="최종보고서 제출 지연 신청"><OXSelect defaultValue={b ? 'X' : ''} /></Field>
        <Field label="최종보고서 제출 공문번호"><TextInput placeholder={P.doc} /></Field>
        <Field label="최종보고서 제출일"><DateInput defaultValue={b ? '2026.02.20.' : ''} /></Field>
        <Field label="평가의견 반영 여부"><TextArea placeholder={P.text} /></Field>
      </Section>
      <Section title="공개" color="var(--gold)">
        <Field label="공개 여부"><Select options={['공개', '비공개', '부분공개']} defaultValue={b ? '공개' : ''} /></Field>
        <Field label="홈페이지 게시 기한" auto><TextInput readOnly value={b ? '2026.05.06.' : ''} /></Field>
        <Field label="홈페이지 등록일"><DateInput defaultValue={b ? '2026.04.28.' : ''} /></Field>
        <Field label="최종보고서(공표)"><OXSelect defaultValue={b ? 'O' : ''} /></Field>
        <Field label="연구결과 평가서"><OXSelect defaultValue={b ? 'O' : ''} /></Field>
        <Field label="연구정보요약서"><OXSelect defaultValue={b ? 'O' : ''} /></Field>
        <Field label="연구활용 결과보고서"><OXSelect /></Field>
        <Field label="비공개요약서"><OXSelect defaultValue={b ? '해당없음' : ''} /></Field>
        <Field label="비공개 사유"><TextArea placeholder={P.text} /></Field>
      </Section>
      <Section title="추가 항목" color="var(--line)">
        <Field label="국회요구자료 제출 여부"><OXSelect /></Field>
      </Section>
    </>
  );
}

function FilesTab({ p }: { p: DummyProject }) {
  const files = p.id === 'B-2025-3' ? FILES_B20253 : [];
  return (
    <div className={ui.card} style={{ marginTop: 16 }}>
      {FILE_CATEGORIES.map((c) => {
        const fs = files.filter((f) => f.category === c);
        return (
          <div key={c} className={s.fileGroup}>
            <b style={{ paddingTop: 4 }}>{c}</b>
            <div>
              {fs.length === 0 && <div className={s.fileName} style={{ color: 'var(--muted)' }}>파일 없음</div>}
              {fs.map((f) => (
                <div key={f.name} className={s.fileName}><a href="#" onClick={(e) => e.preventDefault()}>{f.name}</a><span>{f.by} / {f.at}</span></div>
              ))}
            </div>
            <Button>업로드</Button>
          </div>
        );
      })}
      <div style={{ padding: '12px 24px', fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--line-soft)' }}>
        파일명 규칙: {p.id}_분류_YYYYMMDD_원본명 / pdf·hwp·hwpx·docx·xlsx·png·jpg, 20MB 이하
      </div>
    </div>
  );
}
