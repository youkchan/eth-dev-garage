"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Loader2, Network } from "lucide-react"
import { useRpcData, findWorkingRpc } from "../lib/rpc-utils"

export default function TransactionViewer() {
  const [network, setNetwork] = useState("ethereum")
  const [txHash, setTxHash] = useState("")
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // RPCデータを取得
  const { networksData, networkList, loading: loadingNetworks, error: networkError } = useRpcData();

  const fetchTransaction = async () => {
    if (!txHash || loading || !networksData) return
    
    setLoading(true)
    setError(null)
    setTransaction(null)
    
    try {
      const networkInfo = networksData[network];
      if (!networkInfo) {
        throw new Error(`Network ${network} not found`);
      }
      
      // 利用可能なRPCから動作するものを見つける
      const workingRpc = await findWorkingRpc(networkInfo.rpcs);
      
      // プロバイダーを作成してトランザクションを取得
      const provider = new ethers.JsonRpcProvider(workingRpc);
      const tx = await provider.getTransaction(txHash);
      
      if (!tx) {
        throw new Error("Transaction not found");
      }
      
      setTransaction(tx);
    } catch (err: any) {
      console.error("Error fetching transaction:", err);
      setError(err.message || "Failed to fetch transaction");
    } finally {
      setLoading(false);
    }
  };

  // ネットワークデータの読み込み中の表示
  if (loadingNetworks) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading network data...</span>
        </div>
      </div>
    );
  }

  // ネットワークデータの読み込みエラー
  if (networkError) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Error loading network data: {networkError.message}</p>
          <p className="mt-2">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // ネットワークリストをアルファベット順にソート
  const sortedNetworks = [...(networkList || [])].sort((a, b) => a.localeCompare(b));

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-600">Transaction Viewer</h2>
        <p className="text-gray-400">View transaction details from various networks</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="network" className="block text-sm font-medium text-gray-600 mb-1">
            Select Network
          </label>
          <select
            id="network"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
          >
            {networksData && sortedNetworks.map(networkKey => {
              const info = networksData[networkKey];
              if (!info) return null;
              return (
                <option key={networkKey} value={networkKey}>
                  {info.name}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label htmlFor="txHash" className="block text-sm font-medium text-gray-600 mb-1">
            Transaction Hash
          </label>
          <input
            id="txHash"
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter transaction hash (0x...)"
            className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
          />
        </div>

        <button
          onClick={fetchTransaction}
          disabled={loading || !txHash}
          className={`w-full p-2 rounded-md flex items-center justify-center ${
            loading || !txHash
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Network className="w-4 h-4 mr-2" />
              View Transaction
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {transaction && (
          <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50 overflow-auto">
            <h3 className="font-medium mb-2 text-gray-600">Transaction Data (Raw JSON)</h3>
            <pre className="text-xs whitespace-pre-wrap break-all bg-white p-2 rounded border border-blue-100 text-black">
              {JSON.stringify(transaction, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}