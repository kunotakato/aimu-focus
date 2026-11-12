/**
 * Phase 4（進捗ダッシュボード・バックアップと復元）の画面操作テスト。
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { createBackup, serializeBackup } from "@/lib/backup";
import { downloadTextFile } from "@/lib/download";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

// ダウンロードはテスト環境では実行できないので、「呼ばれたか」だけを記録する偽物に差し替える
vi.mock("@/lib/download", () => ({ downloadTextFile: vi.fn() }));

beforeEach(() => {
  vi.mocked(downloadTextFile).mockClear();
});

function seed(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks }));
}

function storedTitles(): string[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks.map((task: Task) => task.title);
}

function setup() {
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

async function openBackupPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("バックアップと復元"));
}

function jsonFile(text: string, name = "backup.json") {
  return new File([text], name, { type: "application/json" });
}

const current = [createTask("今のタスクA", { id: "c1" }), createTask("今のタスクB", { id: "c2" })];
const fromBackup = [
  { ...createTask("復元タスク1", { id: "r1" }), completed: true },
  createTask("復元タスク2", { id: "r2" }),
  createTask("復元タスク3", { id: "r3" }),
];
const validBackupText = serializeBackup(createBackup(fromBackup, new Date("2026-11-01T00:00:00Z")));

describe("進捗ダッシュボード", () => {
  it("タスク0件では完了率を「0%」と出さず、理由を表示する", () => {
    setup();
    const dashboard = screen.getByRole("region", { name: "進捗" });
    expect(within(dashboard).getByText("タスクを追加すると表示されます")).toBeInTheDocument();
    expect(within(dashboard).queryByText("%")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("操作に合わせて、件数と完了率が更新される", async () => {
    const { user } = setup();
    const input = screen.getByLabelText("新しいタスク");
    await user.type(input, "A{Enter}");
    await user.type(input, "B{Enter}");
    await user.click(screen.getByRole("checkbox", { name: "A" }));

    const dashboard = screen.getByRole("region", { name: "進捗" });
    const value = (label: string) => within(dashboard).getByText(label).nextElementSibling?.textContent;
    expect(value("全タスク")).toBe("2件");
    expect(value("完了")).toBe("1件");
    expect(value("未完了")).toBe("1件");
    expect(screen.getByRole("progressbar", { name: "完了率" })).toHaveAttribute("aria-valuenow", "50");
  });

  it("期限切れの件数を数える", () => {
    seed([{ ...createTask("遅れ", { id: "o" }), dueDate: "2000-01-01" }, createTask("普通", { id: "n" })]);
    setup();
    const dashboard = screen.getByRole("region", { name: "進捗" });
    expect(within(dashboard).getByText("期限切れ").nextElementSibling).toHaveTextContent("1件");
  });
});

describe("バックアップ（書き出し）", () => {
  it("今のタスクを JSON ファイルとして書き出す", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    await user.click(screen.getByRole("button", { name: "バックアップを保存（JSON）" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [fileName, text] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(fileName).toMatch(/^aimu-focus-backup-\d{8}-\d{4}\.json$/);
    expect(JSON.parse(text)).toMatchObject({ app: "aimu-focus", version: 1, tasks: current });
    expect(screen.getByText(/保存を開始しました/)).toBeInTheDocument();
  });
});

describe("復元（読み込み）", () => {
  it("確認画面で件数を見せ、「置き換えて復元する」で置き換わる", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), jsonFile(validBackupText));

    const dialog = await screen.findByRole("alertdialog", { name: "このバックアップで置き換えますか？" });
    expect(dialog).toHaveTextContent("中身：3件（未完了 2件・完了 1件）");
    expect(dialog).toHaveTextContent("今あるタスク2件は、すべてこのバックアップの内容に置き換わります");
    // 確認の時点ではまだ何も変わっていない
    expect(storedTitles()).toEqual(["今のタスクA", "今のタスクB"]);

    await user.click(within(dialog).getByRole("button", { name: "置き換えて復元する" }));
    expect(storedTitles()).toEqual(["復元タスク1", "復元タスク2", "復元タスク3"]);
    expect(screen.getByText("3件のタスクを復元しました。")).toBeInTheDocument();
  });

  it("確認画面でキャンセルすると、データは変わらない", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), jsonFile(validBackupText));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "キャンセル" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(storedTitles()).toEqual(["今のタスクA", "今のタスクB"]);
  });

  it("確認画面から、今のデータを先に保存できる", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), jsonFile(validBackupText));
    await user.click(await screen.findByRole("button", { name: "今のデータを先に保存" }));

    expect(JSON.parse(vi.mocked(downloadTextFile).mock.calls[0][1]).tasks).toEqual(current);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument(); // 確認画面は残る
  });

  it("不正なファイルはエラーを表示し、データを変えない", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    const broken = JSON.stringify({ ...createBackup(fromBackup), tasks: [{ id: "x", title: "" }] });
    await user.upload(screen.getByLabelText("ファイルから復元"), jsonFile(broken));

    expect(await screen.findByText(/正しくないタスクが1件含まれているため/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(storedTitles()).toEqual(["今のタスクA", "今のタスクB"]);
  });

  it("復元した直後は「元に戻す」ができる", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), jsonFile(validBackupText));
    await user.click(await screen.findByRole("button", { name: "置き換えて復元する" }));
    await user.click(screen.getByRole("button", { name: "復元を取り消す（元の2件に戻す）" }));

    expect(storedTitles()).toEqual(["今のタスクA", "今のタスクB"]);
    expect(screen.getByText("復元を取り消し、元の2件に戻しました。")).toBeInTheDocument();
  });

  it("復元後にタスクを変更したら、「元に戻す」は出さない（変更が消えるのを防ぐ）", async () => {
    seed(current);
    const { user } = setup();
    await openBackupPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), jsonFile(validBackupText));
    await user.click(await screen.findByRole("button", { name: "置き換えて復元する" }));
    expect(screen.getByRole("button", { name: /復元を取り消す/ })).toBeInTheDocument();

    await user.type(screen.getByLabelText("新しいタスク"), "復元後に追加{Enter}");
    expect(screen.queryByRole("button", { name: /復元を取り消す/ })).not.toBeInTheDocument();
  });
});
