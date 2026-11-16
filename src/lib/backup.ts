/**
 * JSON ファイルによるバックアップ（書き出し）と復元（読み込み）。
 *
 * localStorage はブラウザのデータ消去などで消えることがあるため、
 * 利用者が自分の端末にファイルとして保存できるようにする。
 *
 * 復元するファイルは「外から来た、信用できないデータ」として扱い、
 * 1件でもおかしなタスクが含まれていたら、ファイル全体を読み込まない（中途半端に復元しない）。
 */
import { TEMPLATE_LIMIT, isTemplate } from "@/lib/templates";
import { isTask, migrateTaskFromV1 } from "@/lib/validation";
import type { Task } from "@/types/task";
import type { Template } from "@/types/template";

export const BACKUP_APP_ID = "aimu-focus";
/**
 * バックアップファイルの形式番号。
 *   1: 課題1（タスクのみ・基本の項目）
 *   2: 課題2（タスクの項目が増えた）
 *   3: 課題2-L（テンプレートも含む）
 * 古い形式のファイルも読み込める。形式1・2にはテンプレートが入っていないので、
 * 復元しても今のテンプレートには触らない（templates が null）。
 */
export const BACKUP_VERSION = 3;
/** 読み込めるファイルの最大サイズ（5MB）。巨大なファイルでブラウザが固まるのを防ぐ */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export type BackupFile = {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  tasks: Task[];
  /** テンプレート。古い形式のファイルから読み込んだときは null（「入っていない」という意味） */
  templates: Template[] | null;
};

export function createBackup(tasks: Task[], templates: Template[], now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: now.toISOString(), tasks, templates };
}

/** 人が読んでも分かるよう、字下げ（2スペース）付きの JSON 文字列にする */
export function serializeBackup(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/** "aimu-focus-backup-20261112-0930.json" のようなファイル名 */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `aimu-focus-backup-${date}-${time}.json`;
}

export type ParseBackupResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string };

/** ファイルの中身（文字列）を調べて、復元してよいデータか判定する */
export function parseBackup(text: string): ParseBackupResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "ファイルの中身を読み取れませんでした。ファイルが壊れていないか確認してください。" };
  }

  if (typeof data !== "object" || data === null || (data as { app?: unknown }).app !== BACKUP_APP_ID) {
    return { ok: false, error: "Aimu Focus のバックアップファイルではありません。" };
  }

  const { version, exportedAt, tasks, templates } = data as Record<string, unknown>;

  if (version !== 1 && version !== 2 && version !== BACKUP_VERSION) {
    return { ok: false, error: "このアプリでは読み込めないバージョンのバックアップです。" };
  }
  if (typeof exportedAt !== "string" || Number.isNaN(Date.parse(exportedAt))) {
    return { ok: false, error: "バックアップの作成日時が正しくありません。" };
  }
  if (!Array.isArray(tasks)) {
    return { ok: false, error: "バックアップにタスクの一覧が含まれていません。" };
  }

  const migrated = version === 1 ? tasks.map(migrateTaskFromV1) : tasks;
  const invalidCount = migrated.filter((task) => !isTask(task)).length;
  if (invalidCount > 0) {
    return {
      ok: false,
      error: `正しくないタスクが${invalidCount}件含まれているため、読み込みを中止しました（データは変更していません）。`,
    };
  }

  const ids = new Set((migrated as Task[]).map((task) => task.id));
  if (ids.size !== migrated.length) {
    return { ok: false, error: "同じタスクが重複して含まれているため、読み込みを中止しました（データは変更していません）。" };
  }

  // 形式3：テンプレートも確かめる（1つでもおかしければ読み込まない）
  let checkedTemplates: Template[] | null = null;
  if (version === BACKUP_VERSION) {
    if (!Array.isArray(templates) || templates.length > TEMPLATE_LIMIT || !templates.every(isTemplate)) {
      return {
        ok: false,
        error: "正しくないテンプレートが含まれているため、読み込みを中止しました（データは変更していません）。",
      };
    }
    checkedTemplates = templates;
  }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt,
      tasks: migrated as Task[],
      templates: checkedTemplates,
    },
  };
}
