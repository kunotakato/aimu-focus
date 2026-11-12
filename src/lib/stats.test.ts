import { describe, expect, it } from "vitest";
import { calcCompletionRate, computeStats } from "@/lib/stats";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

const TODAY = "2026-11-12";
const t = (fields: Partial<Task>): Task => ({ ...createTask("x"), ...fields });

describe("calcCompletionRate（完了率）", () => {
  it("0件のときは null（0% と表示して誤解させない）", () => {
    expect(calcCompletionRate(0, 0)).toBeNull();
  });

  it("割合を整数で返す", () => {
    expect(calcCompletionRate(0, 4)).toBe(0);
    expect(calcCompletionRate(1, 4)).toBe(25);
    expect(calcCompletionRate(4, 4)).toBe(100);
  });

  it("切り捨てにして、全部終わっていないのに 100% と表示しない", () => {
    expect(calcCompletionRate(199, 200)).toBe(99);
    expect(calcCompletionRate(2, 3)).toBe(66);
  });
});

describe("computeStats（ダッシュボードの集計）", () => {
  it("0件なら、すべて0で完了率は null", () => {
    expect(computeStats([], TODAY)).toEqual({ total: 0, completed: 0, active: 0, completionRate: null, overdue: 0 });
  });

  it("全体・完了・未完了・完了率・期限切れを数える", () => {
    const tasks = [
      t({ completed: true }),
      t({ completed: true, dueDate: "2026-11-01" }), // 完了済みなので期限切れに数えない
      t({ dueDate: "2026-11-11" }), // 期限切れ
      t({ dueDate: TODAY }), // 今日まで（期限切れではない）
      t({}),
    ];
    expect(computeStats(tasks, TODAY)).toEqual({ total: 5, completed: 2, active: 3, completionRate: 40, overdue: 1 });
  });
});
