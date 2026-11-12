"use client";

/**
 * 検索・絞り込み・並び替えの操作欄。
 * この部品は条件を「表示して、変更を親に伝える」だけ。条件そのものは親（TaskBoard）が state で持つ。
 * こうした「親が値を持ち、子は props で受け取る」形を「制御されたコンポーネント」と呼ぶ。
 */
import { useId, useState } from "react";
import { inputClass, labelClass } from "@/components/TaskFields";
import type { PriorityFilter, SortOrder, StatusFilter, TaskQuery } from "@/lib/filter";

type Props = {
  query: TaskQuery;
  onChange: (query: TaskQuery) => void;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: "未完了" },
  { value: "completed", label: "完了" },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "新しい順" },
  { value: "oldest", label: "古い順" },
  { value: "dueDate", label: "期限が近い順" },
  { value: "priority", label: "優先度が高い順" },
];

export function TaskToolbar({ query, onChange }: Props) {
  const id = useId();
  // 優先度・並び順はふだん隠しておき、必要なときだけ開く（項目が多すぎて見づらくならないように）
  const [showMore, setShowMore] = useState(false);
  const extraCount = (query.priority !== "all" ? 1 : 0) + (query.sort !== "newest" ? 1 : 0);

  // 1項目だけ変えた新しい条件を親に渡す
  function set<K extends keyof TaskQuery>(field: K, value: TaskQuery[K]) {
    onChange({ ...query, [field]: value });
  }

  return (
    <div role="search" aria-label="タスクの検索と絞り込み" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-keyword`} className={labelClass}>
          キーワードで探す
        </label>
        <input
          id={`${id}-keyword`}
          type="search"
          value={query.keyword}
          onChange={(event) => set("keyword", event.target.value)}
          placeholder="タスク名・説明から探す"
          autoComplete="off"
          className={`${inputClass} min-h-12`}
        />
      </div>

      {/* fieldset + legend: 「このボタン群は何の選択か」を読み上げソフトにも伝える */}
      <fieldset className="flex flex-col gap-1">
        <legend className={`${labelClass} mb-1`}>表示するタスク</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-md text-sm font-semibold text-slate-700 has-checked:bg-white has-checked:text-indigo-700 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-indigo-600"
            >
              <input
                type="radio"
                name={`${id}-status`}
                value={option.value}
                checked={query.status === option.value}
                onChange={() => set("status", option.value)}
                className="sr-only"
              />
              {/* 選択中は ✓ を付け、色以外でも分かるようにする */}
              {query.status === option.value && <span aria-hidden="true">✓&nbsp;</span>}
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => setShowMore((open) => !open)}
        aria-expanded={showMore}
        aria-controls={showMore ? `${id}-more` : undefined}
        className="-mx-2 flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <span aria-hidden="true" className={`inline-block transition-transform ${showMore ? "rotate-90" : ""}`}>
          ▶
        </span>
        優先度・並び順
        {extraCount > 0 && <span className="font-normal text-slate-700">（{extraCount}件 変更中）</span>}
      </button>

      {showMore && (
        <div id={`${id}-more`} className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-priority`} className={labelClass}>
              優先度
            </label>
            <select
              id={`${id}-priority`}
              value={query.priority}
              onChange={(event) => set("priority", event.target.value as PriorityFilter)}
              className={`${inputClass} min-h-12`}
            >
              <option value="all">すべて</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-sort`} className={labelClass}>
              並び順
            </label>
            <select
              id={`${id}-sort`}
              value={query.sort}
              onChange={(event) => set("sort", event.target.value as SortOrder)}
              className={`${inputClass} min-h-12`}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
