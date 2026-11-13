/**
 * 週の振り返り（課題2-F）の集計。
 * 完了日時（completedAt）を利用者の地域の日付に直して、日ごとに数える。
 * 週は月曜はじまり（日本の仕事の週に合わせる）。
 */
import { toLocalDateString } from "@/lib/date";
import type { Task } from "@/types/task";

export type ReviewDay = {
  /** "YYYY-MM-DD" */
  date: string;
  /** "月" 〜 "日" */
  weekday: string;
  count: number;
  isToday: boolean;
  isFuture: boolean;
};

export type WeeklyReview = {
  /** 今週の月曜〜日曜 */
  days: ReviewDay[];
  thisWeek: number;
  lastWeek: number;
  /** 1件以上完了した日が、何日続いているか */
  streak: number;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM-DD" に日数を足す（UTC で計算して時差のずれを防ぐ） */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = 日曜
}

/** その日を含む週の月曜日 */
export function startOfWeek(date: string): string {
  const daysSinceMonday = (weekdayIndex(date) + 6) % 7; // 月曜 = 0、日曜 = 6
  return shiftDate(date, -daysSinceMonday);
}

/** 日付ごとの完了件数を数える（Map = 「日付 → 件数」の対応表） */
export function countCompletionsByDate(tasks: Task[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.completed || task.completedAt === null) continue;
    const date = toLocalDateString(new Date(task.completedAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

/**
 * 連続日数。今日すでに完了していれば今日から、まだなら昨日からさかのぼって数える
 * （今日まだ完了していなくても、今日が終わるまでは記録が途切れないようにするため）。
 */
export function calcStreak(counts: Map<string, number>, today: string): number {
  let day = (counts.get(today) ?? 0) > 0 ? today : shiftDate(today, -1);
  let streak = 0;
  while ((counts.get(day) ?? 0) > 0) {
    streak += 1;
    day = shiftDate(day, -1);
  }
  return streak;
}

export function computeWeeklyReview(tasks: Task[], today: string): WeeklyReview {
  const counts = countCompletionsByDate(tasks);
  const monday = startOfWeek(today);

  const days = Array.from({ length: 7 }, (_, i): ReviewDay => {
    const date = shiftDate(monday, i);
    return {
      date,
      weekday: WEEKDAYS[weekdayIndex(date)],
      count: counts.get(date) ?? 0,
      isToday: date === today,
      isFuture: date > today,
    };
  });

  const sumWeek = (start: string) =>
    Array.from({ length: 7 }, (_, i) => counts.get(shiftDate(start, i)) ?? 0).reduce((a, b) => a + b, 0);

  return {
    days,
    thisWeek: sumWeek(monday),
    lastWeek: sumWeek(shiftDate(monday, -7)),
    streak: calcStreak(counts, today),
  };
}
