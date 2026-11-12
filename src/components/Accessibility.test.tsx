/**
 * Phase 5（UI/UX の仕上げ）の画面テスト。
 * キーボードだけで操作したときに迷子にならないこと、操作の結果が伝わることを確かめる。
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";

function seedTitles(titles: string[]) {
  // 先頭ほど新しいタスクにして、画面の並び順＝titles の順にする
  const tasks = titles.map((title, i) =>
    createTask(title, { id: `t${i}`, now: new Date(Date.UTC(2026, 0, 31 - i)) }),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks }));
}

function setup() {
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

describe("フォーカスの管理（キーボード操作で迷子にならない）", () => {
  it("削除したら、次のタスクのチェックボックスにフォーカスが移る", async () => {
    seedTitles(["A", "B", "C"]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「B」を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(screen.getByRole("checkbox", { name: "C" })).toHaveFocus();
  });

  it("最後のタスクを削除したら、1つ前のタスクへ移る", async () => {
    seedTitles(["A", "B"]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「B」を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(screen.getByRole("checkbox", { name: "A" })).toHaveFocus();
  });

  it("1件も残らなければ「タスク」見出しへ移る", async () => {
    seedTitles(["A"]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「A」を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(screen.getByRole("heading", { name: "タスク" })).toHaveFocus();
  });

  it("削除をキャンセルしたら、「削除」ボタンにフォーカスが戻る", async () => {
    seedTitles(["A"]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「A」を削除" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "「A」を削除" })).toHaveFocus();
  });

  it("編集を保存・キャンセルしたら、「編集」ボタンにフォーカスが戻る", async () => {
    seedTitles(["A"]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「A」を編集" }));
    await user.type(screen.getByLabelText("タスク名"), "改{Enter}");
    expect(screen.getByRole("button", { name: "「A改」を編集" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "「A改」を編集" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "「A改」を編集" })).toHaveFocus();
  });

  it("キーボードだけでタスクを追加・完了にできる", async () => {
    const { user } = setup();
    await user.tab(); // 最初に操作できるのは「新しいタスク」の入力欄
    expect(screen.getByLabelText("新しいタスク")).toHaveFocus();
    await user.keyboard("キーボードで追加{Enter}");

    const checkbox = screen.getByRole("checkbox", { name: "キーボードで追加" });
    checkbox.focus();
    await user.keyboard(" "); // スペースキーでチェック
    expect(checkbox).toBeChecked();
  });
});

describe("操作の結果を伝える", () => {
  it("追加・完了・未完了・保存・削除のたびに、結果を表示する", async () => {
    const { user } = setup();
    const status = () => screen.getByText(/しました$/);

    await user.type(screen.getByLabelText("新しいタスク"), "報告書{Enter}");
    expect(status()).toHaveTextContent("「報告書」を追加しました");

    await user.click(screen.getByRole("checkbox", { name: "報告書" }));
    expect(status()).toHaveTextContent("「報告書」を完了にしました");

    await user.click(screen.getByRole("checkbox", { name: "報告書" }));
    expect(status()).toHaveTextContent("「報告書」を未完了に戻しました");

    await user.click(screen.getByRole("button", { name: "「報告書」を編集" }));
    await user.click(screen.getByRole("button", { name: "保存する" }));
    expect(status()).toHaveTextContent("「報告書」を保存しました");

    await user.click(screen.getByRole("button", { name: "「報告書」を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(status()).toHaveTextContent("「報告書」を削除しました");
  });
});
