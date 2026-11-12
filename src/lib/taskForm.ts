/**
 * 入力フォーム（新規追加・編集）の値のチェック。
 *
 * フォームの入力欄は常に「文字列」を扱う（期限日なしは空文字 ""）。
 * 一方、保存するタスクでは期限日なしを null で表す。
 * その変換とチェックをここでまとめて行う。
 */
import { DESCRIPTION_MAX_LENGTH, validateTitle, type TaskInput } from "@/lib/tasks";
import { isValidDateString } from "@/lib/validation";
import type { Priority, Task } from "@/types/task";

export type TaskFormValues = {
  title: string;
  description: string;
  priority: Priority;
  /** 期限日。未設定なら "" */
  dueDate: string;
};

export type TaskFormErrors = Partial<Record<"title" | "description" | "dueDate", string>>;

export const EMPTY_FORM_VALUES: TaskFormValues = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

/** 既存のタスクを、編集フォームの初期値に変換する */
export function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate ?? "",
  };
}

export function validateTaskForm(
  values: TaskFormValues,
): { ok: true; value: TaskInput } | { ok: false; errors: TaskFormErrors } {
  const errors: TaskFormErrors = {};

  const title = validateTitle(values.title);
  if (!title.ok) errors.title = title.error;

  const description = values.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `説明は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください（現在${description.length}文字）。`;
  }

  if (values.dueDate !== "" && !isValidDateString(values.dueDate)) {
    errors.dueDate = "期限日は正しい日付を選んでください。";
  }

  if (!title.ok || Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title: title.value,
      description,
      priority: values.priority,
      dueDate: values.dueDate === "" ? null : values.dueDate,
    },
  };
}
