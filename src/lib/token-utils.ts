import { ethers } from "ethers"
import chainsData from "../data/chains.json"

// Create a map of chainId to native currency symbol for quick lookup
const nativeCurrencyMap = new Map<number, string>(
  chainsData.map((chain: any) => [chain.chainId, chain.nativeCurrency?.symbol || ""])
);

// Check if a native currency symbol is ETH or ETH-compatible
export const isEthCompatibleSymbol = (symbol: string): boolean => {
  return ["ETH", "WETH", "PETH", "RETH", "SETH", "XETH"].includes(symbol);
};

// ERC20トークンのABI（最小限の必要なメソッドのみ）
export const ERC20_ABI = [
  // balanceOf関数
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  // decimals関数
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  },
  // symbol関数
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  }
]

// サポートされているトークンの定義
export interface TokenInfo {
  symbol: string
  name: string
  decimals: number
  addresses: Record<string, string> // ネットワークキー => コントラクトアドレス
}

// サポートされているトークンのリスト
export const SUPPORTED_TOKENS: Record<string, TokenInfo> = {
  "ETH": {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    addresses: {} // ネイティブトークンなのでアドレスは不要
  },
  "WETH": {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
    addresses: {
      "ethereum": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "arbitrum": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      "optimism": "0x4200000000000000000000000000000000000006",
      "polygon": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      "base": "0x4200000000000000000000000000000000000006",
      "scroll": "0x5300000000000000000000000000000000000004",
      "taiko": "0xA51894664A773981C6C112C43ce576f315d5b1B6",
      "linea": "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
      "zksync": "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
      "blast": "0x4300000000000000000000000000000000000004",
      "worldchain": "0x4200000000000000000000000000000000000006",
      "mode": "0x4200000000000000000000000000000000000006",
      "morph": "0x5300000000000000000000000000000000000011",
      "zircuit": "", // 実際のアドレスが確認できたら更新
      "soneium": "0x4200000000000000000000000000000000000006"  // 実際のアドレスが確認できたら更新
    }
  },
  "USDC": {
    symbol: "USDC",
    name: "USD Coin (CCTP)",
    decimals: 6,
    addresses: {
      "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "arbitrum": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "optimism": "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      "polygon": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "zksync": "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4",
      "zircuit": "", // 実際のアドレスが確認できたら更新
      "soneium": ""  // 実際のアドレスが確認できたら更新
    }
  },
  "USDCe": {
    symbol: "USDCe",
    name: "USD Coin (Bridged)",
    decimals: 6,
    addresses: {
      "arbitrum": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      "optimism": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      "polygon": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      "linea": "0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85",
      // CCTPではないUSDC（ブリッジ版またはネイティブ版）
      "scroll": "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
      "taiko": "0x19e26B0638bf63aa9fa4d14c6baF8D52eBE86C5C",
      "blast": "",
      "worldchain": "",
      "mode": "",
      "morph": "",
      "zircuit": "", // 実際のアドレスが確認できたら更新
      "soneium": ""  // 実際のアドレスが確認できたら更新
    }
  }
}

// トークンのバランスを取得する関数
export async function getTokenBalance(
  provider: ethers.JsonRpcProvider,
  tokenSymbol: string,
  address: string,
  networkKey: string
): Promise<{ balance: string; decimals: number }> {
  // For ETH, check if the network's native currency is ETH or ETH-compatible
  if (tokenSymbol === "ETH") {
    // Get the network's chainId
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Get the native currency symbol for this chainId
    const nativeCurrencySymbol = nativeCurrencyMap.get(chainId);
    
    // Only get ETH balance if the native currency is ETH or ETH-compatible
    if (nativeCurrencySymbol && isEthCompatibleSymbol(nativeCurrencySymbol)) {
      const balance = await provider.getBalance(address);
      return { balance: balance.toString(), decimals: 18 };
    } else {
      throw new Error(`Network ${networkKey} does not use ETH as native currency`);
    }
  }
  
  // その他のトークンの場合はコントラクトを使用
  const tokenInfo = SUPPORTED_TOKENS[tokenSymbol]
  if (!tokenInfo) {
    throw new Error(`Unsupported token: ${tokenSymbol}`)
  }
  
  const tokenAddress = tokenInfo.addresses[networkKey]
  if (!tokenAddress) {
    throw new Error(`Token ${tokenSymbol} is not available on ${networkKey}`)
  }
  
  // アドレスが空文字列の場合はトークンが利用できないと判断
  if (tokenAddress === "") {
    throw new Error(`Token ${tokenSymbol} is not available on ${networkKey}`)
  }
  
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const balance = await tokenContract.balanceOf(address)
  
  return { balance: balance.toString(), decimals: tokenInfo.decimals }
}

// バランスを人間が読める形式に変換する関数
export function formatTokenBalance(balance: string, decimals: number): string {
  return ethers.formatUnits(balance, decimals)
}

// Function to get combined ETH and WETH balance
export async function getCombinedEthBalance(
  provider: ethers.JsonRpcProvider,
  address: string,
  networkKey: string
): Promise<{ ethBalance: string; wethBalance: string; totalBalance: string; decimals: number }> {
  let ethBalance = "0";
  let wethBalance = "0";
  
  // Get the network's chainId
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Get the native currency symbol for this chainId
  const nativeCurrencySymbol = nativeCurrencyMap.get(chainId);
  
  // Only get ETH balance if the native currency is ETH or ETH-compatible
  if (nativeCurrencySymbol && isEthCompatibleSymbol(nativeCurrencySymbol)) {
    try {
      // Try to get ETH balance
      const balance = await provider.getBalance(address);
      ethBalance = balance.toString();
    } catch (error) {
      console.error("Error fetching ETH balance:", error);
    }
  }
  
  try {
    // Try to get WETH balance
    const wethResult = await getTokenBalance(provider, "WETH", address, networkKey);
    wethBalance = wethResult.balance;
  } catch (error) {
    console.error("Error fetching WETH balance:", error);
  }
  
  // Calculate total (ETH + WETH)
  const totalBalance = ethers.toBigInt(ethBalance) + ethers.toBigInt(wethBalance);
  
  return {
    ethBalance,
    wethBalance,
    totalBalance: totalBalance.toString(),
    decimals: 18
  };
}

// Format combined ETH and WETH balances
export function formatCombinedBalance(
  ethBalance: string,
  wethBalance: string,
  totalBalance: string,
  decimals: number
): { eth: string; weth: string; total: string } {
  return {
    eth: ethers.formatUnits(ethBalance, decimals),
    weth: ethers.formatUnits(wethBalance, decimals),
    total: ethers.formatUnits(totalBalance, decimals)
  };
}

// Function to get combined USDC and USDCe balance
export async function getCombinedUsdcBalance(
  provider: ethers.JsonRpcProvider,
  address: string,
  networkKey: string
): Promise<{ usdcBalance: string; usdceBalance: string; totalBalance: string; decimals: number }> {
  let usdcBalance = "0";
  let usdceBalance = "0";
  
  try {
    // Try to get USDC balance
    const usdcResult = await getTokenBalance(provider, "USDC", address, networkKey);
    usdcBalance = usdcResult.balance;
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
  }
  
  try {
    // Try to get USDCe balance
    const usdceResult = await getTokenBalance(provider, "USDCe", address, networkKey);
    usdceBalance = usdceResult.balance;
  } catch (error) {
    console.error("Error fetching USDCe balance:", error);
  }
  
  // Calculate total (USDC + USDCe)
  const totalBalance = ethers.toBigInt(usdcBalance) + ethers.toBigInt(usdceBalance);
  
  return {
    usdcBalance,
    usdceBalance,
    totalBalance: totalBalance.toString(),
    decimals: 6 // Both USDC and USDCe use 6 decimals
  };
}

// Format combined USDC and USDCe balances
export function formatCombinedUsdcBalance(
  usdcBalance: string,
  usdceBalance: string,
  totalBalance: string,
  decimals: number
): { usdc: string; usdce: string; total: string } {
  return {
    usdc: ethers.formatUnits(usdcBalance, decimals),
    usdce: ethers.formatUnits(usdceBalance, decimals),
    total: ethers.formatUnits(totalBalance, decimals)
  };
} 