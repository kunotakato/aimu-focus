/**
 * 注意・エラーなどのメッセージ枠。
 * 色だけでなく、アイコンと見出しの言葉でも種類が分かるようにしている。
 */
import type { ReactNode } from "react";
import { ErrorIcon, InfoIcon, WarningIcon } from "@/components/icons";

type Variant = "error" | "warning" | "info";

const styles: Record<Variant, { box: string; Icon: typeof ErrorIcon; label: string }> = {
  error: { box: "border-red-300 bg-red-50 text-red-900", Icon: ErrorIcon, label: "エラー" },
  warning: { box: "border-amber-300 bg-amber-50 text-amber-950", Icon: WarningIcon, label: "注意" },
  info: { box: "border-slate-300 bg-white text-slate-700", Icon: InfoIcon, label: "お知らせ" },
};

type Props = {
  variant: Variant;
  children: ReactNode;
  /** 渡すと「閉じる」ボタンを表示する */
  onDismiss?: () => void;
};

export function Notice({ variant, children, onDismiss }: Props) {
  const { box, Icon, label } = styles[variant];
  return (
    // role="alert": 表示された瞬間に読み上げソフトが内容を読み上げる
    <div role={variant === "info" ? "status" : "alert"} className={`flex gap-3 rounded-xl border p-4 ${box}`}>
      <Icon className="mt-0.5" />
      <div className="min-w-0 flex-1 text-base leading-relaxed">
        <p className="font-bold">{label}</p>
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-m-1 min-h-11 shrink-0 self-start rounded-lg px-3 text-base font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-current"
        >
          閉じる
        </button>
      )}
    </div>
  );
}
