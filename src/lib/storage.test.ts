import { describe, expect, it, vi } from "vitest";
import {
  BACKUP_KEY_PREFIX,
  STORAGE_KEY,
  backupRawData,
  loadTasks,
  saveTasks,
} from "@/lib/storage";
import { createTask } from "@/lib/tasks";

const NOW = new Date("2026-11-12T00:00:00Z");
const taskA = createTask("A", { id: "a", now: NOW });
const taskB = { ...createTask("B", { id: "b", now: NOW }), completed: true };

describe("saveTasks / loadTasks", () => {
  it("初めて開いたとき（データなし）は空の一覧で、問題なし", () => {
    expect(loadTasks()).toEqual({ tasks: [], issue: null });
  });

  it("保存したタスクを、そのまま復元できる", () => {
    expect(saveTasks([taskA, taskB])).toEqual({ ok: true });
    expect(loadTasks()).toEqual({ tasks: [taskA, taskB], issue: null });
  });

  it("形式番号（version）付きの JSON で保存する", () => {
    saveTasks([taskA]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual({ version: 1, tasks: [taskA] });
  });
});

describe("不正な保存データの処理", () => {
  it.each([
    ["JSON として読めない", "{これはJSONではない"],
    ["配列だけ（version なし）", JSON.stringify([taskA])],
    ["未知の version", JSON.stringify({ version: 99, tasks: [taskA] })],
    ["tasks が配列でない", JSON.stringify({ version: 1, tasks: "A" })],
    ["null", "null"],
  ])("%s → 例外を投げず、corrupted として空の一覧を返す", (_label, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadTasks()).toEqual({ tasks: [], issue: { type: "corrupted", raw } });
  });

  it("一部だけ壊れている → 読めるタスクだけ返し、読めなかった件数を伝える", () => {
    const raw = JSON.stringify({ version: 1, tasks: [taskA, { title: 123 }, taskB] });
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadTasks()).toEqual({
      tasks: [taskA, taskB],
      issue: { type: "partial", skipped: 1, raw },
    });
  });

  it("localStorage が使えない → unavailable を返す", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(loadTasks()).toEqual({ tasks: [], issue: { type: "unavailable" } });
  });
});

describe("書き込みエラーの処理", () => {
  it("容量オーバー → 例外を投げず quota を返す", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveTasks([taskA])).toEqual({ ok: false, reason: "quota" });
  });

  it("その他のエラー → unavailable を返す", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unknown");
    });
    expect(saveTasks([taskA])).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("backupRawData（元データの退避）", () => {
  it("日時付きの別キーにそのまま保存し、そのキーを返す", () => {
    const key = backupRawData("壊れたデータ", NOW);
    expect(key).toBe(`${BACKUP_KEY_PREFIX}2026-11-12T00:00:00.000Z`);
    expect(localStorage.getItem(key!)).toBe("壊れたデータ");
  });

  it("書き込みに失敗したら null を返す", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(backupRawData("x")).toBeNull();
  });
});
