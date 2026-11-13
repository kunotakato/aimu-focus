import { describe, expect, it } from "vitest";
import { createTask } from "@/lib/tasks";
import { isTask, isValidDateString, pickValidTasks } from "@/lib/validation";

const valid = createTask("正しいタスク", { id: "ok", now: new Date("2026-11-12T00:00:00Z") });

describe("isValidDateString（期限日の形式チェック）", () => {
  it("実在する YYYY-MM-DD だけを受け付ける", () => {
    expect(isValidDateString("2026-11-30")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true); // うるう年
    expect(isValidDateString("2026-02-31")).toBe(false); // 存在しない日
    expect(isValidDateString("2026/11/30")).toBe(false);
    expect(isValidDateString("明日")).toBe(false);
  });
});

describe("isTask（タスクの形チェック）", () => {
  it("正しいタスクは true", () => {
    expect(isTask(valid)).toBe(true);
    expect(isTask({ ...valid, dueDate: "2026-12-01", priority: "high" })).toBe(true);
  });

  it.each([
    ["null", null],
    ["文字列", "task"],
    ["配列", [valid]],
    ["id が空", { ...valid, id: "" }],
    ["title が空白だけ", { ...valid, title: "   " }],
    ["completed が文字列", { ...valid, completed: "true" }],
    ["priority が想定外", { ...valid, priority: "urgent" }],
    ["dueDate の形式が違う", { ...valid, dueDate: "12/01" }],
    ["createdAt が日時でない", { ...valid, createdAt: "きのう" }],
    ["項目が足りない", { id: "x", title: "x" }],
  ])("%s は false", (_label, value) => {
    expect(isTask(value)).toBe(false);
  });
});

describe("pickValidTasks", () => {
  it("正しいタスクだけを残し、除いた件数を返す（ID の重複も除く）", () => {
    const result = pickValidTasks([valid, { broken: true }, { ...valid }, 42]);
    expect(result.tasks).toEqual([valid]);
    expect(result.skipped).toBe(3);
  });
});

describe("isTask：課題2で増えた項目", () => {
  it.each([
    ["カテゴリが想定外", { category: "hobby" }],
    ["繰り返しが想定外", { recurrence: "yearly" }],
    ["仲間 ID が空", { seriesId: "" }],
    ["「今日やる」の日付が不正", { focusDate: "today" }],
    ["完了済みなのに完了日時がない", { completed: true, completedAt: null }],
    ["未完了なのに完了日時がある", { completed: false, completedAt: "2026-11-12T00:00:00Z" }],
  ])("%s は false", (_label, fields) => {
    expect(isTask({ ...valid, ...fields })).toBe(false);
  });

  it("正しい値なら true", () => {
    expect(
      isTask({ ...valid, category: "work", recurrence: "weekly", focusDate: "2026-11-13", completed: true, completedAt: "2026-11-13T00:00:00Z" }),
    ).toBe(true);
  });
});
