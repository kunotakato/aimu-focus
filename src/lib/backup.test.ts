import { describe, expect, it } from "vitest";
import { backupFileName, createBackup, parseBackup, serializeBackup } from "@/lib/backup";
import { createTask } from "@/lib/tasks";

const NOW = new Date("2026-11-12T00:30:00.000Z");
const a = createTask({ title: "A", priority: "high", dueDate: "2026-12-01" }, { id: "a", now: NOW });
const b = { ...createTask("B", { id: "b", now: NOW }), completed: true, completedAt: NOW.toISOString() };

/** 正しいバックアップの中身を、一部だけ書き換えた JSON 文字列を作る */
function backupJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...createBackup([a, b], [], NOW), ...overrides });
}

describe("バックアップの作成", () => {
  it("アプリ名・形式番号・書き出し日時・タスクを含む", () => {
    expect(createBackup([a], [], NOW)).toEqual({
      app: "aimu-focus",
      version: 3,
      exportedAt: "2026-11-12T00:30:00.000Z",
      tasks: [a],
      templates: [],
    });
  });

  it("書き出した内容は、そのまま復元できる（往復しても変わらない）", () => {
    const result = parseBackup(serializeBackup(createBackup([a, b], [], NOW)));
    expect(result).toEqual({ ok: true, backup: createBackup([a, b], [], NOW) });
  });

  it("ファイル名に日時が入る", () => {
    expect(backupFileName(new Date(2026, 10, 12, 9, 5))).toBe("aimu-focus-backup-20261112-0905.json");
  });

  it("0件でも書き出し・復元できる", () => {
    expect(parseBackup(serializeBackup(createBackup([], [], NOW)))).toMatchObject({ ok: true, backup: { tasks: [] } });
  });
});

describe("復元前のデータ検証（不正なデータは読み込まない）", () => {
  it.each([
    ["JSON でない", "これはJSONではない", "ファイルの中身を読み取れません"],
    ["別アプリのファイル", JSON.stringify({ app: "other", version: 1, tasks: [] }), "バックアップファイルではありません"],
    ["配列だけ", JSON.stringify([a]), "バックアップファイルではありません"],
    ["形式番号が違う", backupJson({ version: 99 }), "バージョン"],
    ["書き出し日時が不正", backupJson({ exportedAt: "昨日" }), "作成日時"],
    ["tasks が配列でない", backupJson({ tasks: {} }), "タスクの一覧"],
    ["不正なタスクを含む", backupJson({ tasks: [a, { ...b, priority: "urgent" }, { id: "x" }] }), "正しくないタスクが2件"],
    ["ID が重複", backupJson({ tasks: [a, { ...b, id: "a" }] }), "重複"],
  ])("%s → 読み込まない", (_label, text, expectedError) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(expectedError);
  });
});

describe("形式1（課題1）のバックアップファイル", () => {
  it("読み込むときに形式2へ変換して復元できる", () => {
    const v1Task = {
      id: "old",
      title: "課題1のバックアップ",
      description: "",
      completed: true,
      priority: "low",
      dueDate: null,
      createdAt: "2026-11-10T00:00:00.000Z",
      updatedAt: "2026-11-11T00:00:00.000Z",
    };
    const text = JSON.stringify({ app: "aimu-focus", version: 1, exportedAt: "2026-11-12T00:00:00.000Z", tasks: [v1Task] });
    const result = parseBackup(text);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.version).toBe(3);
      expect(result.backup.templates).toBeNull(); // 古い形式にはテンプレートが入っていない
      expect(result.backup.tasks[0]).toMatchObject({
        ...v1Task,
        category: null,
        recurrence: "none",
        seriesId: "old",
        completedAt: "2026-11-11T00:00:00.000Z",
      });
    }
  });
});

describe("形式3：テンプレート入りのバックアップ（課題2-L）", () => {
  const template = {
    id: "tpl",
    title: "週報を書く",
    description: "",
    priority: "medium" as const,
    category: "work" as const,
    recurrence: "weekly" as const,
    createdAt: NOW.toISOString(),
  };

  it("テンプレートも書き出し、そのまま復元できる", () => {
    const result = parseBackup(serializeBackup(createBackup([a], [template], NOW)));
    expect(result.ok && result.backup.templates).toEqual([template]);
  });

  it("形式2（テンプレートなし）のファイルは templates が null（今のテンプレートに触らない）", () => {
    const v2 = JSON.stringify({ app: "aimu-focus", version: 2, exportedAt: NOW.toISOString(), tasks: [a] });
    const result = parseBackup(v2);
    expect(result.ok && result.backup.templates).toBeNull();
  });

  it.each([
    ["テンプレートの一覧がない", { templates: undefined }],
    ["不正なテンプレートを含む", { templates: [{ ...template, priority: "urgent" }] }],
    ["上限を超えている", { templates: Array.from({ length: 11 }, (_, i) => ({ ...template, id: `t${i}` })) }],
  ])("%s → 読み込まない", (_label, overrides) => {
    const result = parseBackup(backupJson(overrides));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("テンプレート");
  });
});
