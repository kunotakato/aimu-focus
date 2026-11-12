"use client";

/**
 * 今日の日付（"YYYY-MM-DD"）を返すフック。
 *
 * 描画中に new Date() を直接呼ぶと、描画のたびに結果が変わる「不純な処理」になる
 * （ESLint の react-hooks/purity ルールが禁止している）。
 * そこで useSyncExternalStore を使い、「時計」という外部の値として読み取る。
 * 1分ごとと、タブに戻ってきたときに確認するので、日付が変わっても表示が追従する。
 */
import { useSyncExternalStore } from "react";
import { toLocalDateString } from "@/lib/date";

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

// 文字列を返すので、日付が変わらない限り「同じ値」と判定され、無駄な再描画は起きない
const getSnapshot = () => toLocalDateString(new Date());

export function useToday(): string {
  // サーバーでは使わない部品だが、念のためサーバー用の値も同じ関数にしておく
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
