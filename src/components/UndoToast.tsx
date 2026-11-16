"use client";

/**
 * 削除の取り消し（G）の通知。画面の下に固定して表示する。
 *
 * 一覧の下のほうで削除しても見えるように、画面の下に固定する。
 * 8秒たつと自動で消えるが、マウスを乗せている間・キーボードで選んでいる間は時間を止める
 * （読むのに時間がかかる人や、キーボードで操作する人でも間に合うように）。
 */
import { useEffect, useState } from "react";

/** 表示しておく時間（ミリ秒）。8000 = 8秒 */
export const UNDO_TIMEOUT_MS = 8000;

type Props = {
  /** 削除したタスクの名前 */
  title: string;
  onUndo: () => void;
  /** 時間切れで閉じるとき */
  onExpire: () => void;
};

export function UndoToast({ title, onUndo, onExpire }: Props) {
  // 一時停止中か（マウスが乗っている・フォーカスがある）
  const [paused, setPaused] = useState(false);

  // useEffect で「8秒後に閉じる」タイマーを動かす。
  // 一時停止中は動かさず、停止が解けたら改めて8秒数える。
  // return の関数（後片付け）でタイマーを止めるので、途中で閉じても二重に動かない。
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onExpire, UNDO_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [paused, onExpire]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4">
      <div
        // role="status": 表示されたことを読み上げソフトに伝える
        role="status"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-xl bg-slate-900 py-2 pl-4 pr-2 text-base text-white shadow-lg"
      >
        <p className="min-w-0 flex-1 break-words">
          <span aria-hidden="true">✓ </span>「{title}」を削除しました
        </p>
        <button
          type="button"
          onClick={onUndo}
          className="min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3 font-semibold text-amber-300 underline-offset-2 hover:bg-white/10 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          元に戻す
        </button>
      </div>
    </div>
  );
}
