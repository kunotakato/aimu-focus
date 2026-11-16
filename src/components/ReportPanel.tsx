"use client";

/**
 * 日報コピー（課題2-H）。
 * 開くと日報の下書きを表示し、「日報をコピー」でクリップボードにコピーする。
 * 下書きは、タスクの状態からその場で作るので、いつ開いても最新の内容になる。
 */
import { useId, useRef, useState } from "react";
import { ErrorIcon } from "@/components/icons";
import { buildDailyReport } from "@/lib/report";
import type { Task } from "@/types/task";

type Props = {
  tasks: Task[];
  today: string;
};

type CopyResult = { ok: boolean; text: string } | null;

/**
 * クリップボードにコピーする。
 * navigator.clipboard は https のページでだけ使えるので、使えないときは
 * 下書きの文章を選択して、古い方法（execCommand）でコピーを試す。
 */
async function copyText(text: string, fallbackTarget: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 下の方法を試す
  }
  if (!fallbackTarget) return false;
  fallbackTarget.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

export function ReportPanel({ tasks, today }: Props) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [result, setResult] = useState<CopyResult>(null);
  const report = buildDailyReport(tasks, today);

  async function handleCopy() {
    const ok = await copyText(report.text, textareaRef.current);
    setResult(
      ok
        ? { ok, text: `日報をコピーしました（完了 ${report.doneCount}件・明日 ${report.nextCount}件）。Slack やメールに貼り付けてください` }
        : { ok, text: "コピーできませんでした。下の文章を選択（長押し）してコピーしてください" },
    );
  }

  return (
    <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 text-base font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-base text-indigo-700 transition-transform group-open:rotate-90">
          ▶
        </span>
        日報をつくる
      </summary>

      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
        <p className="text-base text-slate-700">
          {"今日完了したタスクと、明日やるタスク（期限が明日までのもの・今日やるで残ったもの）をまとめます。"}
        </p>

        <label htmlFor={`${id}-preview`} className="text-base font-semibold text-slate-700">
          日報の下書き
        </label>
        <textarea
          ref={textareaRef}
          id={`${id}-preview`}
          // readOnly: 中身はタスクから自動で作るので、ここでは書き換えない（貼り付けた先で追記してもらう）
          // field-sizing-content: 中身の量に合わせて高さを自動で伸ばす（対応していないブラウザでは rows の高さ＋スクロール）
          readOnly
          value={report.text}
          rows={Math.min(14, report.text.split("\n").length + 1)}
          className="field-sizing-content w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-sans text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
        />

        <button
          type="button"
          onClick={handleCopy}
          className="min-h-11 self-start rounded-lg bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          日報をコピー
        </button>

        {/* role="status": コピーの結果を読み上げソフトにも伝える */}
        <p
          role="status"
          className={`flex min-h-6 items-start gap-1.5 text-base font-medium ${result?.ok === false ? "text-red-700" : "text-emerald-800"}`}
        >
          {result?.ok === false && <ErrorIcon className="mt-1 size-4" />}
          {result?.ok && <span aria-hidden="true">✓</span>}
          {result && <span>{result.text}</span>}
        </p>
      </div>
    </details>
  );
}
