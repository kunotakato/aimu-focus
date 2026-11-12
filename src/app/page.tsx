/**
 * トップページ（Server Component）。
 *
 * "use client" が書かれていないファイルは Server Component になり、サーバー側で HTML を作る。
 * 見出しのように「操作しない部分」はここで作り、
 * 操作が必要な部分だけ Client Component（TodoApp）に任せる。
 */
import { TodoApp } from "@/components/TodoApp";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Aimu Focus
        </h1>
        <p className="mt-1 text-base text-slate-600 sm:text-base">
          タスクを管理するだけでなく、重要な行動を確実に進める。
        </p>
      </header>
      <TodoApp />
    </main>
  );
}
