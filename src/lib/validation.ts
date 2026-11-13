/**
 * 外から来たデータ（localStorage・JSON ファイル）が、本当に Task の形をしているか調べる。
 *
 * TypeScript の型チェックは「コードを書いている時」にしか働かない。
 * 実行中に読み込んだデータは何が入っているか分からない（unknown）ので、
 * ここで1項目ずつ確かめてから Task として扱う。
 */
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "@/lib/tasks";
import type { Category, Priority, Recurrence, Task } from "@/types/task";

const PRIORITIES: readonly Priority[] = ["high", "medium", "low"];
const CATEGORIES: readonly Category[] = ["work", "side", "study", "life", "other"];
const RECURRENCES: readonly Recurrence[] = ["none", "daily", "weekly", "monthly"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "2026-11-30" の形で、かつ実在する日付か（"2026-02-31" は不可） */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/**
 * value が Task の形なら true。
 * 戻り値の型 `value is Task` は「true なら、この後 value を Task として扱ってよい」という意味。
 */
export function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  const { id, title, description, completed, priority, dueDate, createdAt, updatedAt } = value;
  const { category, recurrence, seriesId, focusDate, completedAt } = value;
  return (
    typeof id === "string" &&
    id !== "" &&
    typeof title === "string" &&
    title.trim() !== "" &&
    title.length <= TITLE_MAX_LENGTH &&
    typeof description === "string" &&
    description.length <= DESCRIPTION_MAX_LENGTH &&
    typeof completed === "boolean" &&
    PRIORITIES.includes(priority as Priority) &&
    (dueDate === null || (typeof dueDate === "string" && isValidDateString(dueDate))) &&
    isValidTimestamp(createdAt) &&
    isValidTimestamp(updatedAt) &&
    (category === null || CATEGORIES.includes(category as Category)) &&
    RECURRENCES.includes(recurrence as Recurrence) &&
    typeof seriesId === "string" &&
    seriesId !== "" &&
    (focusDate === null || (typeof focusDate === "string" && isValidDateString(focusDate))) &&
    // 完了済みなら完了日時があり、未完了なら完了日時はない（食い違いは不正なデータ）
    (completed === true ? isValidTimestamp(completedAt) : completedAt === null)
  );
}

/**
 * 形式1（課題1）で保存されたタスクを、形式2の形にそろえる（マイグレーション）。
 * 課題2で増えた項目に初期値を入れるだけで、元からある項目はそのまま残す。
 * 完了日時の記録がない完了済みタスクは、最終更新日時を完了日時とみなす。
 */
export function migrateTaskFromV1(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    category: null,
    recurrence: "none",
    seriesId: value.id,
    focusDate: null,
    completedAt: value.completed === true ? value.updatedAt : null,
    ...value, // すでに値がある項目は、そちらを優先する
  };
}

/**
 * 配列の中から正しいタスクだけを取り出す。
 * 形が正しくないもの・ID が重複しているものは除き、その件数を skipped で返す。
 */
export function pickValidTasks(
  items: unknown[],
  fromVersion: number = 2,
): { tasks: Task[]; skipped: number } {
  const seenIds = new Set<string>();
  const tasks: Task[] = [];
  for (const raw of items) {
    const item = fromVersion === 1 ? migrateTaskFromV1(raw) : raw;
    if (isTask(item) && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      tasks.push(item);
    }
  }
  return { tasks, skipped: items.length - tasks.length };
}
