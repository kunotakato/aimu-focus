import { describe, expect, it } from "vitest";
import {
  TITLE_MAX_LENGTH,
  addTask,
  createTask,
  deleteTask,
  toggleTask,
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
    const changes = { title: "A改", description: "説明", priority: "high" as const, dueDate: "2026-12-01" };
    const result = updateTask([a, b], "a", changes, LATER);
    expect(result[0]).toEqual({ ...a, ...changes, updatedAt: LATER.toISOString() });
    expect(result[0].createdAt).toBe(a.createdAt);
    expect(result[1]).toBe(b);
  });

  it("updateTask で内容が何も変わらなければ、更新日時も変えない", () => {
    const same = { title: a.title, description: a.description, priority: a.priority, dueDate: a.dueDate };
    expect(updateTask([a], "a", same, LATER)[0]).toBe(a);
  });

  it("deleteTask は対象のタスクだけを取り除く", () => {
    expect(deleteTask([a, b], "a")).toEqual([b]);
  });

  it("どの関数も元の配列を書き換えない", () => {
    const original = [a, b];
    addTask(original, createTask("C"));
    toggleTask(original, "a");
    updateTask(original, "a", { title: "X", description: "", priority: "low", dueDate: null });
    deleteTask(original, "a");
    expect(original).toEqual([a, b]);
    expect(a.completed).toBe(false);
  });
});
