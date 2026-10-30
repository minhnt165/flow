// Chạy toàn bộ supabase/migrations trên Postgres nhúng (PGlite) với một lớp giả lập tối thiểu của Supabase:
// role anon/authenticated/service_role, schema auth với auth.users và auth.uid().
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

const BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type Db = PGlite;

export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    // Migration phụ thuộc hạ tầng Supabase thật (pg_cron, vault) đánh dấu bỏ qua.
    if (sql.includes("-- pglite:skip")) continue;
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`Migration ${file} lỗi: ${(e as Error).message}`);
    }
  }
  return db;
}

/** Ghim "bây giờ" cho mọi view/function dùng fn_now(). */
export async function setNow(db: Db, iso: string) {
  await db.query("select set_config('app.now', $1, false)", [iso]);
}

export async function createUser(db: Db, email: string, meta: Record<string, unknown> = {}) {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return rows[0].id;
}

type Row = Record<string, unknown>;

async function withRole<T>(db: Db, role: string, uid: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Chạy câu lệnh với quyền một người dùng đã đăng nhập (RLS có hiệu lực). */
export function asUser(db: Db, uid: string) {
  return <T extends Row = Row>(sql: string, params: unknown[] = []) =>
    withRole(db, "authenticated", uid, async () => (await db.query<T>(sql, params)).rows);
}

/** Chạy với service_role (như Edge Functions). */
export function asService(db: Db) {
  return <T extends Row = Row>(sql: string, params: unknown[] = []) =>
    withRole(db, "service_role", null, async () => (await db.query<T>(sql, params)).rows);
}

export const num = (v: unknown) => Number(v);
