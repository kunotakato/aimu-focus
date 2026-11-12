/**
 * タスク用の一意な ID を作る。
 *
 * crypto.randomUUID() はブラウザ標準の「重複しない ID を作る関数」。
 * ただし https または localhost 以外（例: スマホから http://192.168.x.x で開発サーバーに接続）
 * では使えないため、その場合は時刻と乱数を組み合わせた ID で代用する。
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
