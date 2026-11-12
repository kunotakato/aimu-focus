import { describe, expect, it } from "vitest";
import { daysBetween, formatDueDate, getDueStatus, isOverdue, toLocalDateString } from "@/lib/date";

const TODAY = "2026-11-12";

describe("toLocalDateString", () => {
  it("利用者の地域の日付で YYYY-MM-DD にする（1桁の月日は0で埋める）", () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("daysBetween", () => {
  it("日数の差を返す（月をまたいでも正しい）", () => {
    expect(daysBetween(TODAY, "2026-11-13")).toBe(1);
    expect(daysBetween(TODAY, "2026-11-10")).toBe(-2);
    expect(daysBetween("2026-11-30", "2026-12-01")).toBe(1);
  });
});

describe("isOverdue（期限切れの判定）", () => {
  it("期限が昨日以前で未完了なら期限切れ", () => {
    expect(isOverdue({ completed: false, dueDate: "2026-11-11" }, TODAY)).toBe(true);
  });

  it("期限が今日なら、まだ期限切れではない", () => {
    expect(isOverdue({ completed: false, dueDate: TODAY }, TODAY)).toBe(false);
  });

  it("完了済み・期限なしは期限切れにしない", () => {
    expect(isOverdue({ completed: true, dueDate: "2026-11-01" }, TODAY)).toBe(false);
    expect(isOverdue({ completed: false, dueDate: null }, TODAY)).toBe(false);
  });
});

describe("getDueStatus", () => {
  it.each([
    [null, { kind: "none" }],
    ["2026-11-09", { kind: "overdue", days: 3 }],
    ["2026-11-12", { kind: "today" }],
    ["2026-11-15", { kind: "soon", days: 3 }],
    ["2026-11-16", { kind: "later", days: 4 }],
  ])("期限 %s → %o", (dueDate, expected) => {
    expect(getDueStatus({ completed: false, dueDate }, TODAY)).toEqual(expected);
  });
});

describe("formatDueDate", () => {
  it("曜日つきの日本語表記にする", () => {
    expect(formatDueDate("2026-11-30")).toBe("2026年11月30日(月)");
  });
});
