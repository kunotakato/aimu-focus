/**
 * 文字列をファイルとしてダウンロードさせる（ブラウザ専用）。
 *
 * Blob = メモリ上に作った「ファイルの中身」。
 * それを指す一時的な URL を作り、見えないリンクをクリックしたことにして保存させる。
 */
export function downloadTextFile(fileName: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // 使い終わった一時 URL は解放する（メモリの無駄づかいを防ぐ）。
  // すぐ解放すると一部のブラウザ（Safari など）で保存に失敗するので、少し待つ
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
