#!/bin/bash

# 一時ファイルにダウンロード
curl -s https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/chainIds.js > temp/full_chainIds.js

# export default を削除してJSONとして保存
cat temp/full_chainIds.js | sed 's/export default //' > temp/chain-ids.json

# ファイルサイズを確認
echo "File size: $(wc -c < temp/chain-ids.json) bytes"

# ファイルの内容を確認（デバッグ用）
echo "===== chain-ids.json content ====="
head -n 10 temp/chain-ids.json
echo "===== end of preview =====" 