/**
 * 画面の操作テスト。
 * 実際のユーザーと同じように「入力する」「クリックする」を再現して、結果を確かめる。
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoApp } from "@/components/TodoApp";

function setup() {
  const user = userEvent.setup();
  render(<TodoApp />);
  const input = screen.getByLabelText("新しいタスク");
  return { user, input };
}

describe("TodoApp", () => {
  it("タスクが0件のときは案内を表示する", () => {
    setup();
    expect(screen.getByText("タスクはまだありません")).toBeInTheDocument();
  });

  it("Enter キーでタスクを追加でき、入力欄は空に戻る", async () => {
    const { user, input } = setup();
    await user.type(input, "企画書を書く{Enter}");

    const list = screen.getByRole("list", { name: "タスク一覧" });
    expect(within(list).getByText("企画書を書く")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.queryByText("タスクはまだありません")).not.toBeInTheDocument();
  });

  it("「追加」ボタンでもタスクを追加できる", async () => {
    const { user, input } = setup();
    await user.type(input, "メールを返す");
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("メールを返す")).toBeInTheDocument();
  });

  it("空白だけのタスクは登録されず、エラーを表示する", async () => {
    const { user, input } = setup();
    await user.type(input, "   {Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("タスク名を入力してください");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("タスクはまだありません")).toBeInTheDocument();
  });

  it("チェックボックスで完了・未完了を切り替えられる", async () => {
    const { user, input } = setup();
    await user.type(input, "運動する{Enter}");

    const checkbox = screen.getByRole("checkbox", { name: "運動する" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText("未完了 0 件 / 全 1 件")).toBeInTheDocument();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("削除は確認してから実行される（キャンセルすると残る）", async () => {
    const { user, input } = setup();
    await user.type(input, "不要なタスク{Enter}");

    // 1回目のクリックでは消えず、確認が表示される
    await user.click(screen.getByRole("button", { name: "「不要なタスク」を削除" }));
    expect(screen.getByText("不要なタスク")).toBeInTheDocument();

    // キャンセルすると残る
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.getByText("不要なタスク")).toBeInTheDocument();

    // 確認で「削除する」を押すと消える
    await user.click(screen.getByRole("button", { name: "「不要なタスク」を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(screen.queryByText("不要なタスク")).not.toBeInTheDocument();
    expect(screen.getByText("タスクはまだありません")).toBeInTheDocument();
  });

  it("削除の確認は Escape キーでも閉じられる", async () => {
    const { user, input } = setup();
    await user.type(input, "残すタスク{Enter}");
    await user.click(screen.getByRole("button", { name: "「残すタスク」を削除" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "削除する" })).not.toBeInTheDocument();
    expect(screen.getByText("残すタスク")).toBeInTheDocument();
  });
});
