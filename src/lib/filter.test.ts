import { describe, expect, it } from "vitest";
import { DEFAULT_QUERY, filterTasks, isFiltering, matchesKeyword, type TaskQuery } from "@/lib/filter";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

function task(id: string, createdAt: string, fields: Partial<Task> = {}): Task {
  return { ...createTask(id, { id, now: new Date(createdAt) }), ...fields };
}

const tasks: Task[] = [
  task("a", "2026-11-01T00:00:00Z", { title: "AWS資格の勉強", priority: "high", dueDate: "2026-11-20" }),
  task("b", "2026-11-02T00:00:00Z", { title: "週報", description: "Slackに投稿する", completed: true }),
  task("c", "2026-11-03T00:00:00Z", { title: "部屋の掃除", priority: "low", dueDate: "2026-11-15" }),
  task("d", "2026-11-04T00:00:00Z", { title: "React の復習", priority: "high" }),
];

const ids = (list: Task[]) => list.map((t) => t.id);
const query = (q: Partial<TaskQuery>): TaskQuery => ({ ...DEFAULT_QUERY, ...q });

describe("キーワード検索", () => {
  it("タスク名と説明の両方から探す", () => {
    expect(ids(filterTasks(tasks, query({ keyword: "週報" })))).toEqual(["b"]);
    expect(ids(filterTasks(tasks, query({ keyword: "slack" })))).toEqual(["b"]);
  });

  it("大文字・小文字、全角・半角の違いを無視する", () => {
    expect(matchesKeyword(tasks[0], "ａｗｓ")).toBe(true);
    expect(matchesKeyword(tasks[3], "REACT")).toBe(true);
  });

  it("スペース区切りの複数キーワードは、すべて含むものだけ", () => {
    expect(ids(filterTasks(tasks, query({ keyword: "AWS 勉強" })))).toEqual(["a"]);
    expect(ids(filterTasks(tasks, query({ keyword: "AWS　掃除" })))).toEqual([]); // 全角スペースも区切り
  });

  it("空白だけのキーワードは、絞り込まない", () => {
    expect(filterTasks(tasks, query({ keyword: "   " }))).toHaveLength(4);
  });
});

describe("状態・優先度での絞り込み", () => {
  it("未完了／完了で絞り込める", () => {
    expect(ids(filterTasks(tasks, query({ status: "active" })))).toEqual(["d", "c", "a"]);
    expect(ids(filterTasks(tasks, query({ status: "completed" })))).toEqual(["b"]);
  });

  it("優先度で絞り込める", () => {
    expect(ids(filterTasks(tasks, query({ priority: "high" })))).toEqual(["d", "a"]);
    expect(ids(filterTasks(tasks, query({ priority: "low" })))).toEqual(["c"]);
  });

  it("複数の条件を組み合わせられる", () => {
    expect(ids(filterTasks(tasks, query({ status: "active", priority: "high", keyword: "aws" })))).toEqual(["a"]);
  });
});

describe("並び替え", () => {
  it("登録順（新しい順・古い順）", () => {
    expect(ids(filterTasks(tasks, query({ sort: "newest" })))).toEqual(["d", "c", "b", "a"]);
    expect(ids(filterTasks(tasks, query({ sort: "oldest" })))).toEqual(["a", "b", "c", "d"]);
  });

  it("期限が近い順（期限なしは最後、期限なし同士は新しい順）", () => {
    expect(ids(filterTasks(tasks, query({ sort: "dueDate" })))).toEqual(["c", "a", "d", "b"]);
  });

  it("優先度が高い順（同じ優先度なら新しい順）", () => {
    expect(ids(filterTasks(tasks, query({ sort: "priority" })))).toEqual(["d", "a", "b", "c"]);
  });

  it("元の配列の順番は変えない", () => {
    filterTasks(tasks, query({ sort: "oldest" }));
    expect(ids(tasks)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("isFiltering", () => {
  it("並び順だけの変更は「絞り込み中」に含めない", () => {
    expect(isFiltering(DEFAULT_QUERY)).toBe(false);
    expect(isFiltering(query({ sort: "dueDate" }))).toBe(false);
    expect(isFiltering(query({ keyword: "a" }))).toBe(true);
    expect(isFiltering(query({ status: "completed" }))).toBe(true);
  });
});

describe("カテゴリでの絞り込み（課題2-B）", () => {
  const withCategory: Task[] = [
    task("w", "2026-11-01T00:00:00Z", { category: "work" }),
    task("s", "2026-11-02T00:00:00Z", { category: "study" }),
    task("n", "2026-11-03T00:00:00Z", { category: null }),
  ];

  it("指定したカテゴリだけ、または未設定だけを表示する", () => {
    expect(ids(filterTasks(withCategory, query({ category: "study" })))).toEqual(["s"]);
    expect(ids(filterTasks(withCategory, query({ category: "none" })))).toEqual(["n"]);
    expect(filterTasks(withCategory, query({ category: "all" }))).toHaveLength(3);
  });

  it("カテゴリの絞り込みも「絞り込み中」に含める", () => {
    expect(isFiltering(query({ category: "work" }))).toBe(true);
  });
});
