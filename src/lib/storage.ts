/**
 * localStorage への保存・読み込みを担当するファイル。
 *
 * localStorage = ブラウザの中にある、文字列だけを保存できる小さな保存場所（目安 5MB）。
 *   - ブラウザを閉じてもデータは残る
 *   - 他のブラウザや他の端末とは共有されない
 *   - プライベートモードや設定によっては使えない（使おうとするとエラーになる）
 *
 * そのため「失敗するかもしれない」前提で、すべての操作を try / catch で囲んでいる。
 */
import { pickValidTasks } from "@/lib/validation";
import type { Task } from "@/types/task";

export const STORAGE_KEY = "aimu-focus:tasks";
export const BACKUP_KEY_PREFIX = "aimu-focus:tasks:backup:";

/**
 * 保存データの形式番号。データの形を変えたとき「古い形式かどうか」を見分けるために入れている。
 *   1: 課題1（基本の項目）
 *   2: 課題2（カテゴリ・繰り返し・今日やる・完了日時を追加）
 * 形式1のデータは、読み込むときに形式2へ変換する（保存すると形式2で書き込まれる）。
 */
export const STORAGE_VERSION = 2;
const READABLE_VERSIONS = [1, 2];

type StoredData = { version: typeof STORAGE_VERSION; tasks: Task[] };

/** 読み込み時に起きた問題の種類 */
export type LoadIssue =
  /** 保存データが読めない形だった（全件読み込めなかった） */
  | { type: "corrupted"; raw: string }
  /** 一部のタスクだけ読み込めなかった */
  | { type: "partial"; skipped: number; raw: string }
  /** localStorage 自体が使えない（プライベートモードなど） */
  | { type: "unavailable" };

export type LoadResult = { tasks: Task[]; issue: LoadIssue | null };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" | "backup-failed" };

/** localStorage を取り出す。使えない環境では null を返す */
function getStorage(): Storage | null {
  try {
    // サーバー（Node.js）には window がないので、まずそこを確認する
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // 一部のブラウザでは window.localStorage に触れただけでエラーになる
    return null;
  }
}

/** 保存されているタスクを読み込む。どんなデータが入っていても例外は投げない */
export function loadTasks(): LoadResult {
  const storage = getStorage();
  if (!storage) return { tasks: [], issue: { type: "unavailable" } };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { tasks: [], issue: { type: "unavailable" } };
  }

  // まだ一度も保存していない（初めて開いた）
  if (raw === null) return { tasks: [], issue: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { tasks: [], issue: { type: "corrupted", raw } };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !READABLE_VERSIONS.includes((parsed as { version?: unknown }).version as number) ||
    !Array.isArray((parsed as { tasks?: unknown }).tasks)
  ) {
    return { tasks: [], issue: { type: "corrupted", raw } };
  }

  const { version, tasks: items } = parsed as { version: number; tasks: unknown[] };
  const { tasks, skipped } = pickValidTasks(items, version);
  if (skipped > 0) {
    return { tasks, issue: { type: "partial", skipped, raw } };
  }
  return { tasks, issue: null };
}

/** QuotaExceededError（容量オーバー）かどうか。ブラウザによって名前が違う */
function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/**
 * 読み込めなかった元データを、別のキーに退避（コピー）する。
 * 上書きで消してしまう前に、後から調べたり復旧したりできるよう残しておくため。
 * 成功したら退避先のキーを返す。
 */
export function backupRawData(raw: string, now: Date = new Date()): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const key = `${BACKUP_KEY_PREFIX}${now.toISOString()}`;
  try {
    storage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

/** タスク一覧を保存する。失敗しても例外は投げず、理由を返す */
export function saveTasks(tasks: Task[]): SaveResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };

  const data: StoredData = { version: STORAGE_VERSION, tasks };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}
