/**
 * タスクに関する「型」の定義ファイル。
 *
 * 型 = 「このデータはこういう形をしている」という約束。
 * 約束と違うデータを使おうとすると、TypeScript が実行前にエラーで教えてくれる。
 */

/** 優先度。この3つの文字列以外は入れられない（例: "urgent" はエラーになる） */
export type Priority = "high" | "medium" | "low";

/** カテゴリ（課題2-B）。仕事・副業・学習・生活・その他 */
export type Category = "work" | "side" | "study" | "life" | "other";

/** 繰り返しの間隔（課題2-C）。"none" は繰り返さない */
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

/** 1件のタスク */
export type Task = {
  /** タスクを見分けるための一意な ID（同じ ID のタスクは2つ存在しない） */
  id: string;
  /** タスク名（前後の空白は取り除いた状態で保存する） */
  title: string;
  /** 説明文。未入力なら空文字 */
  description: string;
  /** 完了していれば true */
  completed: boolean;
  /** 優先度。初期値は "medium" */
  priority: Priority;
  /** 期限日。"2026-11-30" のような日付文字列。期限なしなら null */
  dueDate: string | null;
  /** 作成日時（ISO 形式の文字列。例: "2026-11-12T03:00:00.000Z"） */
  createdAt: string;
  /** 最終更新日時（ISO 形式の文字列） */
  updatedAt: string;

  // ---- ここから課題2で追加（保存データの形式2） ----

  /** カテゴリ。未設定なら null */
  category: Category | null;
  /** 繰り返しの間隔 */
  recurrence: Recurrence;
  /**
   * 繰り返しの「仲間」を見分ける ID。最初のタスクの id を、次回以降のタスクにも引き継ぐ。
   * 同じ仲間の未完了タスクがすでにあれば、次回分を重ねて作らないために使う。
   */
  seriesId: string;
  /** 「今日やる」に選んだ日（"YYYY-MM-DD"）。今日の日付と同じときだけ「今日のフォーカス」に出る */
  focusDate: string | null;
  /** 完了した日時（ISO 形式）。未完了なら null。週の振り返りの集計に使う */
  completedAt: string | null;
};
