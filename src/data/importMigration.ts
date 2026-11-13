/**
 * 이관 데이터 가져오기 (관리자 전용, 2026.11.13. 안 1 채택)
 * scripts/migrate-from-legacy.ts 가 만든 migration-preview.json 을 읽어 Firestore 에 저장
 * - 저장 전: 형식 검사·건수 요약·기존 데이터 존재 확인
 * - 문서 ID 고정 (과제: 관리번호 / 위원: m001… / 회의: 개최일 / 심의: r0001…) → 다시 가져와도 중복 없음
 */
import { collection, doc, getCountFromServer, writeBatch, type DocumentData } from 'firebase/firestore';
import { firebase } from './firebase';

export type CommitteeKey = 'research' | 'irb';

export type MigrationFile = {
  generatedAt: string;
  baseDate?: string;
  draft?: boolean;
  projects: Record<string, DocumentData>;
  committees: Record<CommitteeKey, { members: DocumentData[]; meetings: DocumentData[]; reviews: DocumentData[] }>;
};

export type MigrationSummary = {
  generatedAt: string;
  draft: boolean;
  projects: { total: number; A: number; B: number; C: number };
  legacyNotes: number;
  reviewFlags: { id: string; field: string; message: string }[];
  committees: Record<CommitteeKey, { members: number; meetings: number; reviews: number }>;
  totalWrites: number;
};

const ID_RE = /^[ABC]-\d{4}-\d+$/;

/** 형식 검사 — 오류 문구는 원인·조치만 */
export function parseMigrationFile(textContent: string): MigrationFile {
  let j: unknown;
  try {
    j = JSON.parse(textContent);
  } catch {
    throw new Error('JSON 형식 오류 / migration-preview.json 파일 확인 필요');
  }
  const f = j as Partial<MigrationFile>;
  if (!f || typeof f !== 'object' || !f.projects || typeof f.projects !== 'object' || !f.committees) {
    throw new Error('이관 미리보기 파일 아님 / projects·committees 항목 없음');
  }
  const bad = Object.keys(f.projects).filter((id) => !ID_RE.test(id));
  if (bad.length) throw new Error(`관리번호 형식 오류 ${bad.length}건 / 예: ${bad.slice(0, 3).join(', ')}`);
  for (const c of ['research', 'irb'] as const) {
    const cm = f.committees[c];
    if (!cm || !Array.isArray(cm.members) || !Array.isArray(cm.meetings) || !Array.isArray(cm.reviews)) {
      throw new Error(`위원회 자료 형식 오류 (${c}) / 파일 확인 필요`);
    }
  }
  return f as MigrationFile;
}

export function summarize(f: MigrationFile): MigrationSummary {
  const list = Object.entries(f.projects);
  const by = (t: string) => list.filter(([id]) => id[0] === t).length;
  const committees = Object.fromEntries((['research', 'irb'] as const).map((c) => [c, {
    members: f.committees[c].members.length, meetings: f.committees[c].meetings.length, reviews: f.committees[c].reviews.length,
  }])) as MigrationSummary['committees'];
  const cmCount = Object.values(committees).reduce((n, c) => n + c.members + c.meetings + c.reviews, 0);
  return {
    generatedAt: f.generatedAt,
    draft: !!f.draft,
    projects: { total: list.length, A: by('A'), B: by('B'), C: by('C') },
    legacyNotes: list.filter(([, d]) => typeof d.legacyNote === 'string' && d.legacyNote.trim()).length,
    reviewFlags: list.flatMap(([id, d]) => ((d.reviewFlags as { field: string; message: string }[] | undefined) ?? []).map((r) => ({ id, ...r }))),
    committees,
    totalWrites: list.length + cmCount + 2,
  };
}

/** 기존 데이터 건수 (과제·위원회) */
export async function countExisting(): Promise<{ projects: number; committees: number }> {
  const db = firebase().db;
  const projects = (await getCountFromServer(collection(db, 'projects'))).data().count;
  let committees = 0;
  for (const c of ['research', 'irb']) {
    for (const sub of ['members', 'meetings', 'reviews']) {
      committees += (await getCountFromServer(collection(db, 'committees', c, sub))).data().count;
    }
  }
  return { projects, committees };
}

/** 메모리 안 문서 목록 → 400건 단위 일괄 저장 */
export async function importMigration(f: MigrationFile, byEmail: string, onProgress?: (done: number, total: number) => void): Promise<number> {
  const db = firebase().db;
  const by = byEmail.trim().toLowerCase();
  const at = new Date().toISOString();
  const stamp = { importedAt: at, importedBy: by, updatedAt: at, updatedBy: by };
  const writes: { path: string[]; data: DocumentData }[] = [];

  for (const [id, d] of Object.entries(f.projects)) writes.push({ path: ['projects', id], data: { ...d, ...stamp } });
  for (const c of ['research', 'irb'] as const) {
    writes.push({ path: ['committees', c], data: { name: c === 'research' ? '연구심의위원회' : '기관생명윤리위원회', ...stamp } });
    f.committees[c].members.forEach((m, i) => writes.push({ path: ['committees', c, 'members', `m${String(i + 1).padStart(3, '0')}`], data: { ...m, ...stamp } }));
    const seen = new Map<string, number>();
    f.committees[c].meetings.forEach((m) => {
      const base = String(m.date ?? 'unknown');
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      writes.push({ path: ['committees', c, 'meetings', n === 1 ? base : `${base}-${n}`], data: { ...m, ...stamp } });
    });
    f.committees[c].reviews.forEach((r, i) => writes.push({ path: ['committees', c, 'reviews', `r${String(i + 1).padStart(4, '0')}`], data: { ...r, ...stamp } }));
  }

  let done = 0;
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    for (const w of writes.slice(i, i + 400)) {
      const [first, ...rest] = w.path;
      batch.set(doc(db, first, ...rest), w.data);
    }
    await batch.commit();
    done += Math.min(400, writes.length - i);
    onProgress?.(done, writes.length);
  }
  return done;
}
