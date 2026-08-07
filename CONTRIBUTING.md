# コントリビューションガイド

真戦武将帳への改善提案ありがとうございます。本プロジェクトは、ローカルファースト、安全な公開データ取り込み、自然な日本語 UI、再現可能なデータ生成を重視します。

## 開発方針

- ユーザー向け文言と開発文書は自然な日本語を基本にします。
- アカウントなしの Local Mode を常に完全利用可能にします。
- 個人データは Dexie 経由で IndexedDB に保存します。
- 公開カタログと個人データを混在させません。
- 外部データは検証とプレビュー後にだけ書き込みます。
- 任意 URL proxy、認証回避、CAPTCHA 回避、非公開 API の利用を追加しません。
- 検索、器術、順位、編成、backup、migration は純粋関数を優先します。
- Backup Schema を変更するときは version を上げ、1 段階ずつ migration を追加します。
- 元プロジェクトと第三者素材の著作権表示を維持します。

## セットアップ

```bash
npm ci
python -m pip install -r requirements.txt
npx playwright install chromium
```

## 変更前の確認

1. Issue や既存 pull request に同じ問題がないか確認します。
2. 公開データ変更では出典 URL と取得日を記録します。
3. UI 変更では desktop と 390 px 前後の mobile を確認します。
4. 個人データ形式を変更する場合は backward compatibility を設計します。

## 完了前のコマンド

```bash
npm run data:check
npm run typecheck
npm test
npm run test:python
npm run build
npm run test:e2e
```

関係しないテストを省略した場合は、pull request に理由を書いてください。

## 公開データ変更

- crawler の出力を無検証で commit しないでください。
- 武将 ID と戦法 ID の安定性を維持してください。
- 既存武将の ID 変更は IndexedDB の個人データを孤立させます。
- 自動取得できない値を推測で埋めず、出典または手動 correction を明記してください。
- crawler は低頻度、cache 利用、timeout 付きで実行してください。

## Backup Schema

`schemaVersion` を変更する場合は次をすべて行います。

1. `src/shinsen/types.ts` に旧・新形式を定義
2. `src/shinsen/migrations/` に隣接 version 間の migration を追加
3. `src/shinsen/domain/backup.ts` の validation と migration chain を更新
4. 旧形式、現在形式、不正形式、merge、replace の test を追加
5. README の Schema Version と移行説明を更新

## 外部通信

Qookka と portrait の server route を変更するときは、allowlist、HTTPS、method、ID pattern、response size、MIME、timeout、redirect 拒否を維持してください。新しい接続先を追加する場合は、必要性と公開性を pull request に記載してください。

## Issue に含める内容

- 再現手順
- 期待した結果
- 実際の結果
- OS と browser version
- `start.cmd` / `npm run dev` / 配布 URL のどれを使ったか
- 使用 port
- Console error と network status
- 最小限の screenshot

有効な共有 URL、`snapshot_id`、個人メモ、backup file 全文、秘密情報を公開 issue に貼らないでください。

## Commit / Pull Request

- 1 つの変更目的に集中します。
- 生成物 `dist/`、`node_modules/`、cache、report を commit しません。
- UI 変更では before / after screenshot を添付します。
- データ変更では件数、version、validation 結果を記載します。
- 破壊的変更と migration を明示します。
- README、NOTICE、test を実装と同時に更新します。
