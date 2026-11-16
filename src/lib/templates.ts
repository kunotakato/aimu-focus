/**
 * テンプレート（課題2-L）の操作と保存。
 * 操作する関数は、タスクと同じく「元の配列を書き換えず、新しい配列を返す」純粋関数にする。
 * 保存先はタスクとは別のキーにする（タスクの保存データの形を変えずに済むように）。
 */
import { createId } from "@/lib/id";
import { getStorage, isQuotaError } from "@/lib/storage";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, type TaskInput } from "@/lib/tasks";
import type { Template } from "@/types/template";

export const TEMPLATES_KEY = "aimu-focus:templates";
export const TEMPLATES_VERSION = 1;
/** 保存できるテンプレートの最大数（ボタンが並びすぎて選びにくくならないように） */
export const TEMPLATE_LIMIT = 10;

const PRIORITIES = ["high", "medium", "low"];
const CATEGORIES = ["work", "side", "study", "life", "other"];
const RECURRENCES = ["none", "daily", "weekly", "monthly"];

/** 外から来たデータがテンプレートの形をしているか */
export function isTemplate(value: unknown): value is Template {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    t.id !== "" &&
    typeof t.title === "string" &&
    t.title.trim() !== "" &&
    t.title.length <= TITLE_MAX_LENGTH &&
    typeof t.description === "string" &&
    t.description.length <= DESCRIPTION_MAX_LENGTH &&
    PRIORITIES.includes(t.priority as string) &&
    (t.category === null || CATEGORIES.includes(t.category as string)) &&
    RECURRENCES.includes(t.recurrence as string) &&
    typeof t.createdAt === "string" &&
    !Number.isNaN(Date.parse(t.createdAt))
  );
}

/**
 * タスクの入力内容をテンプレートとして保存する。
 *   - 同じ名前のテンプレートがあれば、内容を上書きする（同じものが2つ並ばないように）
 *   - なければ末尾に追加する。ただし TEMPLATE_LIMIT 個を超えるときは追加しない
 */
export function upsertTemplate(
  templates: Template[],
  input: TaskInput,
  options: { id?: string; now?: Date } = {},
): { ok: true; templates: Template[]; action: "created" | "updated" } | { ok: false; reason: "limit" } {
  const fields = {
    title: input.title,
    description: input.description,
    priority: input.priority,
    category: input.category,
    recurrence: input.recurrence,
  };
  const existing = templates.find((t) => t.title === input.title);
  if (existing) {
    return {
      ok: true,
      action: "updated",
      templates: templates.map((t) => (t.id === existing.id ? { ...t, ...fields } : t)),
    };
  }
  if (templates.length >= TEMPLATE_LIMIT) return { ok: false, reason: "limit" };
  const template: Template = {
    id: options.id ?? createId(),
    ...fields,
    createdAt: (options.now ?? new Date()).toISOString(),
  };
  return { ok: true, action: "created", templates: [...templates, template] };
}

export function deleteTemplate(templates: Template[], id: string): Template[] {
  return templates.filter((t) => t.id !== id);
}

/** テンプレートから、新しいタスクの入力内容を作る（期限日はなし） */
export function inputFromTemplate(template: Template): TaskInput {
  return {
    title: template.title,
    description: template.description,
    priority: template.priority,
    category: template.category,
    recurrence: template.recurrence,
    dueDate: null,
  };
}

/** 保存されたテンプレートを読み込む。壊れたデータは読み飛ばし、例外は投げない */
export function loadTemplates(): Template[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(TEMPLATES_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; templates?: unknown };
    if (parsed?.version !== TEMPLATES_VERSION || !Array.isArray(parsed.templates)) return [];
    return parsed.templates.filter(isTemplate).slice(0, TEMPLATE_LIMIT);
  } catch {
    return [];
  }
}

export type SaveTemplatesResult = { ok: true } | { ok: false; reason: "quota" | "unavailable" };

export function saveTemplates(templates: Template[]): SaveTemplatesResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  try {
    storage.setItem(TEMPLATES_KEY, JSON.stringify({ version: TEMPLATES_VERSION, templates }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}
