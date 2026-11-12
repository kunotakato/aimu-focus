/**
 * Phase 3（詳細管理・検索・絞り込み・並び替え）の画面操作テスト。
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { toLocalDateString } from "@/lib/date";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

/** 今日から days 日後の "YYYY-MM-DD"（マイナスなら過去） */
function dayFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

function seed(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks }));
}

function setup() {
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

/** 一覧に表示されているタスク名を、表示順に取り出す */
function visibleTitles(): string[] {
  const list = screen.queryByRole("list", { name: "タスク一覧" });
  if (!list) return [];
  return within(list)
    .getAllByRole("checkbox")
    .map((checkbox) => checkbox.closest("label")!.textContent!);
}

describe("タスクの詳細管理", () => {
  it("優先度・期限・説明を付けて追加できる", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "優先度・期限・説明を設定" }));
    await user.type(screen.getByLabelText("新しいタスク"), "提案書を出す");
    await user.selectOptions(screen.getByLabelText("優先度"), "高");
    await user.type(screen.getByLabelText(/期限日/), "2030-01-15");
    await user.type(screen.getByLabelText(/説明/), "B社向け");
    await user.click(screen.getByRole("button", { name: "追加" }));

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("優先度 高")).toBeInTheDocument();
    expect(within(item).getByText(/2030年1月15日/)).toBeInTheDocument();
    expect(within(item).getByText("B社向け")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks[0];
    expect(stored).toMatchObject({ priority: "high", dueDate: "2030-01-15", description: "B社向け" });
  });

  it("タスクを編集して保存できる（更新日時が表示される）", async () => {
    seed([createTask("古い名前", { id: "t1", now: new Date("2026-01-01T00:00:00Z") })]);
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "「古い名前」を編集" }));
    const form = screen.getByRole("form", { name: "「古い名前」を編集" });
    const titleInput = within(form).getByLabelText("タスク名");
    expect(titleInput).toHaveFocus();

    await user.clear(titleInput);
    await user.type(titleInput, "新しい名前");
    await user.selectOptions(within(form).getByLabelText("優先度"), "低");
    await user.click(within(form).getByRole("button", { name: "保存する" }));

    expect(screen.getByText("新しい名前")).toBeInTheDocument();
    expect(screen.getByText("優先度 低")).toBeInTheDocument();
    expect(screen.getByText(/更新/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks[0].title).toBe("新しい名前");
  });

  it("編集で空白だけのタスク名にはできない", async () => {
    seed([createTask("消えては困る", { id: "t1" })]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「消えては困る」を編集" }));
    const titleInput = screen.getByLabelText("タスク名");
    await user.clear(titleInput);
    await user.type(titleInput, "   {Enter}");

    expect(screen.getByText(/タスク名を入力してください/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks[0].title).toBe("消えては困る");
  });

  it("編集はキャンセル（Escape キーでも）でき、内容は変わらない", async () => {
    seed([createTask("そのまま", { id: "t1" })]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「そのまま」を編集" }));
    await user.type(screen.getByLabelText("タスク名"), "追記");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("form", { name: /を編集/ })).not.toBeInTheDocument();
    expect(screen.getByText("そのまま")).toBeInTheDocument();
  });

  it("期限切れの未完了タスクは「期限切れ」と表示し、完了すると消える", async () => {
    seed([{ ...createTask("遅れているタスク", { id: "t1" }), dueDate: dayFromToday(-2) }]);
    const { user } = setup();
    expect(screen.getByText(/期限切れ（2日超過）/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "遅れているタスク" }));
    expect(screen.queryByText(/期限切れ/)).not.toBeInTheDocument();
  });

  it("期限が近いタスクには残り日数を表示する", () => {
    seed([
      { ...createTask("今日のタスク", { id: "t1" }), dueDate: dayFromToday(0) },
      { ...createTask("2日後のタスク", { id: "t2" }), dueDate: dayFromToday(2) },
    ]);
    setup();
    expect(screen.getByText(/（今日まで）/)).toBeInTheDocument();
    expect(screen.getByText(/（あと2日）/)).toBeInTheDocument();
  });
});

describe("検索・絞り込み・並び替え", () => {
  const base = (id: string, day: number, fields: Partial<Task>) => ({
    ...createTask(id, { id, now: new Date(Date.UTC(2026, 10, day)) }),
    ...fields,
  });
  const sample = [
    base("a", 1, { title: "AWS資格の勉強", priority: "high", dueDate: "2030-03-01" }),
    base("b", 2, { title: "週報を書く", description: "Slackに投稿", completed: true }),
    base("c", 3, { title: "部屋の掃除", priority: "low", dueDate: "2030-02-01" }),
  ] satisfies Task[];

  it("キーワードで検索でき、件数が表示される", async () => {
    seed(sample);
    const { user } = setup();
    await user.type(screen.getByLabelText("キーワードで探す"), "slack");
    expect(visibleTitles()).toEqual(["週報を書く"]);
    expect(screen.getByText("条件に合うタスク：1 件")).toBeInTheDocument();
  });

  it("すべて／未完了／完了を切り替えられる", async () => {
    seed(sample);
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: /未完了/ }));
    expect(visibleTitles()).toEqual(["部屋の掃除", "AWS資格の勉強"]);
    await user.click(screen.getByRole("radio", { name: /^✓?\s*完了$/ }));
    expect(visibleTitles()).toEqual(["週報を書く"]);
    await user.click(screen.getByRole("radio", { name: /すべて/ }));
    expect(visibleTitles()).toHaveLength(3);
  });

  it("優先度で絞り込める", async () => {
    seed(sample);
    const { user } = setup();
    const toolbar = screen.getByRole("search");
    await user.click(screen.getByRole("button", { name: "優先度・並び順" }));
    await user.selectOptions(within(toolbar).getByLabelText("優先度"), "高");
    expect(visibleTitles()).toEqual(["AWS資格の勉強"]);
  });

  it("期限が近い順・登録順に並び替えられる", async () => {
    seed(sample);
    const { user } = setup();
    expect(visibleTitles()).toEqual(["部屋の掃除", "週報を書く", "AWS資格の勉強"]); // 初期は新しい順

    // 並び順は「優先度・並び順」を開くと選べる
    expect(screen.queryByLabelText("並び順")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "優先度・並び順" }));

    await user.selectOptions(screen.getByLabelText("並び順"), "期限が近い順");
    expect(visibleTitles()).toEqual(["部屋の掃除", "AWS資格の勉強", "週報を書く"]);

    await user.selectOptions(screen.getByLabelText("並び順"), "古い順");
    expect(visibleTitles()).toEqual(["AWS資格の勉強", "週報を書く", "部屋の掃除"]);

    // 閉じても、変更中の条件があることが分かる
    await user.click(screen.getByRole("button", { name: /優先度・並び順/ }));
    expect(screen.getByRole("button", { name: /1件 変更中/ })).toBeInTheDocument();
  });

  it("条件に合うタスクがないときは案内を出し、リセットで元に戻せる", async () => {
    seed(sample);
    const { user } = setup();
    await user.type(screen.getByLabelText("キーワードで探す"), "存在しない言葉");
    expect(screen.getByText("条件に合うタスクはありません")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "条件をリセット" }));
    expect(visibleTitles()).toHaveLength(3);
    expect(screen.getByLabelText("キーワードで探す")).toHaveValue("");
  });
});
