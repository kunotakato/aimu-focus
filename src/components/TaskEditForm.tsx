"use client";

/**
 * タスクの編集フォーム（タスクの行の中に表示する）。
 */
import { useId, useState, type FormEvent } from "react";
import { preventImeEnter } from "@/components/TaskForm";
import { FieldError, TaskFields, inputClass, labelClass } from "@/components/TaskFields";
import { toFormValues, validateTaskForm, type TaskFormErrors, type TaskFormValues } from "@/lib/taskForm";
import { TITLE_MAX_LENGTH, type TaskInput } from "@/lib/tasks";
import type { Task } from "@/types/task";

type Props = {
  task: Task;
  onSave: (changes: TaskInput) => void;
  onCancel: () => void;
};

export function TaskEditForm({ task, onSave, onCancel }: Props) {
  // 編集前のタスクの値を初期値にする（保存するまで元のタスクは変わらない）
  const [values, setValues] = useState<TaskFormValues>(() => toFormValues(task));
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const id = useId();

  function handleChange<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTaskForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave(result.value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={`「${task.title}」を編集`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-title`} className={labelClass}>
          タスク名
        </label>
        <input
          id={`${id}-title`}
          type="text"
          value={values.title}
          onChange={(event) => handleChange("title", event.target.value)}
          onKeyDown={preventImeEnter}
          maxLength={TITLE_MAX_LENGTH}
          // 編集を始めたらすぐ入力できるように
          autoFocus
          autoComplete="off"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
          className={`${inputClass} min-h-12`}
        />
        <FieldError id={`${id}-title-error`} message={errors.title} />
      </div>

      <TaskFields values={values} errors={errors} onChange={handleChange} />

      <div className="flex gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:flex-none"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:flex-none"
        >
          保存する
        </button>
      </div>
    </form>
  );
}
