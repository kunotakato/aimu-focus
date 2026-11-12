"use client";

/**
 * バックアップ（JSON ファイルへの書き出し）と復元（読み込み）。
 *
 * データを失わないための仕組み:
 *   1. 読み込んだファイルは、中身をすべてチェックしてから使う（1件でも不正なら読み込まない）
 *   2. 復元の前に「何件が、何件に置き換わるか」を見せて確認する
 *   3. 確認画面から、今のデータを先にバックアップできる
 *   4. 復元した直後は「元に戻す」ができる
 */
import { useId, useState, type ChangeEvent } from "react";
import { Notice } from "@/components/Notice";
import { SpinnerIcon } from "@/components/icons";
import {
  BACKUP_MAX_BYTES,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  type BackupFile,
} from "@/lib/backup";
import { formatDateTime } from "@/lib/date";
import { downloadTextFile } from "@/lib/download";
import type { Task } from "@/types/task";

type Props = {
  tasks: Task[];
  onRestore: (tasks: Task[]) => void;
};

type Message = { variant: "info" | "error"; text: string };

const secondaryButton =
  "min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export function BackupPanel({ tasks, onRestore }: Props) {
  const id = useId();
  const [message, setMessage] = useState<Message | null>(null);
  const [reading, setReading] = useState(false);
  /** 確認待ちの復元データ */
  const [pending, setPending] = useState<{ backup: BackupFile; fileName: string } | null>(null);
  /**
   * 「元に戻す」用の記録。previous = 復元前の一覧、restored = 復元した一覧。ページを閉じると消える。
   * 復元のあとにタスクを追加・編集すると tasks は別の配列になるので、そのときは元に戻せないようにする
   * （元に戻すと、復元後の変更まで消えてしまうため）。
   */
  const [undo, setUndo] = useState<{ previous: Task[]; restored: Task[] } | null>(null);
  const canUndo = undo !== null && undo.restored === tasks;

  function exportBackup() {
    const fileName = backupFileName();
    setUndo(null); // 書き出したあとは「元に戻す」の案内を出さない
    downloadTextFile(fileName, serializeBackup(createBackup(tasks)));
    setMessage({
      variant: "info",
      text: `バックアップ「${fileName}」（${tasks.length}件）の保存を開始しました。ダウンロードフォルダを確認してください。`,
    });
  }

  // ファイルが選ばれたときの処理。ファイルの読み込みは時間がかかるので async（非同期）で待つ
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    // 同じファイルをもう一度選んでも反応するよう、選択状態をリセットしておく
    input.value = "";
    if (!file) return;

    setMessage(null);
    setPending(null);

    if (file.size > BACKUP_MAX_BYTES) {
      setMessage({ variant: "error", text: "ファイルが大きすぎます（5MB まで）。Aimu Focus のバックアップファイルを選んでください。" });
      return;
    }

    setReading(true);
    try {
      const result = parseBackup(await file.text());
      if (result.ok) {
        setPending({ backup: result.backup, fileName: file.name });
      } else {
        setMessage({ variant: "error", text: result.error });
      }
    } catch {
      setMessage({ variant: "error", text: "ファイルを読み込めませんでした。もう一度選び直してください。" });
    } finally {
      // finally: 成功しても失敗しても必ず実行される
      setReading(false);
    }
  }

  function confirmRestore() {
    if (!pending) return;
    setUndo({ previous: tasks, restored: pending.backup.tasks });
    onRestore(pending.backup.tasks);
    setMessage({ variant: "info", text: `${pending.backup.tasks.length}件のタスクを復元しました。` });
    setPending(null);
  }

  function undoRestore() {
    if (!canUndo) return;
    onRestore(undo.previous);
    setMessage({ variant: "info", text: `復元を取り消し、元の${undo.previous.length}件に戻しました。` });
    setUndo(null);
  }

  const pendingCompleted = pending ? pending.backup.tasks.filter((task) => task.completed).length : 0;

  return (
    // details / summary: クリックで開閉できる HTML 標準の部品。ふだんは閉じておき、画面をすっきりさせる
    <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 text-base font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-sm text-indigo-700 transition-transform group-open:rotate-90">
          ▶
        </span>
        バックアップと復元
      </summary>

      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <p className="text-sm text-slate-700">
          {"ブラウザのデータが消えたときに備えて、タスクをファイルに保存できます。" +
            "別のブラウザや端末にタスクを移すときにも使えます。"}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={exportBackup}
            className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            バックアップを保存（JSON）
          </button>

          {/* 本物の file 入力欄は見えなくし、label をボタンのように見せる */}
          <label
            htmlFor={`${id}-file`}
            className={`${secondaryButton} flex cursor-pointer items-center justify-center has-focus-visible:outline-2 has-focus-visible:outline-indigo-600`}
          >
            ファイルから復元
            <input
              id={`${id}-file`}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {reading && (
          <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
            <SpinnerIcon />
            ファイルを確認しています…
          </p>
        )}

        {pending && (
          <div role="alertdialog" aria-labelledby={`${id}-confirm-title`} className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p id={`${id}-confirm-title`} className="font-bold">
              このバックアップで置き換えますか？
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li className="break-all">ファイル：{pending.fileName}</li>
              <li>書き出し日時：{formatDateTime(pending.backup.exportedAt)}</li>
              <li>
                中身：{pending.backup.tasks.length}件（未完了 {pending.backup.tasks.length - pendingCompleted}件・完了{" "}
                {pendingCompleted}件）
              </li>
            </ul>
            {tasks.length > 0 && (
              <p className="font-semibold">
                {`今あるタスク${tasks.length}件は、すべてこのバックアップの内容に置き換わります。` +
                  "不安な場合は、先に今のデータを保存してください。"}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {tasks.length > 0 && (
                <button type="button" onClick={exportBackup} className={secondaryButton}>
                  今のデータを先に保存
                </button>
              )}
              <button type="button" autoFocus onClick={() => setPending(null)} className={secondaryButton}>
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="min-h-11 rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                置き換えて復元する
              </button>
            </div>
          </div>
        )}

        {message && (
          <Notice variant={message.variant === "error" ? "error" : "info"}>
            <p>{message.text}</p>
            {canUndo && message.variant === "info" && (
              <button
                type="button"
                onClick={undoRestore}
                className="mt-2 min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                復元を取り消す（元の{undo.previous.length}件に戻す）
              </button>
            )}
          </Notice>
        )}
      </div>
    </details>
  );
}
