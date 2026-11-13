# テストと品質確認

## 実行方法

```bash
npm test            # 自動テスト（Vitest + React Testing Library）
npm run lint        # ESLint（コードの書き方のチェック）
npm run typecheck   # TypeScript の型チェック
npm run build       # 本番用ビルド
```

## 必須テスト項目と対応するテスト

| 必須項目 | テストファイル | 主な確認内容 |
|---|---|---|
| タスク追加 | `components/TodoApp.test.tsx` | Enter キー・「追加」ボタンで追加、入力欄が空に戻る |
| 空白タスクの登録防止 | `lib/tasks.test.ts`, `components/TodoApp.test.tsx` | 空文字・半角/全角スペース・改行だけは登録されず、エラー表示 |
| 完了・未完了の切り替え | `lib/tasks.test.ts`, `components/TodoApp.test.tsx` | チェックで切り替わり、更新日時が変わる |
| タスク編集 | `lib/tasks.test.ts`, `components/TaskDetails.test.tsx` | 名前・優先度などを保存、空白名は不可、キャンセルで変化なし |
| 削除 | `lib/tasks.test.ts`, `components/TodoApp.test.tsx` | 確認してから削除、キャンセル・Escape で残る |
| localStorage への保存 | `lib/storage.test.ts`, `components/TodoApp.test.tsx` | 操作のたびに形式番号付きで保存 |
| localStorage からの復元 | `lib/storage.test.ts`, `components/TodoApp.test.tsx` | 画面を作り直しても状態が戻る、別タブの変更を反映 |
| 不正な保存データの処理 | `lib/storage.test.ts`, `lib/validation.test.ts`, `components/TodoApp.test.tsx` | 壊れた JSON・形式違い・一部破損でも停止せず、元データを退避。保存失敗（容量超過）も表示 |
| 検索・フィルター | `lib/filter.test.ts`, `components/TaskDetails.test.tsx` | キーワード（全角半角・大小文字を無視、複数語）、状態・優先度の絞り込み |
| 優先順位 | `lib/filter.test.ts`, `components/TaskDetails.test.tsx` | 優先度の設定・絞り込み・「優先度が高い順」の並び替え |
| 期限日の判定 | `lib/date.test.ts`, `components/TaskDetails.test.tsx` | 期限切れ・今日まで・残り日数、完了済みは期限切れにしない |
| 完了率の計算 | `lib/stats.test.ts`, `components/DashboardBackup.test.tsx` | 0件は表示しない（null）、切り捨てで 100% を誤表示しない |
| JSON バックアップ・復元 | `lib/backup.test.ts`, `components/DashboardBackup.test.tsx` | 書き出し→復元で内容が一致、不正ファイル8種類を拒否、確認・事前保存・取り消し |

### 課題2の追加機能

| 機能 | テストファイル | 主な確認内容 |
|---|---|---|
| データ形式2とマイグレーション | `lib/storage.test.ts`, `lib/backup.test.ts`, `lib/validation.test.ts`, `components/NewFeatures.test.tsx` | 形式1の保存データ・バックアップを形式2に変換して読み込める、新しい項目の不正値を拒否 |
| A. 今日のフォーカス | `lib/tasks.test.ts`, `components/NewFeatures.test.tsx` | 3件までの上限と理由の表示、完了した分は上限に数えない、日付が変わると外れる |
| B. カテゴリ分け | `lib/filter.test.ts`, `components/NewFeatures.test.tsx` | カテゴリを付けて追加・編集、カテゴリ・未設定での絞り込み |
| C. 繰り返しタスク | `lib/recurrence.test.ts`, `lib/tasks.test.ts`, `components/NewFeatures.test.tsx` | 次回期限の計算（月末・うるう年・遅れて完了・早めに完了）、内容の引き継ぎ、付け直しても重複しない |
| F. 週の振り返り | `lib/review.test.ts`, `components/NewFeatures.test.tsx` | 月曜はじまりの週、今週・先週の件数、曜日ごとの件数、連続日数、取り消すと減る |

上の表に加えて、キーボード操作（フォーカスの移動）と操作結果の表示を `components/Accessibility.test.tsx` で確認しています。

## 自動テスト以外の確認（手動・ブラウザ）

| 確認 | 方法 | 結果 |
|---|---|---|
| スマートフォン幅の表示 | Playwright で iPhone SE（幅 320px）・iPhone 13 を再現して撮影 | 横スクロールなし |
| 文字サイズ 16px 以上 | ブラウザ上ですべての文字の大きさを計測 | 16px 未満は 0 件 |
| ボタンの大きさ 44px 以上 | ブラウザ上ですべての操作部品の大きさを計測 | チェックボックス本体（24px）以外はすべて 44px 以上。チェックボックスはラベル全体（高さ 44px 以上）を押せる |
| アクセシビリティ | axe-core 4.14（WCAG 2.1 AA ほか）で検査 | 違反 0 件 |
| Hydration Error | 開発モード・本番モードでコンソールを確認 | 0 件 |
| 実際の操作 | 追加・完了・編集・削除・再読み込み・ファイル保存・復元 | 期待どおり |
| 公開URLでの動作（2026-11-12） | https://aimu-focus.vercel.app を Playwright で iPhone 13 相当と PC 幅で操作。空白タスクの拒否、追加・完了・編集・削除・検索、再読み込みとタブの開き直し後の復元、バックアップの保存と復元、壊れた保存データでの注意表示、axe 検査 | すべて期待どおり。コンソールのエラー 0 件、アクセシビリティ違反 0 件 |

| 課題2の追加機能（2026-11-13、ローカルの本番ビルド） | iPhone SE（幅 320px）と PC 幅で、今日のフォーカス・上限エラー・繰り返しの次回分・振り返りの件数と連続日数を操作。文字サイズ・axe 検査も実施 | すべて期待どおり。16px 未満の文字 0 件、アクセシビリティ違反 0 件、コンソールのエラー 0 件 |

## まだ確認できていないこと

- 実機のスマートフォン（特に iPhone の Safari）での操作・ファイル保存
- 日本語入力（IME）で変換を確定する Enter キーの動作（対策はコードに入れているが、実機での確認は未実施）
