"use client";

/**
 * 新しいタスクを入力するフォーム。
 * ふだんはタスク名だけを表示し、「詳細を設定」を押したときだけ優先度などの欄を開く
 * （最初から項目が多いと、ごちゃごちゃして使いにくいため）。
 *
 * props（親から受け取る値）:
 *   onAdd … 入力チェックを通ったタスクの内容を親に渡すための関数
 */
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { FieldError, TaskFields } from "@/components/TaskFields";
import { EMPTY_FORM_VALUES, validateTaskForm, type TaskFormErrors, type TaskFormValues } from "@/lib/taskForm";
import { TITLE_MAX_LENGTH, type TaskInput } from "@/lib/tasks";

type Props = {
  onAdd: (input: TaskInput) => void;
};

/**
 * 日本語入力（IME）で「変換を確定する Enter」でフォームが送信されてしまうのを防ぐ。
 * isComposing が true の間は、まだ変換中という意味。
 * keyCode 229 は一部ブラウザ（Safari など）が変換中に送ってくる値。
 */
export function preventImeEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
    event.preventDefault();
  }
}

export function TaskForm({ onAdd }: Props) {
  const [values, setValues] = useState<TaskFormValues>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // useId: ラベルと入力欄を結びつける ID を自動で作る（同じ部品を複数置いても重複しない）
  const id = useId();

  function handleChange<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    // スプレッド構文 {...values} で元の値をコピーし、1項目だけ差し替えた新しいオブジェクトを作る
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof TaskFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  // フォーム送信（ボタンを押す / Enter キー）時の処理
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // ブラウザ標準の「ページを再読み込みして送信する」動きを止める
    event.preventDefault();

    const result = validateTaskForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      // 詳細欄にエラーがあるなら、閉じていても開いて見せる
      if (result.errors.description || result.errors.dueDate) setShowDetails(true);
      if (result.errors.title) inputRef.current?.focus();
      return;
    }

    onAdd(result.value);
    setValues(EMPTY_FORM_VALUES);
    setErrors({});
    // ボタンをクリックした場合でも、続けて入力できるよう入力欄にカーソルを戻す
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-title`} className="text-sm font-semibold text-slate-700">
          新しいタスク
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id={`${id}-title`}
            type="text"
            value={values.title}
            onChange={(event) => handleChange("title", event.target.value)}
            onKeyDown={preventImeEnter}
            placeholder="例：企画書の下書きを作る"
            maxLength={TITLE_MAX_LENGTH}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 aria-[invalid=true]:border-red-600"
          />
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded-lg bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800"
          >
            追加
          </button>
        </div>
        {errors.title && (
          <p id={`${id}-title-error`} role="alert" className="text-sm font-medium text-red-700">
            {errors.title}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((open) => !open)}
        aria-expanded={showDetails}
        aria-controls={showDetails ? `${id}-details` : undefined}
        className="-mx-2 flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <span aria-hidden="true" className={`inline-block transition-transform ${showDetails ? "rotate-90" : ""}`}>
          ▶
        </span>
        優先度・期限・説明を設定
      </button>

      {showDetails && (
        <div id={`${id}-details`}>
          <TaskFields values={values} errors={errors} onChange={handleChange} />
        </div>
      )}
      {/* 詳細欄を閉じていてもエラーが分かるように */}
      {!showDetails && <FieldError id={`${id}-hidden-error`} message={errors.description ?? errors.dueDate} />}
    </form>
  );
}
