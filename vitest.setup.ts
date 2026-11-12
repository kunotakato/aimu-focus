// toBeInTheDocument() などの「画面向けの確認方法」を使えるようにする
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// テストごとに画面を片付け、前のテストの結果が次のテストに影響しないようにする
afterEach(() => {
  cleanup();
});
