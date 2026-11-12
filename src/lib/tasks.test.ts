import { describe, expect, it } from "vitest";
import {
  TITLE_MAX_LENGTH,
  addTask,
  createTask,
  deleteTask,
  toggleTask,
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

  it("deleteTask は対象のタスクだけを取り除く", () => {
    expect(deleteTask([a, b], "a")).toEqual([b]);
  });

  it("どの関数も元の配列を書き換えない", () => {
    const original = [a, b];
    addTask(original, createTask("C"));
    toggleTask(original, "a");
    deleteTask(original, "a");
    expect(original).toEqual([a, b]);
    expect(a.completed).toBe(false);
  });
});
