"use client";

/**
 * 新しいタスクを入力するフォーム。
 *
 * props（親から受け取る値）:
 *   onAdd … 入力チェックを通ったタスク名を親に渡すための関数
 */
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { TITLE_MAX_LENGTH, validateTitle } from "@/lib/tasks";

type Props = {
  onAdd: (title: string) => void;
};

export function TaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // useId: ラベルと入力欄を結びつける ID を自動で作る（同じ部品を複数置いても重複しない）
  const inputId = useId();
  const errorId = useId();

  // フォーム送信（ボタンを押す / Enter キー）時の処理
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // ブラウザ標準の「ページを再読み込みして送信する」動きを止める
    event.preventDefault();

    const result = validateTitle(title);
    if (!result.ok) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }

    onAdd(result.value);
    setTitle("");
    setError(null);
    // ボタンをクリックした場合でも、続けて入力できるよう入力欄にカーソルを戻す
    inputRef.current?.focus();
  }

  // 日本語入力（IME）で「変換を確定する Enter」でタスクが登録されてしまうのを防ぐ。
  // isComposing が true の間は、まだ変換中という意味。
  // keyCode 229 は一部ブラウザ（Safari など）が変換中に送ってくる値。
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
        新しいタスク
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="例：企画書の下書きを作る"
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 aria-[invalid=true]:border-red-600"
        />
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-lg bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800"
        >
          追加
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
