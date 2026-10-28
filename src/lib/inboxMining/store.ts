import { getDb } from '@/lib/db';
import type { DocRead, Facts, FeedbackEntry, InboxClass, LinkRead, MatchResult, Suggestion, ThreadMemoryRow } from './types';

// Suggestion log only: no email bodies or attachment bytes are stored.
// Current GHL values are always fetched live when an item is displayed.

export async function ensureTables(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_runs (
      id             SERIAL PRIMARY KEY,
      mailbox        VARCHAR(200) NOT NULL,
      window_start   TIMESTAMPTZ NOT NULL,
      window_end     TIMESTAMPTZ NOT NULL,
      started_at     TIMESTAMPTZ DEFAULT NOW(),
      finished_at    TIMESTAMPTZ,
      started_by     VARCHAR(200),
      messages_seen  INTEGER DEFAULT 0,
      items_written  INTEGER DEFAULT 0,
      errors         JSONB DEFAULT '[]'::jsonb
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_items (
      id            SERIAL PRIMARY KEY,
      run_id        INTEGER REFERENCES inbox_runs(id),
      mailbox       VARCHAR(200) NOT NULL,
      message_id    VARCHAR(100) NOT NULL,
      thread_id     VARCHAR(100) NOT NULL,
      received_at   TIMESTAMPTZ NOT NULL,
      direction     VARCHAR(10) NOT NULL,
      from_addr     TEXT,
      to_addr       TEXT,
      subject       TEXT,
      cls           VARCHAR(40) NOT NULL,
      cls_rule      TEXT,
      facts         JSONB,
      docs          JSONB,
      links         JSONB,
      match         JSONB,
      suggestions   JSONB,
      drive_target  TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (mailbox, message_id)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inbox_items_received ON inbox_items(received_at DESC)`;
  await sql`ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb`;
  // Set once, the first time an item has a suggestion. Items read before this column existed get their last re-read time.
  await sql`ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS suggested_at TIMESTAMPTZ`;
  await sql`
    UPDATE inbox_items SET suggested_at = created_at
    WHERE suggested_at IS NULL AND jsonb_array_length(COALESCE(suggestions, '[]'::jsonb)) > 0`;
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_thread_memory (
      mailbox             VARCHAR(200) NOT NULL,
      thread_id           VARCHAR(100) NOT NULL,
      first_subject       TEXT,
      first_message_at    TIMESTAMPTZ,
      first_sender        TEXT,
      opportunity_id      VARCHAR(100),
      property_record_id  VARCHAR(100),
      confirmed_by        VARCHAR(200),
      confirmed_at        TIMESTAMPTZ,
      active              BOOLEAN DEFAULT TRUE,
      PRIMARY KEY (mailbox, thread_id)
    )`;
}

export async function startRun(mailbox: string, start: Date, end: Date, by: string | null): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO inbox_runs (mailbox, window_start, window_end, started_by)
    VALUES (${mailbox}, ${start.toISOString()}, ${end.toISOString()}, ${by})
    RETURNING id`;
  return rows[0].id as number;
}

export async function getRun(id: number): Promise<{ id: number; mailbox: string } | null> {
  const sql = getDb();
  const rows = await sql`SELECT id, mailbox FROM inbox_runs WHERE id = ${id}`;
  return (rows[0] as { id: number; mailbox: string }) || null;
}

/** Called after every chunk; counts and errors accumulate, finished_at is set on the last chunk. */
export async function updateRun(id: number, seen: number, written: number, errors: string[], done: boolean): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE inbox_runs SET messages_seen = ${seen}, items_written = items_written + ${written},
      errors = errors || ${JSON.stringify(errors)}::jsonb,
      finished_at = CASE WHEN ${done}::boolean THEN NOW() ELSE finished_at END
    WHERE id = ${id}`;
}

/** With runId (re-read), only messages already re-read in that run count as done. */
export async function existingMessageIds(mailbox: string, ids: string[], runId: number | null = null): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const sql = getDb();
  const rows = runId === null
    ? await sql`SELECT message_id FROM inbox_items WHERE mailbox = ${mailbox} AND message_id = ANY(${ids})`
    : await sql`SELECT message_id FROM inbox_items WHERE mailbox = ${mailbox} AND message_id = ANY(${ids}) AND run_id = ${runId}`;
  return new Set(rows.map((r) => r.message_id as string));
}

export interface ItemInput {
  runId: number;
  mailbox: string;
  messageId: string;
  threadId: string;
  receivedAt: Date;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  cls: InboxClass;
  clsRule: string;
  facts: Facts;
  docs: DocRead[];
  links: LinkRead[];
  match: MatchResult;
  suggestions: Suggestion[];
  driveTarget: string | null;
}

export async function upsertItem(i: ItemInput): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO inbox_items (run_id, mailbox, message_id, thread_id, received_at, direction, from_addr, to_addr, subject,
      cls, cls_rule, facts, docs, links, match, suggestions, drive_target, suggested_at)
    VALUES (${i.runId}, ${i.mailbox}, ${i.messageId}, ${i.threadId}, ${i.receivedAt.toISOString()}, ${i.direction},
      ${i.from}, ${i.to}, ${i.subject}, ${i.cls}, ${i.clsRule}, ${JSON.stringify(i.facts)}::jsonb,
      ${JSON.stringify(i.docs)}::jsonb, ${JSON.stringify(i.links)}::jsonb, ${JSON.stringify(i.match)}::jsonb,
      ${JSON.stringify(i.suggestions)}::jsonb, ${i.driveTarget}, ${i.suggestions.length ? new Date().toISOString() : null})
    ON CONFLICT (mailbox, message_id) DO UPDATE SET
      run_id = EXCLUDED.run_id, cls = EXCLUDED.cls, cls_rule = EXCLUDED.cls_rule, facts = EXCLUDED.facts,
      docs = EXCLUDED.docs, links = EXCLUDED.links, match = EXCLUDED.match, suggestions = EXCLUDED.suggestions,
      drive_target = EXCLUDED.drive_target, created_at = NOW(),
      suggested_at = COALESCE(inbox_items.suggested_at, EXCLUDED.suggested_at)`;
}

export async function listItems(since: Date) {
  const sql = getDb();
  return sql`
    SELECT i.*, m.confirmed_by AS memory_confirmed_by, m.opportunity_id AS memory_opportunity_id
    FROM inbox_items i
    LEFT JOIN inbox_thread_memory m ON m.mailbox = i.mailbox AND m.thread_id = i.thread_id AND m.active
    WHERE i.received_at >= ${since.toISOString()}
    ORDER BY i.received_at DESC`;
}

export async function getItem(id: number) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM inbox_items WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getThreadMemory(mailbox: string, threadId: string): Promise<ThreadMemoryRow | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM inbox_thread_memory WHERE mailbox = ${mailbox} AND thread_id = ${threadId} AND active`;
  return (rows[0] as ThreadMemoryRow) || null;
}

/** Grade-A auto entries never overwrite a JT confirmation or correction. */
export async function autoConfirmThread(
  mailbox: string,
  threadId: string,
  subject: string,
  at: Date,
  sender: string,
  opportunityId: string,
  recordId: string | null
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO inbox_thread_memory (mailbox, thread_id, first_subject, first_message_at, first_sender,
      opportunity_id, property_record_id, confirmed_by, confirmed_at, active)
    VALUES (${mailbox}, ${threadId}, ${subject}, ${at.toISOString()}, ${sender}, ${opportunityId}, ${recordId}, 'auto', NOW(), TRUE)
    ON CONFLICT (mailbox, thread_id) DO NOTHING`;
}

/** JT Confirm / Correct: always overwrites. */
export async function setThreadMemory(
  mailbox: string,
  threadId: string,
  subject: string | null,
  at: string | null,
  sender: string | null,
  opportunityId: string,
  recordId: string | null,
  by: string
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO inbox_thread_memory (mailbox, thread_id, first_subject, first_message_at, first_sender,
      opportunity_id, property_record_id, confirmed_by, confirmed_at, active)
    VALUES (${mailbox}, ${threadId}, ${subject}, ${at}, ${sender}, ${opportunityId}, ${recordId}, ${by}, NOW(), TRUE)
    ON CONFLICT (mailbox, thread_id) DO UPDATE SET
      opportunity_id = EXCLUDED.opportunity_id, property_record_id = EXCLUDED.property_record_id,
      confirmed_by = EXCLUDED.confirmed_by, confirmed_at = NOW(), active = TRUE`;
}

/** Feedback on one suggestion, keyed by suggestionKey(). The latest entry replaces the previous one. */
export async function setFeedback(itemId: number, key: string, entry: FeedbackEntry): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE inbox_items
    SET feedback = jsonb_set(COALESCE(feedback, '{}'::jsonb), ${[key]}::text[], ${JSON.stringify(entry)}::jsonb)
    WHERE id = ${itemId}`;
}

/** Count of feedback by Sydney day (of when feedback was given) and outcome. */
export async function feedbackCounts(since: Date): Promise<{ day: string; outcome: string; n: number }[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT to_char((f.value->>'at')::timestamptz AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD') AS day,
      f.value->>'outcome' AS outcome, COUNT(*)::int AS n
    FROM inbox_items i, jsonb_each(COALESCE(i.feedback, '{}'::jsonb)) f
    WHERE (f.value->>'at')::timestamptz >= ${since.toISOString()}
    GROUP BY 1, 2
    ORDER BY 1 DESC, 2`;
  return rows as { day: string; outcome: string; n: number }[];
}
