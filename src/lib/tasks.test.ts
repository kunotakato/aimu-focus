import { describe, expect, it } from "vitest";
import {
  FOCUS_LIMIT,
  TITLE_MAX_LENGTH,
  addTask,
  countFocused,
  createTask,
  deleteTask,
  setFocus,
  toggleTask,
  toggleTaskWithResult,
  updateTask,
  validateTitle,
} from "@/lib/tasks";

const NOW = new Date("2026-11-12T00:00:00.000Z");
const LATER = new Date("2026-11-13T09:30:00.000Z");

describe("validateTitle（タスク名のチェック）", () => {
  it("前後の空白を取り除いた値を返す", () => {
    expect(validateTitle("  資料を作る  ")).toEqual({ ok: true, value: "資料を作る" });
  });

  it.each([
    ["空文字", ""],
    ["半角スペースだけ", "   "],
    ["全角スペースだけ", "　　"],
    ["改行とタブだけ", "\n\t"],
  ])("%s は登録できない", (_label, input) => {
    expect(validateTitle(input).ok).toBe(false);
  });

  it(`${TITLE_MAX_LENGTH}文字までは登録でき、それを超えるとエラーになる`, () => {
    expect(validateTitle("あ".repeat(TITLE_MAX_LENGTH)).ok).toBe(true);
    expect(validateTitle("あ".repeat(TITLE_MAX_LENGTH + 1)).ok).toBe(false);
  });
});

describe("createTask（タスクの作成）", () => {
  it("初期値が入ったタスクを作る", () => {
    expect(createTask("買い物", { id: "t1", now: NOW })).toEqual({
      id: "t1",
      title: "買い物",
      description: "",
      completed: false,
      priority: "medium",
      dueDate: null,
      createdAt: "2026-11-12T00:00:00.000Z",
      updatedAt: "2026-11-12T00:00:00.000Z",
      category: null,
      recurrence: "none",
      seriesId: "t1",
      focusDate: null,
      completedAt: null,
    });
  });

  it("優先度・期限・説明を指定して作れる", () => {
    const task = createTask({ title: "A", description: "メモ", priority: "high", dueDate: "2026-12-01" });
    expect(task).toMatchObject({ title: "A", description: "メモ", priority: "high", dueDate: "2026-12-01" });
  });

  it("ID を指定しなければ、毎回違う ID が付く", () => {
    expect(createTask("A").id).not.toBe(createTask("B").id);
  });
});

describe("addTask / toggleTask / deleteTask", () => {
  const a = createTask("A", { id: "a", now: NOW });
  const b = createTask("B", { id: "b", now: NOW });

  it("addTask は新しいタスクを先頭に追加する", () => {
    expect(addTask([a], b).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("toggleTask は対象だけ完了状態を反転し、更新日時を変える", () => {
    const result = toggleTask([a, b], "a", LATER);
    expect(result[0].completed).toBe(true);
    expect(result[0].updatedAt).toBe(LATER.toISOString());
    expect(result[1]).toBe(b); // 対象外のタスクはそのまま

    // もう一度実行すると未完了に戻る
    expect(toggleTask(result, "a", LATER)[0].completed).toBe(false);
  });

  it("updateTask は対象の内容を書き換え、更新日時を変える（作成日時は変えない）", () => {
    const changes = {
      title: "A改",
      description: "説明",
      priority: "high" as const,
      dueDate: "2026-12-01",
      category: "work" as const,
      recurrence: "weekly" as const,
    };
    const result = updateTask([a, b], "a", changes, LATER);
    expect(result[0]).toEqual({ ...a, ...changes, updatedAt: LATER.toISOString() });
    expect(result[0].createdAt).toBe(a.createdAt);
    expect(result[1]).toBe(b);
  });

  it("updateTask で内容が何も変わらなければ、更新日時も変えない", () => {
    const { title, description, priority, dueDate, category, recurrence } = a;
    const same = { title, description, priority, dueDate, category, recurrence };
    expect(updateTask([a], "a", same, LATER)[0]).toBe(a);
  });

  it("deleteTask は対象のタスクだけを取り除く", () => {
    expect(deleteTask([a, b], "a")).toEqual([b]);
  });

  it("どの関数も元の配列を書き換えない", () => {
    const original = [a, b];
    addTask(original, createTask("C"));
    toggleTask(original, "a");
    updateTask(original, "a", { title: "X", description: "", priority: "low", dueDate: null, category: null, recurrence: "none" });
    deleteTask(original, "a");
    expect(original).toEqual([a, b]);
    expect(a.completed).toBe(false);
  });
});

describe("toggleTaskWithResult（完了日時の記録と、繰り返しタスクの次回分）", () => {
  const COMPLETED_AT = new Date("2026-11-13T01:00:00.000Z"); // 日本時間 11/13 10:00

  it("完了にすると完了日時を記録し、未完了に戻すと消す", () => {
    const task = createTask("A", { id: "a", now: NOW });
    const done = toggleTaskWithResult([task], "a", COMPLETED_AT);
    expect(done.tasks[0]).toMatchObject({ completed: true, completedAt: COMPLETED_AT.toISOString() });
    expect(done.created).toBeNull(); // 繰り返しでなければ次回分は作らない

    const undone = toggleTaskWithResult(done.tasks, "a", LATER);
    expect(undone.tasks[0]).toMatchObject({ completed: false, completedAt: null });
  });

  it("繰り返しタスクを完了すると、内容を引き継いだ次回分を先頭に作る", () => {
    const daily = createTask(
      { title: "英単語", description: "10個", priority: "high", category: "study", recurrence: "daily", dueDate: "2026-11-13" },
      { id: "d1", now: NOW },
    );
    const { tasks, created } = toggleTaskWithResult([daily], "d1", COMPLETED_AT);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toBe(created);
    expect(created).toMatchObject({
      title: "英単語",
      description: "10個",
      priority: "high",
      category: "study",
      recurrence: "daily",
      dueDate: "2026-11-14",
      seriesId: "d1", // 仲間 ID を引き継ぐ
      completed: false,
      completedAt: null,
      focusDate: null,
    });
    expect(created!.id).not.toBe("d1");
  });

  it("チェックを外して付け直しても、次回分を重ねて作らない", () => {
    const daily = createTask({ title: "英単語", recurrence: "daily" }, { id: "d1", now: NOW });
    const first = toggleTaskWithResult([daily], "d1", COMPLETED_AT).tasks; // 次回分ができる
    const unchecked = toggleTask(first, "d1", COMPLETED_AT);
    const second = toggleTaskWithResult(unchecked, "d1", COMPLETED_AT);

    expect(second.created).toBeNull();
    expect(second.tasks).toHaveLength(2);
  });
});

describe("setFocus（今日やる）", () => {
  const TODAY = "2026-11-13";
  const make = (n: number) => Array.from({ length: n }, (_, i) => createTask(`T${i}`, { id: `t${i}` }));

  it("今日の日付で「今日やる」に選び、外すと null に戻る", () => {
    const on = setFocus(make(1), "t0", true, TODAY);
    expect(on.ok && on.tasks[0].focusDate).toBe(TODAY);
    const off = on.ok ? setFocus(on.tasks, "t0", false, TODAY) : on;
    expect(off.ok && off.tasks[0].focusDate).toBeNull();
  });

  it(`未完了の「今日やる」は ${FOCUS_LIMIT} 件まで。超えると配列を変えずに limit を返す`, () => {
    let tasks = make(4);
    for (const id of ["t0", "t1", "t2"]) {
      const result = setFocus(tasks, id, true, TODAY);
      if (result.ok) tasks = result.tasks;
    }
    expect(countFocused(tasks, TODAY)).toBe(3);
    expect(setFocus(tasks, "t3", true, TODAY)).toEqual({ ok: false, reason: "limit" });
  });

  it("完了した「今日やる」は上限に数えないので、次を選べる", () => {
    let tasks = make(4).map((t, i) => (i < 3 ? { ...t, focusDate: TODAY } : t));
    tasks = toggleTask(tasks, "t0");
    expect(setFocus(tasks, "t3", true, TODAY).ok).toBe(true);
  });

  it("昨日選んだものは、今日の「今日やる」には数えない（日付が変わると自動で外れる）", () => {
    const tasks = make(3).map((t) => ({ ...t, focusDate: "2026-11-12" }));
    expect(countFocused(tasks, TODAY)).toBe(0);
  });
});
