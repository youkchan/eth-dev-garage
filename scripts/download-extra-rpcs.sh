#!/bin/bash

# 一時ファイルにダウンロード
curl -s https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/extraRpcs.js > temp/full_extraRpcs.js

# ファイルの内容を確認（デバッグ用）
echo "===== extraRpcs.js content ====="
head -n 20 temp/full_extraRpcs.js
echo "===== end of preview ====="

# 必要な部分だけを抽出（export const extraRpcs = { ... }）
grep -n "export const extraRpcs = {" temp/full_extraRpcs.js || echo "Pattern not found"

# 行番号を取得して抽出
START_LINE=$(grep -n "export const extraRpcs = {" temp/full_extraRpcs.js | cut -d: -f1)

if [ -n "$START_LINE" ]; then
  echo "Found 'export const extraRpcs = {' at line $START_LINE"
  # 抽出して新しいファイルに保存
  tail -n +$START_LINE temp/full_extraRpcs.js > temp/extraRpcs.js
else
  echo "WARNING: Could not find 'export const extraRpcs = {' pattern"
  # パターンが見つからない場合はファイル全体をコピー
  cp temp/full_extraRpcs.js temp/extraRpcs.js
fi

# trackingDetailsの項目を削除
echo "Removing trackingDetails from extraRpcs.js"
# Linux環境用のsedコマンド
sed -i 's/trackingDetails: [^,}]*,\{0,1\}//g' temp/extraRpcs.js

# 末尾の「const allExtraRpcs = mergeDeep(llamaNodesRpcs, extraRpcs); export default allExtraRpcs;」を削除
echo "Removing 'const allExtraRpcs = mergeDeep(llamaNodesRpcs, extraRpcs); export default allExtraRpcs;' from extraRpcs.js"
# ファイルの末尾から「const allExtraRpcs」を含む行以降を削除
sed -i '/const allExtraRpcs/,$d' temp/extraRpcs.js
# 最後の行が「};」で終わるようにする
if ! grep -q '};$' temp/extraRpcs.js; then
  echo "};" >> temp/extraRpcs.js
fi

# 削除後のファイルの内容を確認（デバッグ用）
echo "===== extraRpcs.js after processing ====="
head -n 20 temp/extraRpcs.js
echo "===== end of preview ====="
echo "===== extraRpcs.js last 10 lines ====="
tail -n 10 temp/extraRpcs.js
echo "===== end of preview =====" 