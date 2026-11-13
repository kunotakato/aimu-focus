import { describe, expect, it } from "vitest";
import { calcStreak, computeWeeklyReview, shiftDate, startOfWeek } from "@/lib/review";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

/** 指定した日（利用者の地域の日付）の正午に完了したタスク */
function doneOn(date: string, id = date + Math.random()): Task {
  const [y, m, d] = date.split("-").map(Number);
  const completedAt = new Date(y, m - 1, d, 12, 0).toISOString();
  return { ...createTask("x", { id }), completed: true, completedAt };
}

const TODAY = "2026-11-13"; // 金曜日

describe("日付の計算", () => {
  it("startOfWeek は月曜日を返す（日曜は前の週の月曜）", () => {
    expect(startOfWeek("2026-11-13")).toBe("2026-11-09");
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09");
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09"); // 日曜
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // 月をまたぐ
  });

  it("shiftDate は月・年をまたいで日数を足し引きできる", () => {
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("computeWeeklyReview（週の振り返り）", () => {
  it("今週・先週の完了件数と、曜日ごとの件数を数える", () => {
    const tasks = [
      doneOn("2026-11-09"), // 今週 月
      doneOn("2026-11-13"), // 今週 金（今日）
      doneOn("2026-11-13"),
      doneOn("2026-11-08"), // 先週 日
      doneOn("2026-11-02"), // 先週 月
      doneOn("2026-11-01"), // 先々週（数えない）
      createTask("未完了は数えない"),
    ];
    const review = computeWeeklyReview(tasks, TODAY);

    expect(review.thisWeek).toBe(3);
    expect(review.lastWeek).toBe(2);
    expect(review.days.map((d) => d.weekday)).toEqual(["月", "火", "水", "木", "金", "土", "日"]);
    expect(review.days.map((d) => d.count)).toEqual([1, 0, 0, 0, 2, 0, 0]);
    expect(review.days[4]).toMatchObject({ isToday: true, isFuture: false });
    expect(review.days[5].isFuture).toBe(true);
  });

  it("完了を取り消したタスク（completedAt が null）は数えない", () => {
    const undone = { ...doneOn(TODAY), completed: false, completedAt: null };
    expect(computeWeeklyReview([undone], TODAY).thisWeek).toBe(0);
  });

  it("0件でも7日分の枠を返す", () => {
    const review = computeWeeklyReview([], TODAY);
    expect(review.days).toHaveLength(7);
    expect(review).toMatchObject({ thisWeek: 0, lastWeek: 0, streak: 0 });
  });
});

describe("calcStreak（連続日数）", () => {
  const counts = (dates: string[]) => new Map(dates.map((d) => [d, 1]));

  it("今日完了していれば、今日から数える", () => {
    expect(calcStreak(counts(["2026-11-11", "2026-11-12", "2026-11-13"]), TODAY)).toBe(3);
  });

  it("今日まだ完了していなくても、昨日まで続いていれば途切れない", () => {
    expect(calcStreak(counts(["2026-11-11", "2026-11-12"]), TODAY)).toBe(2);
  });

  it("1日でも空くと、そこで止まる", () => {
    expect(calcStreak(counts(["2026-11-10", "2026-11-12", "2026-11-13"]), TODAY)).toBe(2);
    expect(calcStreak(counts(["2026-11-11"]), TODAY)).toBe(0);
  });
});
