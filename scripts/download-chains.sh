#!/bin/bash

# 一時ファイルにダウンロード
curl -s https://chainid.network/chains.json > temp/full_chains.json

# 必要なパラメータだけを抽出（chainId、nativeCurrency、rpc）
jq '[.[] | {chainId: .chainId, nativeCurrency: .nativeCurrency, rpc: .rpc}]' temp/full_chains.json > temp/chains.json

# ファイルサイズを確認
echo "Original file size: $(wc -c < temp/full_chains.json) bytes"
echo "Reduced file size: $(wc -c < temp/chains.json) bytes"

# ファイルの内容を確認（デバッグ用）
echo "===== chains.json content ====="
head -n 20 temp/chains.json
echo "===== end of preview =====" 