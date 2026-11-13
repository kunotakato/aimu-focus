/**
 * タスクを操作する「純粋関数」を集めたファイル。
 *
 * 純粋関数 = 同じ入力なら必ず同じ結果を返し、外の世界（画面や localStorage）に触らない関数。
 * 画面と切り離しておくことで、テストが書きやすく、バグの原因も探しやすくなる。
 *
 * どの関数も「元の配列を書き換えず、新しい配列を返す」。
 * React は「新しい配列に変わったこと」を見て画面を更新するため、この書き方が重要。
 */
import { toLocalDateString } from "@/lib/date";
import { createId } from "@/lib/id";
import { nextDueDate } from "@/lib/recurrence";
import type { Category, Priority, Task } from "@/types/task";

/** タスク名の最大文字数 */
export const TITLE_MAX_LENGTH = 100;
/** 説明文の最大文字数 */
export const DESCRIPTION_MAX_LENGTH = 1000;
/** 「今日やる」に選べる未完了タスクの最大数（課題2-A） */
export const FOCUS_LIMIT = 3;

/** 利用者が入力・編集できる項目（id や日時はアプリが自動で決める） */
export type TaskInput = Pick<Task, "title" | "description" | "priority" | "dueDate" | "category" | "recurrence">;

/** 入力チェックの結果。成功なら整えた値、失敗ならエラーメッセージを持つ */
export type TitleValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * タスク名をチェックする。
 * trim() は前後の空白（全角スペース「　」や改行も含む）を取り除く。
 */
export function validateTitle(input: string): TitleValidationResult {
  const value = input.trim();
  if (value === "") {
    return { ok: false, error: "タスク名を入力してください（空白だけでは登録できません）。" };
  }
  if (value.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `タスク名は${TITLE_MAX_LENGTH}文字以内で入力してください（現在${value.length}文字）。`,
    };
  }
  return { ok: true, value };
}

/**
 * 新しいタスクを1件作る。
 * 第1引数はタスク名だけ（文字列）でも、詳細つき（TaskInput の一部）でもよい。
 * id と now は普段は省略してよい。テストでは固定値を渡して結果を予測しやすくする。
 */
export function createTask(
  input: string | (Partial<TaskInput> & { title: string }),
  options: { id?: string; now?: Date } = {},
): Task {
  const fields = typeof input === "string" ? { title: input } : input;
  const timestamp = (options.now ?? new Date()).toISOString();
  const id = options.id ?? createId();
  return {
    id,
    title: fields.title,
    description: fields.description ?? "",
    completed: false,
    priority: fields.priority ?? "medium",
    dueDate: fields.dueDate ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    category: fields.category ?? null,
    recurrence: fields.recurrence ?? "none",
    seriesId: id, // 最初のタスクは自分自身が「仲間」の代表
    focusDate: null,
    completedAt: null,
  };
}

/** 新しいタスクを先頭に追加した配列を返す */
export function addTask(tasks: Task[], task: Task): Task[] {
  return [task, ...tasks];
}

/**
 * 繰り返しタスクを完了したときに作る「次回分」。
 * 内容（名前・説明・優先度・カテゴリ・繰り返し）と仲間 ID を引き継ぎ、期限日だけ次回に進める。
 */
export function createNextOccurrence(task: Task, now: Date, id: string = createId()): Task | null {
  if (task.recurrence === "none") return null;
  return {
    ...createTask(task, { id, now }),
    dueDate: nextDueDate(task.recurrence, task.dueDate, toLocalDateString(now)),
    seriesId: task.seriesId,
  };
}

/**
 * 指定した ID のタスクの完了・未完了を反転する。
 *   - 完了にしたら完了日時を記録し、未完了に戻したら消す（週の振り返りの集計に使う）
 *   - 繰り返しタスクを完了にしたら、次回分を先頭に追加する。
 *     ただし同じ仲間の未完了タスクがすでにあれば作らない（チェックを付け直したときに重複させない）
 * 戻り値の created は、新しく作った次回分（なければ null）。画面でお知らせを出すのに使う。
 */
export function toggleTaskWithResult(
  tasks: Task[],
  id: string,
  now: Date = new Date(),
): { tasks: Task[]; created: Task | null } {
  const target = tasks.find((task) => task.id === id);
  if (!target) return { tasks, created: null };

  const completed = !target.completed;
  const timestamp = now.toISOString();
  const updated = tasks.map((task) =>
    task.id === id
      ? { ...task, completed, completedAt: completed ? timestamp : null, updatedAt: timestamp }
      : task,
  );

  if (!completed) return { tasks: updated, created: null };

  const hasPendingInSeries = tasks.some(
    (task) => task.id !== id && task.seriesId === target.seriesId && !task.completed,
  );
  const created = hasPendingInSeries ? null : createNextOccurrence(target, now);
  return { tasks: created ? [created, ...updated] : updated, created };
}

/** 指定した ID のタスクの完了・未完了を反転した配列を返す（次回分の作成も含む） */
export function toggleTask(tasks: Task[], id: string, now: Date = new Date()): Task[] {
  return toggleTaskWithResult(tasks, id, now).tasks;
}

/** 今日の「今日やる」に選ばれている未完了タスクの数 */
export function countFocused(tasks: Task[], today: string): number {
  return tasks.filter((task) => task.focusDate === today && !task.completed).length;
}

/**
 * 「今日やる」に選ぶ／外す（課題2-A）。
 * 未完了で選べるのは FOCUS_LIMIT 件まで。超えるときは配列を変えずに limit を返す。
 * 日付ごとに記録するので、翌日になると自動で「今日やる」から外れる。
 */
export function setFocus(
  tasks: Task[],
  id: string,
  focused: boolean,
  today: string,
): { ok: true; tasks: Task[] } | { ok: false; reason: "limit" } {
  if (focused) {
    const others = tasks.filter((task) => task.id !== id);
    if (countFocused(others, today) >= FOCUS_LIMIT) return { ok: false, reason: "limit" };
  }
  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, focusDate: focused ? today : null } : task)),
  };
}

/**
 * 指定した ID のタスクの内容を書き換えた配列を返す。
 * 中身が何も変わっていなければ、そのタスクは更新日時も含めてそのままにする。
 */
export function updateTask(
  tasks: Task[],
  id: string,
  changes: TaskInput,
  now: Date = new Date(),
): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const unchanged =
      task.title === changes.title &&
      task.description === changes.description &&
      task.priority === changes.priority &&
      task.dueDate === changes.dueDate &&
      task.category === changes.category &&
      task.recurrence === changes.recurrence;
    return unchanged ? task : { ...task, ...changes, updatedAt: now.toISOString() };
  });
}

/** 指定した ID のタスクを取り除いた配列を返す */
export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  work: "仕事",
  side: "副業",
  study: "学習",
  life: "生活",
  other: "その他",
};
