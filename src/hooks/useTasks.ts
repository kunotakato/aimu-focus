"use client";

/**
 * タスクの一覧（state）と、それを変更する操作をまとめた「カスタムフック」。
 *
 * カスタムフック = use から始まる自作の関数。React の機能（useState など）を
 * 組み合わせて、使い回せる形にまとめたもの。
 *
 * 画面側のコンポーネントは「どこに保存しているか」を知らなくてよい。
 * 保存先を将来データベースに変えても、このフックの中だけ直せば済む。
 *
 * 注意：このフックはブラウザ上でだけ使う（localStorage を読むため）。
 * TodoApp が useIsClient で確認してから TaskBoard を表示しているのはそのため。
 */
import { useEffect, useRef, useState } from "react";
import {
  STORAGE_KEY,
  backupRawData,
  loadTasks,
  saveTasks,
  type LoadIssue,
  type SaveResult,
} from "@/lib/storage";
import {
  addTask,
  createTask,
  deleteTask,
  setFocus,
  toggleTaskWithResult,
  updateTask,
  type TaskInput,
} from "@/lib/tasks";
import type { Task } from "@/types/task";

export type SaveError = Extract<SaveResult, { ok: false }>["reason"];

/** 読み込めなかった元データ（退避が必要なもの）を取り出す */
function rawToBackup(issue: LoadIssue | null): string | null {
  return issue && issue.type !== "unavailable" ? issue.raw : null;
}

export function useTasks() {
  // useState(関数) と書くと、その関数は最初の1回だけ実行される（lazy initializer）。
  // 毎回の描画で localStorage を読み直す無駄を防げる。
  const [initial] = useState(loadTasks);

  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [loadIssue, setLoadIssue] = useState<LoadIssue | null>(initial.issue);
  const [saveError, setSaveError] = useState<SaveError | null>(null);

  // useRef = 描画に関係しない値を覚えておく箱。中身を変えても画面は描き直されない。
  const pendingBackup = useRef<string | null>(rawToBackup(initial.issue));

  /**
   * 新しい一覧を画面に反映し、同時に保存する。
   * イベント処理（クリックなど）の中から呼ぶので、その時点の tasks が最新の値になる。
   */
  function commit(next: Task[]) {
    setTasks(next);

    // 壊れた元データがあるなら、上書きする直前に別のキーへ退避しておく
    if (pendingBackup.current !== null) {
      if (backupRawData(pendingBackup.current) === null) {
        setSaveError("backup-failed");
        return; // 退避できないなら、元データを消さないよう保存を中止する
      }
      pendingBackup.current = null;
    }

    const result = saveTasks(next);
    setSaveError(result.ok ? null : result.reason);
  }

  // useEffect = 描画が終わった後に、React の外の世界（ここではブラウザのイベント）とつなぐ処理。
  // 別のタブで同じアプリを操作したときに "storage" イベントが届くので、一覧を読み直す。
  // こうしないと、古い一覧のまま保存して、別タブの変更を消してしまう。
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      // key が null = localStorage 全体が消去された
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const result = loadTasks();
      setTasks(result.tasks);
      setLoadIssue(result.issue);
      pendingBackup.current = rawToBackup(result.issue);
    }
    window.addEventListener("storage", handleStorage);
    // 後片付け：コンポーネントが画面から消えるときにイベントの登録を外す
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    tasks,
    loadIssue,
    saveError,
    add: (input: TaskInput) => commit(addTask(tasks, createTask(input))),
    /** 完了・未完了を切り替える。繰り返しタスクの次回分を作ったら、そのタスクを返す */
    toggle: (id: string): Task | null => {
      const result = toggleTaskWithResult(tasks, id);
      commit(result.tasks);
      return result.created;
    },
    /** 「今日やる」に選ぶ／外す。上限を超えて選べなかったら false を返す */
    focus: (id: string, focused: boolean, today: string): boolean => {
      const result = setFocus(tasks, id, focused, today);
      if (result.ok) commit(result.tasks);
      return result.ok;
    },
    update: (id: string, changes: TaskInput) => commit(updateTask(tasks, id, changes)),
    remove: (id: string) => commit(deleteTask(tasks, id)),
    /** 一覧をまるごと置き換える（バックアップからの復元・復元の取り消しに使う） */
    replaceAll: (next: Task[]) => commit(next),
    dismissLoadIssue: () => setLoadIssue(null),
  };
}
