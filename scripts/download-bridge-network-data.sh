#!/bin/bash

# 一時ディレクトリを作成
mkdir -p temp/bridge

# bridgeNetworkData.tsをダウンロード
echo "Downloading bridgeNetworkData.ts..."
curl -s https://raw.githubusercontent.com/DefiLlama/bridges-server/refs/heads/master/src/data/bridgeNetworkData.ts > temp/bridge/bridgeNetworkData.ts

# allChains.tsをダウンロード
echo "Downloading allChains.ts..."
curl -s https://raw.githubusercontent.com/DefiLlama/bridges-server/refs/heads/master/src/adapters/layerzero/allChains.ts > temp/bridge/allChains.ts

# ファイルの内容を確認（デバッグ用）
echo "===== bridgeNetworkData.ts content ====="
head -n 20 temp/bridge/bridgeNetworkData.ts
echo "===== end of preview ====="

echo "===== allChains.ts content ====="
head -n 20 temp/bridge/allChains.ts
echo "===== end of preview ====="

# Node.jsスクリプトを作成して、TSファイルをJSONに変換
cat > temp/bridge/convert.js << 'EOF'
const fs = require('fs');

// allChains.tsの内容を読み込む
const allChainsContent = fs.readFileSync('temp/bridge/allChains.ts', 'utf8');
// 配列部分を抽出
const allChainsMatch = allChainsContent.match(/const allChains = \[([\s\S]*?)\];/);
if (!allChainsMatch) {
  console.error('Could not parse allChains.ts');
  process.exit(1);
}

// 文字列の配列を作成
const allChainsArray = allChainsMatch[1]
  .split(',')
  .map(s => s.trim())
  .filter(s => s.length > 0)
  .map(s => s.replace(/"/g, '').replace(/'/g, ''));

// bridgeNetworkData.tsの内容を読み込む
const bridgeNetworkDataContent = fs.readFileSync('temp/bridge/bridgeNetworkData.ts', 'utf8');

// export default [...] の部分を抽出
const exportMatch = bridgeNetworkDataContent.match(/export default \[([\s\S]*?)\] as BridgeNetwork\[\];/);
if (!exportMatch) {
  console.error('Could not parse bridgeNetworkData.ts');
  process.exit(1);
}

// 各ブリッジのデータを抽出
const bridgeDataString = exportMatch[1];

// allChainsを参照している部分を置換
const processedBridgeData = bridgeDataString.replace(
  /allChains\s*\.\s*reduce\s*\(\s*\(\s*acc\s*:\s*string\[\]\s*,\s*chain\s*\)\s*=>\s*\{\s*return\s*acc\s*\.\s*concat\s*\(\s*layerZeroChainMapping\s*\[\s*chain\s*\]\s*\|\|\s*chain\s*\)\s*;\s*\}\s*,\s*\[\s*\]\s*\)\s*\.\s*map\s*\(\s*\(\s*c\s*\)\s*=>\s*c\s*\?\s*\.\s*toLowerCase\s*\(\s*\)\s*\)/g,
  JSON.stringify(allChainsArray.map(c => c.toLowerCase()))
);

// オブジェクトの配列に変換
const bridgeNetworkData = eval(`[${processedBridgeData}]`);

// 必要なプロパティだけを残す
const cleanedData = bridgeNetworkData.map(bridge => {
  const {
    id,
    displayName,
    bridgeDbName,
    iconLink,
    largeTxThreshold,
    url,
    chains,
    destinationChain,
    chainMapping
  } = bridge;
  
  const cleanedBridge = {
    id,
    displayName,
    bridgeDbName,
    iconLink,
    largeTxThreshold,
    url,
    chains
  };
  
  if (destinationChain) {
    cleanedBridge.destinationChain = destinationChain;
  }
  
  if (chainMapping) {
    cleanedBridge.chainMapping = chainMapping;
  }
  
  return cleanedBridge;
});

// JSONとして保存
fs.writeFileSync('temp/bridgeNetworkData.json', JSON.stringify(cleanedData, null, 2));
console.log('Successfully converted bridgeNetworkData.ts to JSON');
EOF

# Node.jsスクリプトを実行
echo "Converting TS files to JSON..."
node temp/bridge/convert.js

# 変換結果を確認
echo "===== bridgeNetworkData.json content ====="
head -n 20 temp/bridgeNetworkData.json
echo "===== end of preview ====="
echo "===== bridgeNetworkData.json last 10 lines ====="
tail -n 10 temp/bridgeNetworkData.json
echo "===== end of preview ====="

# ファイルサイズを確認
echo "File size: $(wc -c < temp/bridgeNetworkData.json) bytes" 