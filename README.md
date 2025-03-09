# Ethereum Dev Garage

## Overview

Ethereum Dev Garage is a web application designed to simplify interactions with the Ethereum blockchain. This tool provides easy-to-use utilities for viewing transaction details and converting between different cryptocurrency units.

## Main Features

- **Unit Converter**: Easily convert between different units (Wei, Gwei, Ether for ETH and Wei, USDC for USDC)
- **Transaction Viewer**: View detailed transaction information across various Ethereum-compatible networks

## Donation

If you find this project useful, please consider supporting its development by donating to:

0xc4C1739a0aA11Ba6ceb6fBC3BC9ace5E009488Be

## License

MIT

## Contact

For questions or suggestions, please create an issue..

## GitHub Actions Workflows

このプロジェクトには以下のGitHub Actionsワークフローが設定されています：

### 1. 手動デプロイ (Manual Deployment)

手動でビルドとデプロイを実行するためのワークフローです。

- **ファイル**: `.github/workflows/manual-deploy.yml`
- **トリガー**: 手動（GitHub UIから実行）
- **機能**:
  - 環境の選択（staging/production）
  - デプロイメッセージの入力
  - ビルドとデプロイの実行

### 2. CI (継続的インテグレーション)

プルリクエストやメインブランチへのプッシュ時に自動的にテストを実行します。

- **ファイル**: `.github/workflows/ci.yml`
- **トリガー**: プルリクエスト、メインブランチへのプッシュ
- **機能**:
  - コードのリント
  - 型チェック
  - ビルド
  - テスト実行

### 3. 定期メンテナンス (Scheduled Maintenance)

定期的なメンテナンスタスクを自動実行します。

- **ファイル**: `.github/workflows/scheduled-tasks.yml`
- **トリガー**: スケジュール（毎週月曜日の午前3時）、または手動実行
- **機能**:
  - 依存関係の更新チェック
  - セキュリティスキャン
  - キャッシュのクリーンアップ

### 4. チェーンデータ更新 (Update Chain Data)

ブロックチェーンネットワーク関連のデータファイルを自動的に更新します。

- **ファイル**: `.github/workflows/update-chain-data.yml`
- **トリガー**: スケジュール（毎日午前3時）、または手動実行
- **機能**:
  - 外部ソースから最新のチェーンデータを取得
  - データ構造の変更を検出し通知
  - 差分がある場合はPRを自動作成
  - Slackに更新通知を送信
- **更新対象ファイル**:
  - `src/data/chain-ids.json`
  - `src/data/chains.json`
  - `src/data/extraRpcs.js`

## ワークフローの実行方法

1. GitHubリポジトリのActionsタブに移動
2. 左側のワークフローリストから実行したいワークフローを選択
3. 「Run workflow」ボタンをクリック
4. 必要なパラメータを入力して「Run workflow」をクリック
