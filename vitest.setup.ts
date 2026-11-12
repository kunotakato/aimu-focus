// toBeInTheDocument() などの「画面向けの確認方法」を使えるようにする
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// テストごとに後片付けをして、前のテストの結果が次のテストに影響しないようにする
afterEach(() => {
  cleanup(); // 画面を片付ける
  localStorage.clear(); // 保存データを消す
  vi.restoreAllMocks(); // テスト用に差し替えた関数を元に戻す
});
