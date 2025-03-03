import { useState, useEffect } from 'react';

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcs: string[];
  blockExplorer: string;
}

export type NetworksMap = Record<string, NetworkInfo>;

// RPCデータとチェーンIDマッピングを取得する関数
export async function fetchChainData(): Promise<{
  chainIds: Record<string, string>;
  explorers: Record<string, string>;
  networkList: string[]; // 追加: ネットワークリスト
}> {
  try {
    // DefiLlamaのchainIdsデータを取得
    const chainIdsResponse = await fetch('https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/chainIds.js');
    if (!chainIdsResponse.ok) {
      throw new Error('Failed to fetch chain IDs data');
    }
    
    const chainIdsText = await chainIdsResponse.text();
    
    // JavaScriptオブジェクトを抽出
    const extractObject = (content: string) => {
      try {
        // export default { ... } の部分を抽出
        const startIdx = content.indexOf('{');
        const endIdx = content.lastIndexOf('}') + 1;
        
        if (startIdx === -1 || endIdx === -1) {
          throw new Error('Could not extract object from content');
        }
        
        const objStr = content.substring(startIdx, endIdx);
        // JSON形式に変換
        const jsonStr = objStr
          .replace(/\/\/.*$/gm, '') // コメントを削除
          .replace(/,(\s*[}\]])/g, '$1') // 末尾のカンマを削除
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // キーを引用符で囲む
          .replace(/'/g, '"'); // シングルクォートをダブルクォートに変換
        
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to extract object:', e);
        return {};
      }
    };
    
    const chainIds = extractObject(chainIdsText);
    
    // 主要なネットワークのリスト
    // 注: すべてのネットワークを含めると多すぎるため、主要なものだけをフィルタリング
    const popularNetworks = [
      'ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 
      'avalanche', 'binance', 'fantom', 'gnosis', 'zksync'
    ];
    
    // ネットワークリストを作成（chainIdsから取得したすべてのネットワーク）
    const allNetworks = new Set<string>();
    Object.values(chainIds).forEach(value => {
      allNetworks.add(value as string);
    });
    
    // 人気のあるネットワークを優先的に含め、それらを先頭に配置
    const networkList = [
      ...popularNetworks.filter(network => allNetworks.has(network)),
      ...Array.from(allNetworks).filter(network => !popularNetworks.includes(network))
    ];
    
    // エクスプローラーURLのマッピングを作成
    const explorers: Record<string, string> = {};
    Object.entries(chainIds).forEach(([chainId, networkKey]) => {
      const network = networkKey as string;
      
      // 一般的なエクスプローラーのパターンに基づいてURLを生成
      if (network === 'ethereum') {
        explorers[network] = 'https://etherscan.io/tx/';
      } else if (network === 'binance') {
        explorers[network] = 'https://bscscan.com/tx/';
      } else if (network === 'polygon') {
        explorers[network] = 'https://polygonscan.com/tx/';
      } else if (network === 'arbitrum') {
        explorers[network] = 'https://arbiscan.io/tx/';
      } else if (network === 'optimism') {
        explorers[network] = 'https://optimistic.etherscan.io/tx/';
      } else if (network === 'base') {
        explorers[network] = 'https://basescan.org/tx/';
      } else if (network === 'avalanche') {
        explorers[network] = 'https://snowtrace.io/tx/';
      } else if (network === 'fantom') {
        explorers[network] = 'https://ftmscan.com/tx/';
      } else if (network === 'gnosis') {
        explorers[network] = 'https://gnosisscan.io/tx/';
      } else if (network === 'zksync') {
        explorers[network] = 'https://explorer.zksync.io/tx/';
      } else {
        // その他のネットワークの場合は一般的なパターンを試す
        explorers[network] = `https://${network}scan.com/tx/`;
      }
    });
    
    return { chainIds, explorers, networkList };
  } catch (error) {
    console.error('Error fetching chain data:', error);
    
    // フォールバックデータ
    return {
      chainIds: {
        '1': 'ethereum',
        '10': 'optimism',
        '137': 'polygon',
        '42161': 'arbitrum',
        '8453': 'base'
      },
      explorers: {
        'ethereum': 'https://etherscan.io/tx/',
        'optimism': 'https://optimistic.etherscan.io/tx/',
        'polygon': 'https://polygonscan.com/tx/',
        'arbitrum': 'https://arbiscan.io/tx/',
        'base': 'https://basescan.org/tx/'
      },
      networkList: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base']
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
    
    // DefiLlamaのRPCデータを直接取得
    const response = await fetch('https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/extraRpcs.js');
    if (!response.ok) {
      throw new Error('Failed to fetch RPC data');
    }
    
    const text = await response.text();
    
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
    
    // 各ネットワークのRPCを正規表現で抽出
    Object.entries(networkKeyToChainId).forEach(([networkKey, chainId]) => {
      const chainIdStr = chainId.toString();
      
      // チェーンIDに対応するRPCを正規表現で検索
      const regex = new RegExp(`${chainIdStr}:\\s*{[^}]*rpcs:\\s*\\[([^\\]]+)\\]`, 's');
      const match = text.match(regex);
      
      if (match && match[1]) {
        // RPCのURLを抽出
        const rpcSection = match[1];
        const rpcUrls: string[] = [];
        
        // 文字列形式のRPC URLを抽出
        const stringRpcRegex = /'([^']+)'/g;
        let stringMatch;
        while ((stringMatch = stringRpcRegex.exec(rpcSection)) !== null) {
          rpcUrls.push(stringMatch[1]);
        }
        
        // オブジェクト形式のRPC URLを抽出
        const objectRpcRegex = /url:\s*'([^']+)'/g;
        let objectMatch;
        while ((objectMatch = objectRpcRegex.exec(rpcSection)) !== null) {
          rpcUrls.push(objectMatch[1]);
        }
        
        // ダブルクォート形式のRPC URLも抽出
        const doubleQuoteRpcRegex = /"([^"]+)"/g;
        let doubleQuoteMatch;
        while ((doubleQuoteMatch = doubleQuoteRpcRegex.exec(rpcSection)) !== null) {
          // 明らかにURLでないものを除外
          const url = doubleQuoteMatch[1];
          if (url.startsWith('http') && !url.includes('privacy')) {
            rpcUrls.push(url);
          }
        }
        
        // ネットワーク名を抽出（オプション）
        const nameRegex = new RegExp(`${chainIdStr}:\\s*{[^}]*name:\\s*["']([^"']+)["']`, 's');
        const nameMatch = text.match(nameRegex);
        const name = nameMatch ? nameMatch[1] : networkKey.charAt(0).toUpperCase() + networkKey.slice(1);
        
        if (rpcUrls.length > 0) {
          networksMap[networkKey] = {
            name,
            chainId,
            rpcs: rpcUrls,
            blockExplorer: explorers[networkKey] || ""
          };
        }
      }
    });
    
    return {
      networks: networksMap,
      networkList
    };
  } catch (error) {
    console.error('Error fetching RPC data:', error);
    
    // フォールバックデータ
    const fallbackNetworks = {
      'ethereum': {
        name: 'Ethereum',
        chainId: 1,
        rpcs: ['https://eth.llamarpc.com'],
        blockExplorer: 'https://etherscan.io/tx/'
      },
      'arbitrum': {
        name: 'Arbitrum',
        chainId: 42161,
        rpcs: ['https://arb.llamarpc.com'],
        blockExplorer: 'https://arbiscan.io/tx/'
      },
      'optimism': {
        name: 'Optimism',
        chainId: 10,
        rpcs: ['https://optimism.llamarpc.com'],
        blockExplorer: 'https://optimistic.etherscan.io/tx/'
      },
      'polygon': {
        name: 'Polygon',
        chainId: 137,
        rpcs: ['https://polygon.llamarpc.com'],
        blockExplorer: 'https://polygonscan.com/tx/'
      },
      'base': {
        name: 'Base',
        chainId: 8453,
        rpcs: ['https://base.llamarpc.com'],
        blockExplorer: 'https://basescan.org/tx/'
      }
    };
    
    return {
      networks: fallbackNetworks,
      networkList: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base']
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
        
        if (!response.ok) throw new Error('RPC request failed');
        
        return rpc;
      } catch (error) {
        console.warn(`RPC ${rpc} failed:`, error);
        throw new Error(`RPC ${rpc} failed`);
      }
    })
  );
  
  // 成功したRPCを見つける
  for (const result of testResults) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
  }
  
  // すべてのRPCが失敗した場合はフォールバックを返す
  console.warn('All RPCs failed, using fallback');
  return rpcs[0]; // 最初のRPCをフォールバックとして使用
}