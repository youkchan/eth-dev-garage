"use client"

import { useState, useEffect, useRef } from "react"
import { ethers } from "ethers"
import { Loader2, Network, ChevronDown } from "lucide-react"
import { useRpcData, findWorkingRpc } from "../lib/rpc-utils"

export default function TransactionViewer() {
  const [network, setNetwork] = useState("ethereum")
  const [txHash, setTxHash] = useState("")
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [excludedNetworks, setExcludedNetworks] = useState<Set<string>>(new Set())
  const [filteredNetworkList, setFilteredNetworkList] = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { networksData, networkList, loading: networksLoading } = useRpcData()

  // 除外ネットワークの設定を読み込む
  useEffect(() => {
    async function loadExcludedNetworks() {
      try {
        const response = await fetch('/network-exclusions.json')
        const data = await response.json()
        setExcludedNetworks(new Set(data.excludedNetworks || []))
      } catch (error) {
        console.error('Error loading excluded networks:', error)
        setExcludedNetworks(new Set())
      }
    }
    
    loadExcludedNetworks()
  }, [])

  // ネットワークリストをフィルタリング
  useEffect(() => {
    if (networkList && networkList.length > 0) {
      const filtered = networkList.filter(network => !excludedNetworks.has(network))
      setFilteredNetworkList(filtered)
      
      // デフォルトネットワークを設定（現在のネットワークが除外された場合）
      if (excludedNetworks.has(network) && filtered.length > 0) {
        setNetwork(filtered[0])
      } else if (!network && filtered.length > 0) {
        setNetwork(filtered[0])
      }
    }
  }, [networkList, excludedNetworks, network])

  // ドロップダウン外のクリックを検出
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
  if (networksLoading) {
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
  if (error && !transaction) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Error: {error}</p>
          <p className="mt-2">Please try again or select a different network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-600">Transaction Viewer</h2>
        <p className="text-gray-400">View transaction details from various networks</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="network" className="block text-sm font-medium text-gray-600 mb-1">
            Network
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black bg-white flex items-center justify-between"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={networksLoading}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <span>{networksData?.[network]?.name || network}</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-blue-200 rounded-md shadow-lg max-h-60 overflow-auto">
                <ul className="py-1" role="listbox">
                  {filteredNetworkList.map((networkKey) => (
                    <li
                      key={networkKey}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                        network === networkKey ? 'bg-blue-100 font-medium' : ''
                      }`}
                      onClick={() => {
                        setNetwork(networkKey);
                        setIsDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={network === networkKey}
                    >
                      {networksData?.[networkKey]?.name || networkKey}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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