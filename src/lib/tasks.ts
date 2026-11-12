/**
 * タスクを操作する「純粋関数」を集めたファイル。
 *
 * 純粋関数 = 同じ入力なら必ず同じ結果を返し、外の世界（画面や localStorage）に触らない関数。
 * 画面と切り離しておくことで、テストが書きやすく、バグの原因も探しやすくなる。
 *
 * どの関数も「元の配列を書き換えず、新しい配列を返す」。
 * React は「新しい配列に変わったこと」を見て画面を更新するため、この書き方が重要。
 */
import { createId } from "@/lib/id";
import type { Priority, Task } from "@/types/task";

/** タスク名の最大文字数 */
export const TITLE_MAX_LENGTH = 100;
/** 説明文の最大文字数 */
export const DESCRIPTION_MAX_LENGTH = 1000;

/** 利用者が入力・編集できる項目（id や日時はアプリが自動で決める） */
export type TaskInput = Pick<Task, "title" | "description" | "priority" | "dueDate">;

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
  return {
    id: options.id ?? createId(),
    title: fields.title,
    description: fields.description ?? "",
    completed: false,
    priority: fields.priority ?? "medium",
    dueDate: fields.dueDate ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** 新しいタスクを先頭に追加した配列を返す */
export function addTask(tasks: Task[], task: Task): Task[] {
  return [task, ...tasks];
}

/** 指定した ID のタスクの完了・未完了を反転した配列を返す */
export function toggleTask(tasks: Task[], id: string, now: Date = new Date()): Task[] {
  return tasks.map((task) =>
    task.id === id
      ? { ...task, completed: !task.completed, updatedAt: now.toISOString() }
      : task,
  );
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
      task.dueDate === changes.dueDate;
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
