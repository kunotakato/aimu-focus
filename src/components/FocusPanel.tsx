"use client";

/**
 * 今日のフォーカス（課題2-A）。
 * 「今日やる」に選んだタスク（最大3件）を、画面のいちばん上にまとめて表示する。
 * 一覧が長くなっても、今日いちばん大事な行動を見失わないようにするため。
 */
import { useId } from "react";
import { StarIcon } from "@/components/icons";
import { DueDateLabel } from "@/components/TaskMeta";
import { FOCUS_LIMIT } from "@/lib/tasks";
import type { Task } from "@/types/task";

type Props = {
  /** 今日の「今日やる」タスク（完了済みも含む） */
  tasks: Task[];
  today: string;
  onToggle: (id: string) => void;
  onUnfocus: (id: string) => void;
};

function FocusRow({ task, today, onToggle, onUnfocus }: { task: Task } & Omit<Props, "tasks">) {
  const checkboxId = useId();
  return (
    <li className="rounded-xl bg-white p-3 ring-1 ring-amber-200">
        <label htmlFor={checkboxId} className="flex min-h-11 cursor-pointer items-start gap-3 pt-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-indigo-600"
          />
          <span
            className={`min-w-0 break-words text-base font-semibold ${
              task.completed ? "text-slate-500 line-through" : "text-slate-900"
            }`}
          >
            {/* sr-only: 画面には見せず、読み上げだけ。一覧のチェックボックスと区別するため */}
            <span className="sr-only">今日のフォーカス：</span>
            {task.title}
          </span>
        </label>
      {/* 期限と「外す」はタスク名の下の行に置き、狭い画面でも名前が細かく折り返さないようにする */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 pl-9">
        <DueDateLabel task={task} today={today} />
        <button
        type="button"
        onClick={() => onUnfocus(task.id)}
        aria-label={`「${task.title}」を今日やるから外す`}
        className="-mr-2 ml-auto min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3 text-base font-semibold text-slate-600 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
      >
          外す
        </button>
      </div>
    </li>
  );
}

export function FocusPanel({ tasks, today, onToggle, onUnfocus }: Props) {
  // 未完了を上、完了済みを下に並べる（今やるべきものを先に見せる）
  const sorted = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  const done = tasks.filter((task) => task.completed).length;

  return (
    <section
      aria-labelledby="focus-heading"
      className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 id="focus-heading" className="flex items-center gap-2 whitespace-nowrap text-lg font-bold text-slate-900">
          <StarIcon filled className="text-amber-600" />
          今日のフォーカス
        </h2>
        {tasks.length > 0 && (
          <p className="shrink-0 whitespace-nowrap text-base text-slate-700">
            {done} / {tasks.length} 件完了
          </p>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="mt-2 text-base text-slate-700">
          {`一覧の「☆ 今日やる」を押して、今日いちばん大事なタスクを${FOCUS_LIMIT}つまで選びましょう。`}
        </p>
      ) : (
        <ul aria-label="今日やるタスク" className="mt-3 flex flex-col gap-2">
          {sorted.map((task) => (
            <FocusRow key={task.id} task={task} today={today} onToggle={onToggle} onUnfocus={onUnfocus} />
          ))}
        </ul>
      )}

      {tasks.length > 0 && done === tasks.length && (
        <p className="mt-3 text-base font-semibold text-emerald-800">
          <span aria-hidden="true">✓ </span>
          今日のフォーカスをすべて完了しました。おつかれさまです！
        </p>
      )}
    </section>
  );
}
