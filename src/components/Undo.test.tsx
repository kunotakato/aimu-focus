/**
 * G. 削除の取り消し（Undo）の画面テスト。
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { UNDO_TIMEOUT_MS } from "@/components/UndoToast";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

afterEach(() => {
  vi.useRealTimers();
});

/** 先頭ほど新しい3件（画面の並び：A, B, C） */
const seeded = (): Task[] => [
  { ...createTask({ title: "A" }, { id: "a", now: new Date("2026-11-03T00:00:00Z") }) },
  {
    ...createTask(
      { title: "B", description: "大事なメモ", priority: "high", category: "work", dueDate: "2030-01-01" },
      { id: "b", now: new Date("2026-11-02T00:00:00Z") },
    ),
    completed: true,
    completedAt: "2026-11-02T09:00:00.000Z",
  },
  { ...createTask({ title: "C" }, { id: "c", now: new Date("2026-11-01T00:00:00Z") }) },
];

function setup() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, tasks: seeded() }));
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

/**
 * 時間を早送りして確かめるテスト用。
 * 偽物のタイマー（vi.useFakeTimers）を使うと userEvent の待ち時間まで止まってしまうので、
 * 待ち時間なしでイベントを起こす fireEvent で操作する。
 */
function setupWithFakeTimers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, tasks: seeded() }));
  vi.useFakeTimers();
  render(<TodoApp />);
  fireEvent.click(screen.getByRole("button", { name: "「B」を削除" }));
  fireEvent.click(screen.getByRole("button", { name: "削除する" }));
}

const stored = (): Task[] => JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks;
/** 画面下の「元に戻す」通知 */
const toast = () => screen.getByText("「B」を削除しました").closest<HTMLElement>('[role="status"]')!;
const undoButton = () => screen.queryByRole("button", { name: "元に戻す" });

async function deleteTask(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole("button", { name: `「${title}」を削除` }));
  await user.click(screen.getByRole("button", { name: "削除する" }));
}

describe("G. 削除の取り消し（Undo）", () => {
  it("削除すると「元に戻す」が出て、押すと元の位置・元の内容で戻る", async () => {
    const original = seeded()[1];
    const { user } = setup();
    await deleteTask(user, "B");

    expect(screen.getByText("「B」を削除しました")).toBeInTheDocument();
    expect(stored().map((t) => t.id)).toEqual(["a", "c"]); // 削除はすぐ保存される

    await user.click(undoButton()!);

    expect(stored().map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(stored()[1]).toEqual(original); // 説明・優先度・カテゴリ・期限・完了状態もそのまま
    expect(screen.getByText("「B」を元に戻しました")).toBeInTheDocument();
    expect(undoButton()).not.toBeInTheDocument();
    // 戻したタスクのチェックボックスにフォーカスが移る
    expect(within(screen.getByRole("list", { name: "タスク一覧" })).getByRole("checkbox", { name: "B" })).toHaveFocus();
  });

  it(`${UNDO_TIMEOUT_MS / 1000}秒たつと「元に戻す」は消える`, () => {
    setupWithFakeTimers();
    expect(undoButton()).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 100));
    expect(undoButton()).toBeInTheDocument(); // まだ出ている

    act(() => vi.advanceTimersByTime(100));
    expect(undoButton()).not.toBeInTheDocument();
    expect(stored().map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("マウスを乗せている間は時間が止まる", () => {
    setupWithFakeTimers();
    fireEvent.mouseEnter(toast());

    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS * 2));
    expect(undoButton()).toBeInTheDocument();

    fireEvent.mouseLeave(toast());
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));
    expect(undoButton()).not.toBeInTheDocument();
  });

  it("別の操作をすると「元に戻す」は消える（戻すと、その操作まで消えてしまうため）", async () => {
    const { user } = setup();
    await deleteTask(user, "B");
    await user.type(screen.getByLabelText("新しいタスク"), "新しいタスク{Enter}");
    expect(undoButton()).not.toBeInTheDocument();
  });

  it("続けて別のタスクを削除したら、最後に削除したものを戻せる", async () => {
    const { user } = setup();
    await deleteTask(user, "B");
    await deleteTask(user, "C");
    expect(screen.getByText("「C」を削除しました")).toBeInTheDocument();
    await user.click(undoButton()!);
    expect(stored().map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("Ctrl + Z でも元に戻せる。文字の入力中は何もしない", async () => {
    const { user } = setup();
    await deleteTask(user, "B");

    // 入力欄の中で Ctrl + Z → タスクは戻らない
    await user.click(screen.getByLabelText("新しいタスク"));
    await user.keyboard("{Control>}z{/Control}");
    expect(stored()).toHaveLength(2);

    // 入力欄の外で Ctrl + Z → 戻る
    screen.getByRole("heading", { name: "タスク" }).focus();
    await user.keyboard("{Control>}z{/Control}");
    expect(stored().map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("削除前の確認はこれまでどおり残っている（キャンセルすれば消えない）", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「B」を削除" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(stored()).toHaveLength(3);
    expect(undoButton()).not.toBeInTheDocument();
  });
});
