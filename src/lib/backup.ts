/**
 * JSON ファイルによるバックアップ（書き出し）と復元（読み込み）。
 *
 * localStorage はブラウザのデータ消去などで消えることがあるため、
 * 利用者が自分の端末にファイルとして保存できるようにする。
 *
 * 復元するファイルは「外から来た、信用できないデータ」として扱い、
 * 1件でもおかしなタスクが含まれていたら、ファイル全体を読み込まない（中途半端に復元しない）。
 */
import { isTask } from "@/lib/validation";
import type { Task } from "@/types/task";

export const BACKUP_APP_ID = "aimu-focus";
export const BACKUP_VERSION = 1;
/** 読み込めるファイルの最大サイズ（5MB）。巨大なファイルでブラウザが固まるのを防ぐ */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export type BackupFile = {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  tasks: Task[];
};

export function createBackup(tasks: Task[], now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: now.toISOString(), tasks };
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

  const { version, exportedAt, tasks } = data as Record<string, unknown>;

  if (version !== BACKUP_VERSION) {
    return { ok: false, error: "このアプリでは読み込めないバージョンのバックアップです。" };
  }
  if (typeof exportedAt !== "string" || Number.isNaN(Date.parse(exportedAt))) {
    return { ok: false, error: "バックアップの作成日時が正しくありません。" };
  }
  if (!Array.isArray(tasks)) {
    return { ok: false, error: "バックアップにタスクの一覧が含まれていません。" };
  }

  const invalidCount = tasks.filter((task) => !isTask(task)).length;
  if (invalidCount > 0) {
    return {
      ok: false,
      error: `正しくないタスクが${invalidCount}件含まれているため、読み込みを中止しました（データは変更していません）。`,
    };
  }

  const ids = new Set((tasks as Task[]).map((task) => task.id));
  if (ids.size !== tasks.length) {
    return { ok: false, error: "同じタスクが重複して含まれているため、読み込みを中止しました（データは変更していません）。" };
  }

  return {
    ok: true,
    backup: { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt, tasks: tasks as Task[] },
  };
}
