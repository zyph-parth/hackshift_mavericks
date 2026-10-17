import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// fileURLToPath decodes %20 etc., so paths with spaces don't create a stray URL-encoded folder
const FILE = process.env.DB_FILE ?? fileURLToPath(new URL('../data/launchloop.db', import.meta.url));
if (FILE !== ':memory:') mkdirSync(dirname(FILE), { recursive: true });
export const db = new DatabaseSync(FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const COLLECTIONS = [
  'users', 'jobs', 'tasks', 'applications', 'submissions', 'bookings', 'threads', 'messages',
  'notices', 'interviews', 'ventures', 'payments', 'saved', 'ai_cache', 'mentors', 'proposals',
] as const;
export type Collection = (typeof COLLECTIONS)[number];

for (const c of COLLECTIONS) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${c} (
    id TEXT PRIMARY KEY,
    owner TEXT,
    ref TEXT,
    created INTEGER NOT NULL,
    data TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS ${c}_owner ON ${c}(owner); CREATE INDEX IF NOT EXISTS ${c}_ref ON ${c}(ref);`);
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(ref)');

export interface Doc<T> {
  id: string;
  owner: string | null;
  ref: string | null;
  created: number;
  data: T;
}

interface Row {
  id: string;
  owner: string | null;
  ref: string | null;
  created: number;
  data: string;
}
const parse = <T>(r: Row | undefined): Doc<T> | undefined =>
  r && { id: r.id, owner: r.owner, ref: r.ref, created: r.created, data: JSON.parse(r.data) as T };

export const uid = (p = '') => p + randomUUID().replace(/-/g, '').slice(0, 14);

export function insert<T>(c: Collection, data: T, opts: { id?: string; owner?: string | null; ref?: string | null; created?: number } = {}): Doc<T> {
  const id = opts.id ?? uid(c[0] + '_');
  const created = opts.created ?? Date.now();
  db.prepare(`INSERT INTO ${c} (id, owner, ref, created, data) VALUES (?, ?, ?, ?, ?)`).run(id, opts.owner ?? null, opts.ref ?? null, created, JSON.stringify(data));
  return { id, owner: opts.owner ?? null, ref: opts.ref ?? null, created, data };
}

export function get<T>(c: Collection, id: string): Doc<T> | undefined {
  return parse<T>(db.prepare(`SELECT * FROM ${c} WHERE id = ?`).get(id) as Row | undefined);
}

export function update<T>(c: Collection, id: string, data: T) {
  db.prepare(`UPDATE ${c} SET data = ? WHERE id = ?`).run(JSON.stringify(data), id);
}

export function patch<T extends object>(c: Collection, id: string, changes: Partial<T>): Doc<T> | undefined {
  const cur = get<T>(c, id);
  if (!cur) return undefined;
  const next = { ...cur.data, ...changes };
  update(c, id, next);
  return { ...cur, data: next };
}

export function remove(c: Collection, id: string) {
  db.prepare(`DELETE FROM ${c} WHERE id = ?`).run(id);
}

export function list<T>(c: Collection, where: { owner?: string; ref?: string } = {}, order: 'asc' | 'desc' = 'desc'): Doc<T>[] {
  const clauses: string[] = [];
  const args: string[] = [];
  if (where.owner !== undefined) { clauses.push('owner = ?'); args.push(where.owner); }
  if (where.ref !== undefined) { clauses.push('ref = ?'); args.push(where.ref); }
  const sql = `SELECT * FROM ${c}${clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''} ORDER BY created ${order === 'asc' ? 'ASC' : 'DESC'}, rowid ${order === 'asc' ? 'ASC' : 'DESC'}`;
  return (db.prepare(sql).all(...args) as unknown as Row[]).map((r) => parse<T>(r)!);
}

export function count(c: Collection): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${c}`).get() as { n: number }).n;
}
