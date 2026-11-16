"use client";

/**
 * テンプレート（課題2-L）のボタン一覧。新規追加フォームの下に表示する。
 * ボタンを押すと、テンプレートの内容でタスクがすぐ追加される（ワンタップ）。
 * 「管理」を開くと、不要になったテンプレートを削除できる。
 */
import { useState } from "react";
import { CategoryBadge, RecurrenceBadge } from "@/components/TaskMeta";
import { TEMPLATE_LIMIT } from "@/lib/templates";
import type { Template } from "@/types/template";

type Props = {
  templates: Template[];
  onUse: (template: Template) => void;
  onDelete: (id: string) => void;
};

function TemplateRow({ template, onDelete }: { template: Template; onDelete: (id: string) => void }) {
  // 削除の確認を表示中か（タスクの削除と同じく、誤操作を防ぐ）
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-1 ring-1 ring-inset ring-slate-200">
      <span className="min-w-0 flex-1 break-words text-base font-medium text-slate-900">{template.title}</span>
      <CategoryBadge category={template.category} />
      <RecurrenceBadge recurrence={template.recurrence} />
      {confirming ? (
        <span className="flex items-center gap-1" onKeyDown={(event) => event.key === "Escape" && setConfirming(false)}>
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(false)}
            className="min-h-11 whitespace-nowrap rounded-lg px-3 text-base font-semibold text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            className="min-h-11 whitespace-nowrap rounded-lg bg-red-600 px-3 text-base font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            削除する
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`テンプレート「${template.title}」を削除`}
          className="min-h-11 whitespace-nowrap rounded-lg px-3 text-base font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
        >
          削除
        </button>
      )}
    </li>
  );
}

export function TemplateBar({ templates, onUse, onDelete }: Props) {
  const [managing, setManaging] = useState(false);

  if (templates.length === 0) {
    return (
      <p className="mt-3 text-base text-slate-600">
        {"よく使うタスクは「詳細を設定」の中でテンプレートに保存すると、次からワンタップで追加できます。"}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 id="template-heading" className="text-base font-semibold text-slate-700">
          テンプレートから追加
        </h3>
        <button
          type="button"
          onClick={() => setManaging((open) => !open)}
          aria-expanded={managing}
          className="-mr-2 ml-auto min-h-11 whitespace-nowrap rounded-lg px-2 text-base font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          {managing ? "管理を閉じる" : `管理（${templates.length}/${TEMPLATE_LIMIT}）`}
        </button>
      </div>

      <ul aria-labelledby="template-heading" className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onUse(template)}
              aria-label={`テンプレート「${template.title}」から追加`}
              className="min-h-11 max-w-full rounded-full border border-indigo-200 bg-indigo-50 px-4 text-left text-base font-semibold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <span aria-hidden="true">＋ </span>
              {template.title}
            </button>
          </li>
        ))}
      </ul>

      {managing && (
        <ul aria-label="テンプレートの管理" className="mt-2 flex flex-col gap-2">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
