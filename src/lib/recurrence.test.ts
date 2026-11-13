import { describe, expect, it } from "vitest";
import { addInterval, nextDueDate } from "@/lib/recurrence";

describe("addInterval（間隔を1回分進める）", () => {
  it("毎日・毎週は、月や年をまたいでも正しく進む", () => {
    expect(addInterval("2026-11-30", "daily")).toBe("2026-12-01");
    expect(addInterval("2026-12-29", "weekly")).toBe("2027-01-05");
  });

  it("毎月は翌月の同じ日。その日がない月は末日にする", () => {
    expect(addInterval("2026-11-15", "monthly")).toBe("2026-12-15");
    expect(addInterval("2026-12-31", "monthly")).toBe("2027-01-31");
    expect(addInterval("2027-01-31", "monthly")).toBe("2027-02-28");
    expect(addInterval("2028-01-31", "monthly")).toBe("2028-02-29"); // うるう年
  });
});

describe("nextDueDate（次回の期限日）", () => {
  const TODAY = "2026-11-13"; // 金曜日

  it("毎日：今日が期限のタスクを完了 → 明日", () => {
    expect(nextDueDate("daily", TODAY, TODAY)).toBe("2026-11-14");
  });

  it("毎日：期限が数日前のまま完了 → 明日（過去の分を作り直さない）", () => {
    expect(nextDueDate("daily", "2026-11-10", TODAY)).toBe("2026-11-14");
  });

  it("期限なし → 今日を基準にする", () => {
    expect(nextDueDate("daily", null, TODAY)).toBe("2026-11-14");
    expect(nextDueDate("weekly", null, TODAY)).toBe("2026-11-20");
  });

  it("毎週：期限より早く完了 → 期限の1週間後", () => {
    expect(nextDueDate("weekly", "2026-11-16", TODAY)).toBe("2026-11-23");
  });

  it("毎週：期限を過ぎてから完了 → 同じ曜日の、今日より後の日", () => {
    expect(nextDueDate("weekly", "2026-11-02", TODAY)).toBe("2026-11-16");
  });

  it("毎月：期限が今日 → 翌月の同じ日", () => {
    expect(nextDueDate("monthly", TODAY, TODAY)).toBe("2026-12-13");
  });
});
