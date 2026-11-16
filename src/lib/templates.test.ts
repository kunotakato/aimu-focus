import { describe, expect, it, vi } from "vitest";
import type { TaskInput } from "@/lib/tasks";
import {
  TEMPLATES_KEY,
  TEMPLATE_LIMIT,
  deleteTemplate,
  inputFromTemplate,
  isTemplate,
  loadTemplates,
  saveTemplates,
  upsertTemplate,
} from "@/lib/templates";
import type { Template } from "@/types/template";

const NOW = new Date("2026-11-16T00:00:00.000Z");
const input = (title: string, fields: Partial<TaskInput> = {}): TaskInput => ({
  title,
  description: "",
  priority: "medium",
  dueDate: "2026-11-20",
  category: null,
  recurrence: "none",
  ...fields,
});

function make(n: number): Template[] {
  let list: Template[] = [];
  for (let i = 0; i < n; i++) {
    const result = upsertTemplate(list, input(`T${i}`), { id: `t${i}`, now: NOW });
    if (result.ok) list = result.templates;
  }
  return list;
}

describe("upsertTemplate（テンプレートの保存）", () => {
  it("新しい名前なら追加する。期限日は保存しない", () => {
    const result = upsertTemplate([], input("週報", { priority: "high", category: "work", recurrence: "weekly" }), {
      id: "w",
      now: NOW,
    });
    expect(result).toEqual({
      ok: true,
      action: "created",
      templates: [
        {
          id: "w",
          title: "週報",
          description: "",
          priority: "high",
          category: "work",
          recurrence: "weekly",
          createdAt: NOW.toISOString(),
        },
      ],
    });
  });

  it("同じ名前があれば、ID と作成日時はそのままで内容を上書きする", () => {
    const first = make(1); // T0
    const result = upsertTemplate(first, input("T0", { priority: "low", description: "新しいメモ" }));
    expect(result.ok && result.action).toBe("updated");
    expect(result.ok && result.templates).toEqual([{ ...first[0], priority: "low", description: "新しいメモ" }]);
  });

  it(`${TEMPLATE_LIMIT}個を超えて追加はできない（上書きはできる）`, () => {
    const full = make(TEMPLATE_LIMIT);
    expect(upsertTemplate(full, input("新しいもの"))).toEqual({ ok: false, reason: "limit" });
    expect(upsertTemplate(full, input("T3")).ok).toBe(true);
  });
});

describe("deleteTemplate / inputFromTemplate", () => {
  it("指定したテンプレートだけを削除する", () => {
    expect(deleteTemplate(make(3), "t1").map((t) => t.id)).toEqual(["t0", "t2"]);
  });

  it("テンプレートからタスクの入力を作る（期限日はなし）", () => {
    const [t] = make(1);
    expect(inputFromTemplate(t)).toEqual({
      title: "T0",
      description: "",
      priority: "medium",
      category: null,
      recurrence: "none",
      dueDate: null,
    });
  });
});

describe("isTemplate（形のチェック）", () => {
  const [valid] = make(1);
  it.each([
    ["名前が空白だけ", { title: "  " }],
    ["優先度が想定外", { priority: "urgent" }],
    ["カテゴリが想定外", { category: "hobby" }],
    ["繰り返しが想定外", { recurrence: "yearly" }],
    ["作成日時が不正", { createdAt: "きのう" }],
  ])("%s は false", (_label, fields) => {
    expect(isTemplate({ ...valid, ...fields })).toBe(false);
  });
  it("正しいテンプレートは true", () => {
    expect(isTemplate(valid)).toBe(true);
  });
});

describe("saveTemplates / loadTemplates（保存と読み込み）", () => {
  it("保存したテンプレートを読み込める", () => {
    const list = make(2);
    expect(saveTemplates(list)).toEqual({ ok: true });
    expect(loadTemplates()).toEqual(list);
  });

  it("壊れたデータでも例外を投げず、正しいものだけ読む", () => {
    localStorage.setItem(TEMPLATES_KEY, "{壊れた");
    expect(loadTemplates()).toEqual([]);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify({ version: 1, templates: [make(1)[0], { title: 1 }] }));
    expect(loadTemplates()).toHaveLength(1);
  });

  it("容量オーバーなら quota を返す", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveTemplates(make(1))).toEqual({ ok: false, reason: "quota" });
  });
});
