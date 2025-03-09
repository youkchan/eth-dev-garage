import { useState, useEffect } from 'react';
// ローカルのデータファイルをインポート
import chainIdsData from '../data/chain-ids.json';
import { extraRpcs as extraRpcsData } from '../data/extraRpcs.js';
import chainsData from '../data/chains.json';

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcs: string[];
  blockExplorer: string;
}

export type NetworksMap = Record<string, NetworkInfo>;

// 優先ネットワークの設定を読み込む関数
async function loadPriorityNetworks() {
  try {
    // 優先ネットワークの設定を読み込む
    const prioritiesResponse = await fetch('/network-priorities.json');
    const prioritiesData = await prioritiesResponse.json();
    return prioritiesData.priorityNetworks || [];
  } catch (error) {
    console.error('Error loading priority networks:', error);
    // デフォルト値を返す
    return ['ethereum', 'sepolia', 'holesky', 'arbitrum', 'optimism', 'polygon', 'base'];
  }
}

// RPCデータとチェーンIDマッピングを取得する関数
export async function fetchChainData(): Promise<{
  chainIds: Record<string, string>;
  explorers: Record<string, string>;
  networkList: string[];
}> {
  try {
    // 優先ネットワークを読み込む
    const priorityNetworks = await loadPriorityNetworks();
    
    // ローカルのchainIdsデータを使用
    const chainIds = chainIdsData;
    
    // ネットワークリストを作成（chainIdsから取得したすべてのネットワーク）
    const allNetworks = new Set<string>();
    Object.values(chainIds).forEach(value => {
      allNetworks.add(value as string);
    });
    
    // 優先ネットワークを先頭に配置し、残りをアルファベット順に並べる
    const networkList = [
      ...priorityNetworks.filter((network: string) => allNetworks.has(network)),
      ...Array.from(allNetworks)
        .filter(network => !priorityNetworks.includes(network))
        .sort()
    ];
    
    // エクスプローラーURLのマッピングを作成
    const explorers: Record<string, string> = {};
    Object.entries(chainIds).forEach(([chainId, networkKey]) => {
      const network = networkKey as string;
      
      // 主要なネットワークのエクスプローラーURLを設定
      if (network === 'ethereum') {
        explorers[network] = 'https://etherscan.io/tx/';
      } else if (network === 'polygon') {
        explorers[network] = 'https://polygonscan.com/tx/';
      } else if (network === 'arbitrum') {
        explorers[network] = 'https://arbiscan.io/tx/';
      } else if (network === 'optimism') {
        explorers[network] = 'https://optimistic.etherscan.io/tx/';
      } else if (network === 'base') {
        explorers[network] = 'https://basescan.org/tx/';
      } else if (network === 'sepolia') {
        explorers[network] = 'https://sepolia.etherscan.io/tx/';
      } else if (network === 'holesky') {
        explorers[network] = 'https://holesky.etherscan.io/tx/';
      } else {
        // その他のネットワークはデフォルトのエクスプローラーを設定
        explorers[network] = `https://${network}scan.io/tx/`;
      }
    });
    
    return { chainIds, explorers, networkList };
  } catch (error) {
    console.error('Error fetching chain data:', error);
    // フォールバック値を返す
    return {
      chainIds: { '1': 'ethereum', '11155111': 'sepolia', '17000': 'holesky' },
      explorers: {
        'ethereum': 'https://etherscan.io/tx/',
        'sepolia': 'https://sepolia.etherscan.io/tx/',
        'holesky': 'https://holesky.etherscan.io/tx/'
      },
      networkList: ['ethereum', 'sepolia', 'holesky']
    };
  }
}

// RPCデータをフェッチする関数
export async function fetchRpcData(): Promise<{
  networks: NetworksMap;
  networkList: string[]; // 追加: ネットワークリスト
}> {
  try {
    // チェーンIDとエクスプローラーデータを取得
    const { chainIds, explorers, networkList } = await fetchChainData();
    
    // ローカルのextraRpcsデータを使用
    const extraRpcs = extraRpcsData;
    
    // ローカルのchainsデータを使用
    const chains = chainsData;
    
    // 必要なネットワークのRPCを手動で抽出する方法に変更
    const networksMap: NetworksMap = {};
    
    // チェーンIDからネットワークキーへのマッピングを作成
    const chainIdToNetworkKey: Record<string, string> = {};
    Object.entries(chainIds).forEach(([chainId, networkKey]) => {
      chainIdToNetworkKey[chainId] = networkKey as string;
    });
    
    // ネットワークキーからチェーンIDへのマッピングを作成
    const networkKeyToChainId: Record<string, number> = {};
    Object.entries(chainIds).forEach(([chainId, networkKey]) => {
      networkKeyToChainId[networkKey as string] = parseInt(chainId, 10);
    });

    // Sepolia と Holesky を手動で追加
    networksMap['sepolia'] = {
      name: 'Sepolia',
      chainId: 11155111,
      rpcs: [
        'https://rpc.sepolia.org',
        'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
        'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura key
        'https://rpc2.sepolia.org',
        'https://eth-sepolia.public.blastapi.io'
      ],
      blockExplorer: 'https://sepolia.etherscan.io/tx/'
    };

    networksMap['holesky'] = {
      name: 'Holesky',
      chainId: 17000,
      rpcs: [
        'https://ethereum-holesky.publicnode.com',
        'https://holesky.blockpi.network/v1/rpc/public',
        'https://holesky.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura key
        'https://ethereum-holesky.blockpi.network/v1/rpc/public',
        'https://1rpc.io/holesky'
      ],
      blockExplorer: 'https://holesky.etherscan.io/tx/'
    };
    
    // chainsデータからRPC URLを抽出
    chains.forEach((chain: any) => {
      const chainId = chain.chainId;
      const networkKey = chainIdToNetworkKey[chainId.toString()];
      
      if (networkKey && chain.rpc && chain.rpc.length > 0) {
        // 既存のネットワーク情報があれば更新、なければ新規作成
        if (!networksMap[networkKey]) {
          networksMap[networkKey] = {
            name: getNetworkNameFromKey(networkKey),
            chainId: chainId,
            rpcs: chain.rpc.filter((url: string) => 
              url && !url.includes('${') && !url.includes('wss://')
            ),
            blockExplorer: explorers[networkKey] || ""
          };
        } else {
          // 既存のRPCリストに新しいRPCを追加
          const existingRpcs = new Set(networksMap[networkKey].rpcs);
          chain.rpc.forEach((url: string) => {
            if (url && !url.includes('${') && !url.includes('wss://')) {
              existingRpcs.add(url);
            }
          });
          networksMap[networkKey].rpcs = Array.from(existingRpcs);
        }
      }
    });
    
    // extraRpcsデータからRPC URLを抽出
    Object.entries(extraRpcs).forEach(([chainId, rpcData]) => {
      const networkKey = chainIdToNetworkKey[chainId];
      
      if (networkKey) {
        // RPC URLを抽出
        const rpcUrls: string[] = [];
        
        if (typeof rpcData === 'object' && rpcData !== null) {
          // rpcsプロパティがある場合
          const rpcs = (rpcData as any).rpcs;
          if (Array.isArray(rpcs)) {
            rpcs.forEach(rpc => {
              if (typeof rpc === 'string' && !rpc.includes('${') && !rpc.includes('wss://')) {
                rpcUrls.push(rpc);
              } else if (typeof rpc === 'object' && rpc !== null && typeof rpc.url === 'string') {
                if (!rpc.url.includes('${') && !rpc.url.includes('wss://')) {
                  rpcUrls.push(rpc.url);
                }
              }
            });
          }
        }
        
        if (rpcUrls.length > 0) {
          // 既存のネットワーク情報があれば更新、なければ新規作成
          if (!networksMap[networkKey]) {
            networksMap[networkKey] = {
              name: getNetworkNameFromKey(networkKey),
              chainId: parseInt(chainId, 10),
              rpcs: rpcUrls,
              blockExplorer: explorers[networkKey] || ""
            };
          } else {
            // 既存のRPCリストに新しいRPCを追加
            const existingRpcs = new Set(networksMap[networkKey].rpcs);
            rpcUrls.forEach(url => existingRpcs.add(url));
            networksMap[networkKey].rpcs = Array.from(existingRpcs);
          }
        }
      }
    });
    
    // 最終的なネットワークリストを作成
    // Sepolia と Holesky が確実に含まれるようにする
    const finalNetworkList = Array.from(new Set([
      ...networkList,
      'sepolia',
      'holesky'
    ]));
    
    return {
      networks: networksMap,
      networkList: finalNetworkList
    };
  } catch (error) {
    console.error('Error fetching RPC data:', error);
    
    // フォールバック値を返す
    const fallbackNetworksMap: NetworksMap = {
      'ethereum': {
        name: 'Ethereum',
        chainId: 1,
        rpcs: ['https://eth.llamarpc.com', 'https://cloudflare-eth.com'],
        blockExplorer: 'https://etherscan.io/tx/'
      },
      'sepolia': {
        name: 'Sepolia',
        chainId: 11155111,
        rpcs: ['https://rpc.sepolia.org', 'https://ethereum-sepolia.blockpi.network/v1/rpc/public'],
        blockExplorer: 'https://sepolia.etherscan.io/tx/'
      },
      'holesky': {
        name: 'Holesky',
        chainId: 17000,
        rpcs: ['https://ethereum-holesky.publicnode.com', 'https://holesky.blockpi.network/v1/rpc/public'],
        blockExplorer: 'https://holesky.etherscan.io/tx/'
      }
    };
    
    const fallbackNetworkList = ['ethereum', 'sepolia', 'holesky'];
    
    return {
      networks: fallbackNetworksMap,
      networkList: fallbackNetworkList
    };
  }
}

// RPCデータを使用するためのReactフック
export function useRpcData() {
  const [networksData, setNetworksData] = useState<NetworksMap | null>(null);
  const [networkList, setNetworkList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadRpcData() {
      try {
        const { networks, networkList } = await fetchRpcData();
        setNetworksData(networks);
        setNetworkList(networkList);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load RPC data'));
      } finally {
        setLoading(false);
      }
    }

    loadRpcData();
  }, []);

  return { networksData, networkList, loading, error };
}

// 指定されたネットワークの有効なRPCを見つける関数
export async function findWorkingRpc(rpcs: string[]): Promise<string> {
  if (rpcs.length === 0) {
    throw new Error('No RPCs provided');
  }
  
  // 並行してRPCをテスト
  const testResults = await Promise.allSettled(
    rpcs.map(async (rpc) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒タイムアウト
        
        const response = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_blockNumber',
            params: []
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(`JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`);
        }
        
        return rpc;
      } catch (error) {
        throw error;
      }
    })
  );
  
  // 成功したRPCを見つける
  for (const result of testResults) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
  }
  
  // すべてのRPCが失敗した場合
  throw new Error('All RPCs failed');
}

// ネットワーク名を取得するヘルパー関数
function getNetworkNameFromKey(networkKey: string): string {
  // ネットワークキーを適切な形式に変換
  // 例: "ethereum" -> "Ethereum", "binance" -> "Binance", "polygon_zkevm" -> "Polygon ZkEVM"
  
  // 特殊なケースを処理
  const specialCases: Record<string, string> = {
    'ethereum': 'Ethereum',
    'binance': 'BNB Chain',
    'bsc': 'BNB Chain',
    'xdai': 'Gnosis Chain',
    'ethereumclassic': 'Ethereum Classic',
    'okexchain': 'OKX Chain',
    'zksync era': 'zkSync Era',
    'polygon zkevm': 'Polygon zkEVM',
    'op_bnb': 'opBNB',
    'arbitrum nova': 'Arbitrum Nova',
    'nova network': 'Nova Network'
  };

  if (specialCases[networkKey]) {
    return specialCases[networkKey];
  }

  // アンダースコアをスペースに置換し、各単語の先頭を大文字に
  return networkKey.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}