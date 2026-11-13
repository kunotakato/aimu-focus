import { describe, expect, it } from "vitest";
import { EMPTY_FORM_VALUES, toFormValues, validateTaskForm } from "@/lib/taskForm";
import { DESCRIPTION_MAX_LENGTH, createTask } from "@/lib/tasks";

describe("validateTaskForm（入力フォームのチェック）", () => {
  it("入力を整えて TaskInput に変換する（期限なしの空文字は null に）", () => {
    expect(
      validateTaskForm({ ...EMPTY_FORM_VALUES, title: "  資料作成 ", description: " メモ \n", priority: "high", category: "work" }),
    ).toEqual({
      ok: true,
      value: { title: "資料作成", description: "メモ", priority: "high", dueDate: null, category: "work", recurrence: "none" },
    });
  });

  it("期限日があればそのまま使う", () => {
    const result = validateTaskForm({ ...EMPTY_FORM_VALUES, title: "A", dueDate: "2026-12-01" });
    expect(result.ok && result.value.dueDate).toBe("2026-12-01");
  });

  it("タスク名が空白だけ・説明が長すぎる・期限日が不正なら、それぞれエラー", () => {
    const result = validateTaskForm({
      ...EMPTY_FORM_VALUES,
      title: "　",
      description: "あ".repeat(DESCRIPTION_MAX_LENGTH + 1),
      priority: "medium",
      dueDate: "2026-13-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["description", "dueDate", "title"]);
    }
  });

  it("既存のタスクをフォームの値に変換できる（期限なしは空文字に）", () => {
    const task = createTask({ title: "A", priority: "low" });
    expect(toFormValues(task)).toEqual({
      title: "A",
      description: "",
      priority: "low",
      dueDate: "",
      category: "",
      recurrence: "none",
    });
  });
});
