"use client";

/**
 * 「今ブラウザで動いているか」を返すフック。
 *
 * Next.js はまずサーバーで HTML を作り、その後ブラウザで同じ画面を作り直して
 * 操作できる状態にする（これを Hydration = 水分補給 と呼ぶ）。
 * このとき、サーバーとブラウザで最初の画面が違うと Hydration Error になる。
 *
 * useSyncExternalStore の3つ目の引数（サーバー用の値）は、
 * サーバーでの描画と「ブラウザでの最初の描画（Hydration）」の両方で使われる。
 * そのため最初はどちらも false で一致し、Hydration が終わった直後に true へ切り替わる。
 */
import { useSyncExternalStore } from "react";

// 値が途中で変わることはないので、変化の通知（subscribe）は何もしなくてよい
const subscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // ブラウザでの値
    () => false, // サーバー（と Hydration 中）の値
  );
}
