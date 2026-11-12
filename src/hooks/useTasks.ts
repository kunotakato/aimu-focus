"use client";

/**
 * タスクの一覧（state）と、それを変更する操作をまとめた「カスタムフック」。
 *
 * カスタムフック = use から始まる自作の関数。React の機能（useState など）を
 * 組み合わせて、複数のコンポーネントで使い回せる形にまとめたもの。
 *
 * Phase 1 ではメモリ上（ページを再読み込みすると消える）で管理する。
 * Phase 2 でこのフックの中に localStorage への保存・復元を追加する予定。
 * 画面側のコンポーネントは「保存方法」を知らなくてよい、というのがポイント。
 */
import { useState } from "react";
import { addTask, createTask, deleteTask, toggleTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

export function useTasks(initialTasks: Task[] = []) {
  // state = コンポーネントが覚えておく値。setTasks で変更すると画面が描き直される。
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // 「前の値 → 新しい値」を計算する関数（prev => ...）を渡すのが安全な書き方。
  // 連続で操作されても、常に最新の一覧をもとに計算できる。
  function add(title: string) {
    setTasks((prev) => addTask(prev, createTask(title)));
  }

  function toggle(id: string) {
    setTasks((prev) => toggleTask(prev, id));
  }

  function remove(id: string) {
    setTasks((prev) => deleteTask(prev, id));
  }

  return { tasks, add, toggle, remove };
}
