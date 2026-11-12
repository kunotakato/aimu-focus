/**
 * タスクに関する「型」の定義ファイル。
 *
 * 型 = 「このデータはこういう形をしている」という約束。
 * 約束と違うデータを使おうとすると、TypeScript が実行前にエラーで教えてくれる。
 */

/** 優先度。この3つの文字列以外は入れられない（例: "urgent" はエラーになる） */
export type Priority = "high" | "medium" | "low";

/** 1件のタスク */
export type Task = {
  /** タスクを見分けるための一意な ID（同じ ID のタスクは2つ存在しない） */
  id: string;
  /** タスク名（前後の空白は取り除いた状態で保存する） */
  title: string;
  /** 説明文（Phase 3 で入力できるようにする。未入力なら空文字） */
  description: string;
  /** 完了していれば true */
  completed: boolean;
  /** 優先度（Phase 3 で選べるようにする。初期値は "medium"） */
  priority: Priority;
  /** 期限日。"2026-11-30" のような日付文字列。期限なしなら null */
  dueDate: string | null;
  /** 作成日時（ISO 形式の文字列。例: "2026-11-12T03:00:00.000Z"） */
  createdAt: string;
  /** 最終更新日時（ISO 形式の文字列） */
  updatedAt: string;
};
