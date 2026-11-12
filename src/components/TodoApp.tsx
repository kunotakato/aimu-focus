"use client";

/**
 * アプリ本体の入口（Client Component）。
 *
 * "use client" をファイルの先頭に書くと、このファイルは「ブラウザでも動く部品」になる。
 * クリックや入力などの操作（イベント処理）や useState は、ブラウザで動く部品でしか使えない。
 *
 * サーバーには localStorage がないため、サーバーと Hydration 中は「読み込み中」を表示し、
 * ブラウザで動き始めてから TaskBoard（localStorage を読む部品）を表示する。
 * こうすると、サーバーとブラウザの最初の画面が必ず一致し、Hydration Error が起きない。
 */
import { SpinnerIcon } from "@/components/icons";
import { TaskBoard } from "@/components/TaskBoard";
import { useIsClient } from "@/hooks/useIsClient";

export function TodoApp() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div role="status" className="flex items-center justify-center gap-3 py-16 text-base text-slate-600">
        <SpinnerIcon />
        <span>タスクを読み込んでいます…</span>
      </div>
    );
  }

  return <TaskBoard />;
}
