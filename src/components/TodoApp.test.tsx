/**
 * 画面の操作テスト。
 * 実際のユーザーと同じように「入力する」「クリックする」を再現して、結果を確かめる。
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { BACKUP_KEY_PREFIX, STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";

function setup() {
  const user = userEvent.setup();
  const view = render(<TodoApp />);
  const input = screen.getByLabelText("新しいタスク");
  return { user, input, view };
}

function storedTitles(): string[] {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  return data.tasks.map((task: { title: string }) => task.title);
}

describe("TodoApp：基本操作", () => {
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
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
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

describe("TodoApp：保存と復元", () => {
  it("追加・完了・削除のたびに localStorage へ保存される", async () => {
    const { user, input } = setup();
    await user.type(input, "A{Enter}");
    await user.type(input, "B{Enter}");
    expect(storedTitles()).toEqual(["B", "A"]);

    await user.click(screen.getByRole("checkbox", { name: "A" }));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.tasks[1].completed).toBe(true);

    await user.click(screen.getByRole("button", { name: "「B」を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(storedTitles()).toEqual(["A"]);
  });

  it("画面を作り直しても（＝再読み込み）、保存したタスクが復元される", async () => {
    const { user, input, view } = setup();
    await user.type(input, "復元されるタスク{Enter}");
    await user.click(screen.getByRole("checkbox", { name: "復元されるタスク" }));

    view.unmount();
    render(<TodoApp />);
    expect(screen.getByRole("checkbox", { name: "復元されるタスク" })).toBeChecked();
  });

  it("保存データが壊れていても、注意を表示してアプリは使える。元データは保存前に退避される", async () => {
    localStorage.setItem(STORAGE_KEY, "{壊れたデータ");
    const { user, input } = setup();

    expect(screen.getByRole("alert")).toHaveTextContent("保存されていたデータを読み込めませんでした");
    expect(screen.getByText("タスクはまだありません")).toBeInTheDocument();

    await user.type(input, "新しいタスク{Enter}");
    expect(storedTitles()).toEqual(["新しいタスク"]);

    // 元の壊れたデータは別キーに残っている
    const backupKeys = Object.keys(localStorage).filter((key) => key.startsWith(BACKUP_KEY_PREFIX));
    expect(backupKeys).toHaveLength(1);
    expect(localStorage.getItem(backupKeys[0])).toBe("{壊れたデータ");
  });

  it("一部だけ壊れていたら、読めたタスクを表示して件数を伝える", () => {
    const ok = createTask("読めるタスク", { id: "ok" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks: [ok, { broken: 1 }] }));
    setup();
    expect(screen.getByText("読めるタスク")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("1件のタスクを読み込めませんでした");
  });

  it("保存に失敗したらエラーを表示する（画面上のタスクは残る）", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const { user, input } = setup();
    await user.type(input, "保存できないタスク{Enter}");

    expect(screen.getByText("保存できないタスク")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("保存容量がいっぱいです");
  });

  it("別のタブで変更されたら、一覧を読み直す", async () => {
    setup();
    const fromOtherTab = createTask("別タブで追加", { id: "other" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks: [fromOtherTab] }));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

    expect(await screen.findByText("別タブで追加")).toBeInTheDocument();
  });
});
