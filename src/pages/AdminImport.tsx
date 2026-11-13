import { useRef, useState } from 'react';
import { Badge, Button, Table, ui, useToast } from '../components';
import { useAuth } from '../app/auth';
import {
  countExisting, importMigration, parseMigrationFile, summarize, type MigrationFile, type MigrationSummary,
} from '../data/importMigration';

type Existing = { projects: number; committees: number };

/** 관리 화면: 이관 데이터 가져오기 (migration-preview.json) */
export function AdminImport() {
  const { user } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [data, setData] = useState<MigrationFile | null>(null);
  const [sum, setSum] = useState<MigrationSummary | null>(null);
  const [existing, setExisting] = useState<Existing | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState('');

  const reset = () => {
    setData(null); setSum(null); setExisting(null); setConfirmOverwrite(false); setError(''); setProgress(''); setDone('');
  };

  const onFile = async (f?: File) => {
    reset();
    if (!f) return;
    setFileName(f.name);
    try {
      const parsed = parseMigrationFile(await f.text());
      setData(parsed);
      setSum(summarize(parsed));
      setExisting(await countExisting());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const hasExisting = !!existing && existing.projects + existing.committees > 0;
  const canSave = !!data && !busy && !done && (!hasExisting || confirmOverwrite);

  const save = async () => {
    if (!data || !sum || !user?.email) return;
    if (!window.confirm(`과제 ${sum.projects.total}건, 위원회 자료 포함 총 ${sum.totalWrites}건 저장`)) return;
    setBusy(true);
    try {
      const n = await importMigration(data, user.email, (d, t) => setProgress(`저장 중 ${d} / ${t}건`));
      setDone(`저장 완료 ${n}건 (${new Date().toLocaleString('ko-KR')})`);
      toast(`이관 저장 완료 / ${n}건`);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code === 'permission-denied' ? '권한 없음 / 관리자 계정 확인 필요' : `저장 실패 / ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>이관 데이터 가져오기</h2>
      <div className={ui.card} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          엑셀 이관 미리보기 파일(migration-preview.json) 선택 / 건수·확인 필요 항목 검토 후 저장 / 관리자 전용
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button onClick={() => input.current?.click()} disabled={busy}>파일 선택</Button>
          <span style={{ fontSize: 13 }}>{fileName || '선택한 파일 없음'}</span>
          <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        {error && <div className={ui.notice} style={{ background: 'var(--red-soft)', color: 'var(--red-text)' }}>{error}</div>}

        {sum && (
          <>
            <Table
              rows={[
                { k: '과제', v: `${sum.projects.total}건 (내부 ${sum.projects.A} / 위탁 ${sum.projects.B} / 수탁 ${sum.projects.C})` },
                { k: '연구심의위원회', v: `위원 ${sum.committees.research.members}명(익명화) / 회의 ${sum.committees.research.meetings}건 / 심의 ${sum.committees.research.reviews}건` },
                { k: '기관생명윤리위원회', v: `위원 ${sum.committees.irb.members}명(익명화) / 회의 ${sum.committees.irb.meetings}건 / 심의 ${sum.committees.irb.reviews}건` },
                { k: '불일치 기록(legacyNote)', v: `${sum.legacyNotes}건` },
                { k: '확인 필요 표시', v: `${sum.reviewFlags.length}건` },
                { k: '저장 문서 수', v: `${sum.totalWrites}건` },
                { k: '파일 생성 일시', v: `${sum.generatedAt.replace('T', ' ').slice(0, 16)}${sum.draft ? ' / 초안' : ''}` },
              ]}
              rowKey={(r) => r.k}
              columns={[
                { key: 'k', header: '구분', render: (r) => r.k, width: 200 },
                { key: 'v', header: '내용', render: (r) => r.v },
              ]}
            />
            {sum.reviewFlags.length > 0 && (
              <Table
                rows={sum.reviewFlags}
                rowKey={(r) => r.id + r.field}
                columns={[
                  { key: 'id', header: '관리번호', render: (r) => r.id, width: 120, align: 'center' },
                  { key: 'f', header: '항목', render: (r) => r.field, width: 260 },
                  { key: 'm', header: '확인 필요', render: (r) => <Badge tone="late">{r.message}</Badge> },
                ]}
              />
            )}
            {existing && (hasExisting ? (
              <div className={ui.notice}>
                기존 데이터 있음 / 과제 {existing.projects}건, 위원회 자료 {existing.committees}건
                <br />같은 관리번호·문서는 파일 내용으로 바뀜 / 저장 전 확인 필요
                <label style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={confirmOverwrite} onChange={(e) => setConfirmOverwrite(e.target.checked)} />
                  기존 데이터 덮어쓰기 확인
                </label>
              </div>
            ) : (
              <div className={ui.notice} style={{ background: 'var(--green-soft)', color: 'var(--green-dark)' }}>기존 데이터 없음 / 새로 저장</div>
            ))}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
              {progress && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{progress}</span>}
              {done && <Badge tone="done">{done}</Badge>}
              <Button onClick={reset} disabled={busy}>취소</Button>
              <Button variant="primary" disabled={!canSave} onClick={() => void save()}>저장</Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
