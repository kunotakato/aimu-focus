/**
 * H. 日報コピーの画面テスト。
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { formatDueDate, toLocalDateString } from "@/lib/date";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";

function setup() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 2, tasks: [createTask({ title: "提案書を出す", category: "work" }, { id: "a" })] }),
  );
  // userEvent.setup() は、テスト用のクリップボードも用意してくれる
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

describe("H. 日報コピー", () => {
  it("完了したタスクが下書きに反映され、コピーするとクリップボードに入る", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("checkbox", { name: "提案書を出す" }));
    await user.click(screen.getByText("日報をつくる"));

    const preview = screen.getByLabelText("日報の下書き");
    expect(preview).toHaveValue(
      [
        `【日報】${formatDueDate(toLocalDateString(new Date()))}`,
        "",
        "■ 今日完了したこと（1件）",
        "・提案書を出す［仕事］",
        "",
        "■ 明日やること（0件）",
        "・なし",
      ].join("\n"),
    );

    await user.click(screen.getByRole("button", { name: "日報をコピー" }));
    expect(await navigator.clipboard.readText()).toBe((preview as HTMLTextAreaElement).value);
    expect(screen.getByText(/日報をコピーしました（完了 1件・明日 0件）/)).toBeInTheDocument();
  });

  it("コピーに失敗したら、手でコピーする方法を案内する", async () => {
    const { user } = setup();
    await user.click(screen.getByText("日報をつくる"));
    // クリップボードへの書き込みと、古い方法の両方が失敗する状況を作る
    Object.defineProperty(navigator.clipboard, "writeText", { value: () => Promise.reject(new Error("denied")), configurable: true });
    document.execCommand = () => false;

    await user.click(screen.getByRole("button", { name: "日報をコピー" }));
    expect(screen.getByText(/コピーできませんでした/)).toBeInTheDocument();
  });

  it("タスクが0件のときは表示しない（最初の画面をすっきりさせる）", () => {
    render(<TodoApp />);
    expect(screen.queryByText("日報をつくる")).not.toBeInTheDocument();
  });
});
