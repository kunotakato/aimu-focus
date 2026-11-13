/**
 * 小さなアイコン集。
 * 色だけで意味を伝えない（色覚の個人差に配慮する）ため、メッセージには必ず形の違うアイコンを添える。
 * aria-hidden: 読み上げソフトにはアイコンを読ませない（隣の文字で意味が伝わるため）。
 */
type IconProps = { className?: string };

const base = "size-5 shrink-0";

export function SpinnerIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** 三角形の「！」= 注意 */
export function WarningIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10v4m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 丸に「×」= エラー */
export function ErrorIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m9 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 丸に「i」= お知らせ */
export function InfoIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5m0-8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 荷札 = カテゴリ */
export function TagIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** 回る矢印 = 繰り返し */
export function RepeatIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 星 = 今日やる（塗りつぶしで「選んでいる」を表す） */
export function StarIcon({ className = "", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden="true" className={`${base} ${className}`}>
      <path
        d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
