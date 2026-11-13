/**
 * 課題2の追加機能（A. 今日のフォーカス / B. カテゴリ / C. 繰り返し / F. 週の振り返り）の画面テスト。
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { formatDueDate, toLocalDateString } from "@/lib/date";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

function seed(tasks: unknown[], version = 2) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, tasks }));
}

function stored(): Task[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks;
}

function setup() {
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

const taskList = () => screen.getByRole("list", { name: "タスク一覧" });
const focusPanel = () => screen.getByRole("region", { name: "今日のフォーカス" });

function dayFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

describe("B. カテゴリ分け", () => {
  it("カテゴリを付けて追加でき、一覧に表示される", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "詳細を設定（優先度・期限・カテゴリなど）" }));
    await user.type(screen.getByLabelText("新しいタスク"), "資格の過去問");
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "学習");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(within(taskList()).getByText("学習")).toBeInTheDocument();
    expect(stored()[0].category).toBe("study");
  });

  it("カテゴリで絞り込める（未設定も選べる）", async () => {
    seed([
      { ...createTask({ title: "企画書", category: "work" }, { id: "w" }) },
      { ...createTask({ title: "ブログ記事", category: "side" }, { id: "s" }) },
      { ...createTask("カテゴリなし", { id: "n" }) },
    ]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "カテゴリ・優先度・並び順" }));
    const toolbar = screen.getByRole("search");

    await user.selectOptions(within(toolbar).getByLabelText("カテゴリ"), "副業");
    expect(within(taskList()).getAllByRole("listitem")).toHaveLength(1);
    expect(within(taskList()).getByText("ブログ記事")).toBeInTheDocument();

    await user.selectOptions(within(toolbar).getByLabelText("カテゴリ"), "未設定");
    expect(within(taskList()).getByText("カテゴリなし")).toBeInTheDocument();
    expect(within(taskList()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("編集でカテゴリを変更できる", async () => {
    seed([createTask({ title: "企画書", category: "work" }, { id: "w" })]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「企画書」を編集" }));
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "生活");
    await user.click(screen.getByRole("button", { name: "保存する" }));
    expect(stored()[0].category).toBe("life");
  });
});

describe("C. 繰り返しタスク", () => {
  it("毎日のタスクを完了すると、明日が期限の次回分ができてお知らせが出る", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "詳細を設定（優先度・期限・カテゴリなど）" }));
    await user.type(screen.getByLabelText("新しいタスク"), "英単語を10個覚える");
    await user.selectOptions(screen.getByLabelText("繰り返し"), "毎日");
    expect(screen.getByText("完了にすると、次回のタスクが自動で作られます。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(within(taskList()).getByText("毎日")).toBeInTheDocument();

    await user.click(within(taskList()).getByRole("checkbox", { name: "英単語を10個覚える" }));

    const tomorrow = dayFromToday(1);
    expect(screen.getByText(new RegExp(`次回分（期限 ${formatDueDate(tomorrow).replace(/[()]/g, "\\$&")}）を作成しました`))).toBeInTheDocument();
    const items = stored();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: "英単語を10個覚える", completed: false, dueDate: tomorrow, recurrence: "daily" });
    expect(items[1]).toMatchObject({ completed: true });
    expect(items[0].seriesId).toBe(items[1].id);
  });

  it("チェックを外して付け直しても、次回分は1つだけ", async () => {
    seed([createTask({ title: "日報", recurrence: "daily" }, { id: "r" })]);
    const { user } = setup();
    await user.click(within(taskList()).getByRole("checkbox", { name: "日報" }));
    expect(stored()).toHaveLength(2);

    // 完了したほう（元のタスク）のチェックを外して、付け直す
    const original = () => within(taskList()).getAllByRole("checkbox", { name: "日報" })[1];
    await user.click(original());
    await user.click(original());
    expect(stored()).toHaveLength(2);
    expect(stored().filter((t) => !t.completed)).toHaveLength(1);
  });
});

describe("A. 今日のフォーカス", () => {
  it("「今日やる」を押すと、上の「今日のフォーカス」に表示される", async () => {
    seed([createTask("提案書を仕上げる", { id: "a" }), createTask("メール返信", { id: "b" })]);
    const { user } = setup();
    expect(within(focusPanel()).getByText(/今日いちばん大事なタスクを3つまで選びましょう/)).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "「提案書を仕上げる」を今日やる" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(within(focusPanel()).getByText("提案書を仕上げる")).toBeInTheDocument();
    expect(stored().find((t) => t.id === "a")!.focusDate).toBe(dayFromToday(0));
  });

  it("4つ目は選べず、理由を表示する", async () => {
    seed(["A", "B", "C", "D"].map((title) => createTask(title, { id: title })));
    const { user } = setup();
    for (const title of ["A", "B", "C"]) {
      await user.click(screen.getByRole("button", { name: `「${title}」を今日やる` }));
    }
    await user.click(screen.getByRole("button", { name: "「D」を今日やる" }));

    expect(screen.getByText(/「今日やる」に選べるのは3つまでです/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「D」を今日やる" })).toHaveAttribute("aria-pressed", "false");
    expect(within(focusPanel()).getAllByRole("listitem")).toHaveLength(3);
  });

  it("フォーカスの中で完了にでき、全部終わるとお祝いを表示する", async () => {
    seed([{ ...createTask("最重要タスク", { id: "a" }), focusDate: dayFromToday(0) }]);
    const { user } = setup();
    await user.click(within(focusPanel()).getByRole("checkbox", { name: "今日のフォーカス：最重要タスク" }));

    expect(within(focusPanel()).getByText("1 / 1 件完了")).toBeInTheDocument();
    expect(within(focusPanel()).getByText(/すべて完了しました/)).toBeInTheDocument();
  });

  it("「外す」で今日のフォーカスから外せる", async () => {
    seed([{ ...createTask("外すタスク", { id: "a" }), focusDate: dayFromToday(0) }]);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "「外すタスク」を今日やるから外す" }));
    expect(within(focusPanel()).queryByText("外すタスク")).not.toBeInTheDocument();
  });

  it("昨日選んだタスクは、今日のフォーカスに出ない（日付が変わると自動で外れる）", () => {
    seed([{ ...createTask("昨日のフォーカス", { id: "a" }), focusDate: dayFromToday(-1) }]);
    setup();
    expect(within(focusPanel()).queryByText("昨日のフォーカス")).not.toBeInTheDocument();
  });
});

describe("F. 週の振り返り", () => {
  it("完了すると今週の件数と連続日数が増え、取り消すと戻る", async () => {
    seed([createTask("振り返り対象", { id: "a" })]);
    const { user } = setup();
    const value = (label: string) => screen.getByText(label).nextElementSibling;

    expect(value("今週完了")).toHaveTextContent("0件");
    expect(value("連続で完了")).toHaveTextContent("0日");

    await user.click(within(taskList()).getByRole("checkbox", { name: "振り返り対象" }));
    expect(value("今週完了")).toHaveTextContent("1件");
    expect(value("連続で完了")).toHaveTextContent("1日");
    expect(screen.getByRole("listitem", { name: /（今日）：1件/ })).toBeInTheDocument();

    await user.click(within(taskList()).getByRole("checkbox", { name: "振り返り対象" }));
    expect(value("今週完了")).toHaveTextContent("0件");
  });

  it("昨日・一昨日の完了から連続日数を数える", () => {
    const doneDaysAgo = (n: number, id: string) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      d.setHours(12, 0, 0, 0);
      return { ...createTask(id, { id }), completed: true, completedAt: d.toISOString() };
    };
    seed([doneDaysAgo(1, "y"), doneDaysAgo(2, "yy")]);
    setup();
    expect(screen.getByText("連続で完了").nextElementSibling).toHaveTextContent("2日");
  });
});

describe("課題1のデータからの引き継ぎ", () => {
  it("形式1の保存データも、そのまま表示・操作できる", async () => {
    seed(
      [
        {
          id: "old",
          title: "課題1のタスク",
          description: "",
          completed: false,
          priority: "high",
          dueDate: null,
          createdAt: "2026-11-10T00:00:00.000Z",
          updatedAt: "2026-11-10T00:00:00.000Z",
        },
      ],
      1,
    );
    const { user } = setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // 「読み込めませんでした」が出ない
    await user.click(within(taskList()).getByRole("checkbox", { name: "課題1のタスク" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(2);
    expect(stored()[0]).toMatchObject({ id: "old", completed: true, category: null, recurrence: "none" });
  });
});
