import { describe, expect, it } from "vitest";
import { buildDailyReport } from "@/lib/report";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

const TODAY = "2026-11-16"; // 月曜日

/** 指定した日（利用者の地域の日付）の、指定した時刻に完了したタスク */
function doneAt(title: string, date: string, hour: number, fields: Partial<Task> = {}): Task {
  const [y, m, d] = date.split("-").map(Number);
  return {
    ...createTask(title, { id: title }),
    completed: true,
    completedAt: new Date(y, m - 1, d, hour).toISOString(),
    ...fields,
  };
}

const active = (title: string, fields: Partial<Task> = {}): Task => ({ ...createTask(title, { id: title }), ...fields });

describe("buildDailyReport（日報の文章）", () => {
  it("今日完了したこと（完了した順）と、明日やることをまとめる", () => {
    const tasks = [
      doneAt("午後の作業", TODAY, 15, { category: "work" }),
      doneAt("朝の作業", TODAY, 9),
      doneAt("昨日の作業", "2026-11-15", 18), // 昨日完了 → 載せない
      active("明日締切", { dueDate: "2026-11-17", category: "side" }),
      active("今日締切", { dueDate: TODAY }),
      active("遅れている", { dueDate: "2026-11-12" }),
      active("今日やる（期限なし）", { focusDate: TODAY }),
      active("来週締切", { dueDate: "2026-11-23" }), // 明後日以降 → 載せない
      active("期限なし"), // 載せない
    ];
    const report = buildDailyReport(tasks, TODAY);

    expect(report.text).toBe(
      [
        "【日報】2026年11月16日(月)",
        "",
        "■ 今日完了したこと（2件）",
        "・朝の作業",
        "・午後の作業［仕事］",
        "",
        "■ 明日やること（4件）",
        "・遅れている（期限切れ 11/12(木)）",
        "・今日締切（今日まで）",
        "・明日締切［副業］（明日まで）",
        "・今日やる（期限なし）（今日やる）",
      ].join("\n"),
    );
    expect(report).toMatchObject({ doneCount: 2, nextCount: 4 });
  });

  it("今日やるに選んだが、期限が先のタスクは期限を書く", () => {
    const report = buildDailyReport([active("先の締切", { dueDate: "2026-11-20", focusDate: TODAY })], TODAY);
    expect(report.text).toContain("・先の締切（期限 11/20(金)）");
  });

  it("昨日選んだ今日やるは、明日やることに入れない", () => {
    const report = buildDailyReport([active("昨日の今日やる", { focusDate: "2026-11-15" })], TODAY);
    expect(report.nextCount).toBe(0);
  });

  it("どちらも0件なら「なし」と書く", () => {
    const report = buildDailyReport([], TODAY);
    expect(report.text).toContain("■ 今日完了したこと（0件）\n・なし");
    expect(report.text).toContain("■ 明日やること（0件）\n・なし");
  });
});
