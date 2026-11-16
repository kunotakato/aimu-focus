/**
 * テンプレート（課題2-L）の型。
 * よく使うタスクの「ひな形」。期限日は使う日によって変わるので持たない。
 */
import type { Category, Priority, Recurrence } from "@/types/task";

export type Template = {
  /** テンプレートを見分ける一意な ID */
  id: string;
  /** 追加するタスクの名前（テンプレートの名前としても表示する） */
  title: string;
  description: string;
  priority: Priority;
  category: Category | null;
  recurrence: Recurrence;
  /** 作成日時（ISO 形式） */
  createdAt: string;
};
