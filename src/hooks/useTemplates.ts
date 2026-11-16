"use client";

/**
 * テンプレート（課題2-L）の一覧と操作をまとめたカスタムフック。
 * useTasks と同じ形：画面の部品は「どこに保存しているか」を知らなくてよい。
 */
import { useState } from "react";
import type { TaskInput } from "@/lib/tasks";
import {
  deleteTemplate,
  loadTemplates,
  saveTemplates,
  upsertTemplate,
  type SaveTemplatesResult,
} from "@/lib/templates";
import type { Template } from "@/types/template";

export function useTemplates() {
  // 最初の1回だけ localStorage から読み込む（lazy initializer）
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [saveError, setSaveError] = useState<Extract<SaveTemplatesResult, { ok: false }>["reason"] | null>(null);

  function commit(next: Template[]) {
    setTemplates(next);
    const result = saveTemplates(next);
    setSaveError(result.ok ? null : result.reason);
  }

  return {
    templates,
    saveError,
    /** 保存する。上限で保存できなければ "limit"、保存できたら "created" か "updated" を返す */
    save: (input: TaskInput): "created" | "updated" | "limit" => {
      const result = upsertTemplate(templates, input);
      if (!result.ok) return "limit";
      commit(result.templates);
      return result.action;
    },
    remove: (id: string) => commit(deleteTemplate(templates, id)),
    /** まるごと置き換える（バックアップからの復元に使う） */
    replaceAll: (next: Template[]) => commit(next),
  };
}
