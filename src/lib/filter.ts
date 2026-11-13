/**
 * 検索・絞り込み・並び替え。
 * 元の配列は変えずに、条件に合うタスクを並べ替えた「新しい配列」を返す。
 */
import type { Category, Priority, Task } from "@/types/task";

export type StatusFilter = "all" | "active" | "completed";
export type PriorityFilter = "all" | Priority;
/** "none" はカテゴリ未設定のタスク */
export type CategoryFilter = "all" | Category | "none";
export type SortOrder = "newest" | "oldest" | "dueDate" | "priority";

export type TaskQuery = {
  keyword: string;
  status: StatusFilter;
  priority: PriorityFilter;
  category: CategoryFilter;
  sort: SortOrder;
};

export const DEFAULT_QUERY: TaskQuery = {
  keyword: "",
  status: "all",
  priority: "all",
  category: "all",
  sort: "newest",
};

/** 条件が初期状態から変わっているか（「条件をリセット」ボタンの表示に使う） */
export function isFiltering(query: TaskQuery): boolean {
  return query.keyword.trim() !== "" || query.status !== "all" || query.priority !== "all" || query.category !== "all";
}

/**
 * 検索しやすい形にそろえる。
 * NFKC: 全角英数字「ＡＷＳ」を半角「AWS」に、半角カナ「ｶﾅ」を全角「カナ」にそろえる。
 * toLowerCase: 大文字・小文字の違いを無視する。
 */
function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/** キーワード（スペース区切りで複数可・すべて含むものだけ）に一致するか */
export function matchesKeyword(task: Task, keyword: string): boolean {
  const words = normalize(keyword).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const target = normalize(`${task.title}\n${task.description}`);
  return words.every((word) => target.includes(word));
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** 新しく作った順（作成日時が同じなら ID で順番を固定する） */
function byNewest(a: Task, b: Task): number {
  return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

/**
 * 2つのタスクの並び順を決める関数（比較関数）。
 * 負の数なら a が先、正の数なら b が先になる。
 */
function compare(sort: SortOrder) {
  return (a: Task, b: Task): number => {
    switch (sort) {
      case "newest":
        return byNewest(a, b);
      case "oldest":
        return -byNewest(a, b);
      case "dueDate":
        // 期限なしは最後に回す。期限が同じなら新しい順
        if (a.dueDate === b.dueDate) return byNewest(a, b);
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case "priority":
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byNewest(a, b);
    }
  };
}

export function filterTasks(tasks: Task[], query: TaskQuery): Task[] {
  return tasks
    .filter((task) => {
      if (query.status === "active" && task.completed) return false;
      if (query.status === "completed" && !task.completed) return false;
      if (query.priority !== "all" && task.priority !== query.priority) return false;
      if (query.category === "none" && task.category !== null) return false;
      if (query.category !== "all" && query.category !== "none" && task.category !== query.category) return false;
      return matchesKeyword(task, query.keyword);
    })
    .sort(compare(query.sort)); // filter が新しい配列を作るので、sort しても元の配列は変わらない
}
