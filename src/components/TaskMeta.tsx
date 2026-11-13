/**
 * タスクの優先度・期限の表示。
 * 色だけに頼らず、「優先度 高」「期限切れ」のように言葉とアイコンでも伝える。
 */
import { RepeatIcon, TagIcon, WarningIcon } from "@/components/icons";
import { formatDueDate, getDueStatus } from "@/lib/date";
import { RECURRENCE_LABELS } from "@/lib/recurrence";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/tasks";
import type { Category, Priority, Recurrence, Task } from "@/types/task";

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800 ring-red-200",
  medium: "bg-amber-100 text-amber-900 ring-amber-200",
  low: "bg-slate-100 text-slate-700 ring-slate-200",
};

/** 優先度の高さを、棒の本数（形）でも表す */
const PRIORITY_BARS: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-base font-semibold ring-1 ring-inset ${PRIORITY_STYLES[priority]}`}
    >
      <span aria-hidden="true" className="flex items-end gap-px">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`w-1 rounded-sm ${n <= PRIORITY_BARS[priority] ? "bg-current" : "bg-current/25"}`}
            style={{ height: `${4 + n * 3}px` }}
          />
        ))}
      </span>
      優先度 {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function DueDateLabel({ task, today }: { task: Task; today: string }) {
  const status = getDueStatus(task, today);
  if (status.kind === "none") return null;

  const date = formatDueDate(task.dueDate!);

  if (status.kind === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 text-base font-bold text-red-700">
        <WarningIcon className="size-4" />
        期限切れ（{status.days}日超過）・{date}
      </span>
    );
  }

  const suffix =
    task.completed ? "" : status.kind === "today" ? "（今日まで）" : status.kind === "soon" ? `（あと${status.days}日）` : "";
  const emphasis = !task.completed && (status.kind === "today" || status.kind === "soon");

  return (
    <span className={`text-base ${emphasis ? "font-semibold text-amber-900" : "text-slate-600"}`}>
      期限 {date}
      {suffix}
    </span>
  );
}

/** カテゴリ（課題2-B）。種類は文字で区別する（色だけで区別しない） */
export function CategoryBadge({ category }: { category: Category | null }) {
  if (category === null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-base font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
      <TagIcon className="size-4" />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/** 繰り返し（課題2-C） */
export function RecurrenceBadge({ recurrence }: { recurrence: Recurrence }) {
  if (recurrence === "none") return null;
  return (
    <span className="inline-flex items-center gap-1 text-base font-semibold text-indigo-800">
      <RepeatIcon className="size-4" />
      {RECURRENCE_LABELS[recurrence]}
    </span>
  );
}
