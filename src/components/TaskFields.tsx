"use client";

/**
 * 「優先度・期限日・説明」の入力欄。
 * 新規追加フォームと編集フォームの両方で使い回す（同じ部品を2か所に書かない）。
 */
import { useId } from "react";
import { ErrorIcon } from "@/components/icons";
import { PRIORITY_LABELS, DESCRIPTION_MAX_LENGTH } from "@/lib/tasks";
import type { TaskFormErrors, TaskFormValues } from "@/lib/taskForm";
import type { Priority } from "@/types/task";

type Props = {
  values: TaskFormValues;
  errors: TaskFormErrors;
  /** どの項目を、どの値に変えるか。keyof TaskFormValues = "title" | "description" | ... のどれか */
  onChange: <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => void;
};

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 aria-[invalid=true]:border-red-600";

export const labelClass = "text-base font-semibold text-slate-700";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    // 赤い色だけでなく × のアイコンでも「エラー」だと分かるようにする
    <p id={id} className="flex items-start gap-1.5 text-base font-medium text-red-700">
      <ErrorIcon className="mt-1 size-4" />
      <span>{message}</span>
    </p>
  );
}

export function TaskFields({ values, errors, onChange }: Props) {
  const id = useId();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-priority`} className={labelClass}>
          優先度
        </label>
        <select
          id={`${id}-priority`}
          value={values.priority}
          onChange={(event) => onChange("priority", event.target.value as Priority)}
          className={`${inputClass} min-h-12`}
        >
          {(["high", "medium", "low"] as const).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-due`} className={labelClass}>
          期限日<span className="font-normal text-slate-600">（任意）</span>
        </label>
        <div className="flex gap-2">
          <input
            id={`${id}-due`}
            type="date"
            value={values.dueDate}
            onChange={(event) => onChange("dueDate", event.target.value)}
            aria-invalid={errors.dueDate ? true : undefined}
            aria-describedby={errors.dueDate ? `${id}-due-error` : undefined}
            className={`${inputClass} min-h-12 min-w-0 flex-1`}
          />
          {values.dueDate !== "" && (
            <button
              type="button"
              onClick={() => onChange("dueDate", "")}
              className="min-h-12 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              期限なしにする
            </button>
          )}
        </div>
        <FieldError id={`${id}-due-error`} message={errors.dueDate} />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor={`${id}-description`} className={labelClass}>
          説明<span className="font-normal text-slate-600">（任意）</span>
        </label>
        <textarea
          id={`${id}-description`}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={3}
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder="例：A社向け。先週の打ち合わせメモを参照する"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? `${id}-description-error` : undefined}
          className={`${inputClass} py-2`}
        />
        <FieldError id={`${id}-description-error`} message={errors.description} />
      </div>
    </div>
  );
}
