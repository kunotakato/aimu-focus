/**
 * L. テンプレートの画面テスト。
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TodoApp } from "@/components/TodoApp";
import { createBackup, serializeBackup } from "@/lib/backup";
import { STORAGE_KEY } from "@/lib/storage";
import { createTask } from "@/lib/tasks";
import { TEMPLATES_KEY, TEMPLATE_LIMIT } from "@/lib/templates";
import type { Task } from "@/types/task";
import type { Template } from "@/types/template";

vi.mock("@/lib/download", () => ({ downloadTextFile: vi.fn() }));

const storedTasks = (): Task[] => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"tasks":[]}').tasks;
const storedTemplates = (): Template[] => JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '{"templates":[]}').templates;

function template(title: string, fields: Partial<Template> = {}): Template {
  return {
    id: `tpl-${title}`,
    title,
    description: "",
    priority: "medium",
    category: null,
    recurrence: "none",
    createdAt: "2026-11-01T00:00:00.000Z",
    ...fields,
  };
}

function setup(templates: Template[] = [], tasks: Task[] = []) {
  if (templates.length > 0) localStorage.setItem(TEMPLATES_KEY, JSON.stringify({ version: 1, templates }));
  if (tasks.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, tasks }));
  const user = userEvent.setup();
  render(<TodoApp />);
  return { user };
}

async function addWithTemplate(user: ReturnType<typeof userEvent.setup>, title: string, category?: string) {
  await user.click(screen.getByRole("button", { name: "詳細を設定（優先度・期限・カテゴリなど）" }));
  await user.type(screen.getByLabelText("新しいタスク"), title);
  if (category) await user.selectOptions(screen.getByLabelText("カテゴリ"), category);
  await user.type(screen.getByLabelText(/^期限日/), "2030-01-15");
  await user.click(screen.getByRole("checkbox", { name: /この内容をテンプレートにも保存する/ }));
  await user.click(screen.getByRole("button", { name: "追加" }));
}

describe("L. テンプレート", () => {
  it("テンプレートがないときは、作り方の案内を出す", () => {
    setup();
    expect(screen.getByText(/テンプレートに保存すると、次からワンタップで追加できます/)).toBeInTheDocument();
  });

  it("チェックを付けて追加すると、タスクと一緒にテンプレートにも保存される（期限日は保存しない）", async () => {
    const { user } = setup();
    await addWithTemplate(user, "週報を書く", "仕事");

    expect(screen.getByText("「週報を書く」を追加し、テンプレートにも保存しました")).toBeInTheDocument();
    expect(storedTasks()[0]).toMatchObject({ title: "週報を書く", dueDate: "2030-01-15" });
    expect(storedTemplates()).toHaveLength(1);
    expect(storedTemplates()[0]).toMatchObject({ title: "週報を書く", category: "work" });
    expect(storedTemplates()[0]).not.toHaveProperty("dueDate");
    // 追加したあと、チェックは外れている（次のタスクまでテンプレートにしないように）
    expect(screen.getByRole("checkbox", { name: /この内容をテンプレートにも保存する/ })).not.toBeChecked();
  });

  it("テンプレートのボタンを押すと、その内容のタスクがすぐ追加される", async () => {
    const { user } = setup([template("定例の資料準備", { priority: "high", category: "work", recurrence: "weekly" })]);
    await user.click(screen.getByRole("button", { name: "テンプレート「定例の資料準備」から追加" }));

    expect(storedTasks()[0]).toMatchObject({
      title: "定例の資料準備",
      priority: "high",
      category: "work",
      recurrence: "weekly",
      dueDate: null,
    });
    expect(screen.getByText("テンプレートから「定例の資料準備」を追加しました")).toBeInTheDocument();
  });

  it("同じ名前で保存すると、テンプレートを上書きする（2つに増えない）", async () => {
    const { user } = setup([template("週報を書く")]);
    await addWithTemplate(user, "週報を書く", "副業");
    expect(screen.getByText(/同じ名前のテンプレートを今の内容に更新しました/)).toBeInTheDocument();
    expect(storedTemplates()).toHaveLength(1);
    expect(storedTemplates()[0].category).toBe("side");
  });

  it(`${TEMPLATE_LIMIT}個あると保存できないが、タスクの追加はできる`, async () => {
    const full = Array.from({ length: TEMPLATE_LIMIT }, (_, i) => template(`T${i}`));
    const { user } = setup(full);
    await addWithTemplate(user, "11個目");

    expect(screen.getByText(/テンプレートは10個までのため保存できませんでした/)).toBeInTheDocument();
    expect(storedTasks()[0].title).toBe("11個目");
    expect(storedTemplates()).toHaveLength(TEMPLATE_LIMIT);
  });

  it("「管理」から、確認してから削除できる", async () => {
    const { user } = setup([template("いらない"), template("残す")]);
    await user.click(screen.getByRole("button", { name: "管理（2/10）" }));
    await user.click(screen.getByRole("button", { name: "テンプレート「いらない」を削除" }));
    expect(storedTemplates()).toHaveLength(2); // 確認の時点ではまだ消えない

    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(storedTemplates().map((t) => t.title)).toEqual(["残す"]);
    expect(screen.queryByRole("button", { name: "テンプレート「いらない」から追加" })).not.toBeInTheDocument();
  });
});

describe("L. テンプレートとバックアップ", () => {
  const openPanel = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByText("バックアップと復元"));
  const file = (text: string) => new File([text], "backup.json", { type: "application/json" });

  it("形式3のファイルから復元すると、テンプレートも置き換わり、取り消せば元に戻る", async () => {
    const { user } = setup([template("今のテンプレート")], [createTask("今のタスク", { id: "now" })]);
    const backup = serializeBackup(createBackup([createTask("復元タスク", { id: "r" })], [template("復元テンプレート")]));
    await openPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), file(backup));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("テンプレート：1件（今のテンプレートと置き換わります）");
    await user.click(within(dialog).getByRole("button", { name: "置き換えて復元する" }));
    expect(storedTemplates().map((t) => t.title)).toEqual(["復元テンプレート"]);

    await user.click(screen.getByRole("button", { name: /復元を取り消す/ }));
    expect(storedTemplates().map((t) => t.title)).toEqual(["今のテンプレート"]);
    expect(storedTasks().map((t) => t.title)).toEqual(["今のタスク"]);
  });

  it("古い形式（テンプレートなし）のファイルから復元しても、今のテンプレートは残る", async () => {
    const { user } = setup([template("残るテンプレート")], [createTask("今のタスク", { id: "now" })]);
    const v2 = JSON.stringify({
      app: "aimu-focus",
      version: 2,
      exportedAt: "2026-11-10T00:00:00.000Z",
      tasks: [createTask("古いバックアップのタスク", { id: "old" })],
    });
    await openPanel(user);
    await user.upload(screen.getByLabelText("ファイルから復元"), file(v2));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("テンプレート：このファイルには入っていません（今のテンプレートはそのまま残ります）");
    await user.click(within(dialog).getByRole("button", { name: "置き換えて復元する" }));
    expect(storedTasks().map((t) => t.title)).toEqual(["古いバックアップのタスク"]);
    expect(storedTemplates().map((t) => t.title)).toEqual(["残るテンプレート"]);
  });
});
