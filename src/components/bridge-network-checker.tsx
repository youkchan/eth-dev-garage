"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Settings, X, ExternalLink, Network, Info } from "lucide-react"
import bridgeNetworkData from "../data/bridgeNetworkData.json"

// ブリッジデータの型定義
interface BridgeNetwork {
  id: number
  displayName: string
  bridgeDbName: string
  iconLink: string
  largeTxThreshold: number
  url: string
  chains: string[]
  destinationChain?: string
  chainMapping?: Record<string, string | undefined>
}

// 優先ネットワークの設定
const PRIORITY_NETWORKS = ["Ethereum", "Arbitrum", "Optimism", "Polygon", "Base", "ZKsync Era", "Scroll", "Linea", "Blast", "Manta", "Bitcoin", "Solana"]

// 除外するブリッジのリスト
const EXCLUDED_BRIDGES = ["Avalanche Bridge", "Core Bitcoin Bridge", "IBC", "LayerZero"]

// 手動で追加するブリッジ
const ADDITIONAL_BRIDGES: BridgeNetwork[] = [
  {
    id: 0,
    displayName: "PheasantNetwork",
    bridgeDbName: "pheasantNetwork",
    iconLink: "icons:pheasantNetwork",
    largeTxThreshold: 10000,
    url: "https://pheasant.network/",
    chains: [
      "Ethereum",
      "Arbitrum",
      "Optimism",
      "Linea",
      "Morph",
      "Scroll",
      "zkSync Era",
      "Base",
      "Taiko"
    ]
  }
]

export default function BridgeNetworkChecker() {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [networkFilter, setNetworkFilter] = useState("")
  const [allNetworks, setAllNetworks] = useState<string[]>([])
  const [filteredBridges, setFilteredBridges] = useState<BridgeNetwork[]>([])
  const modalRef = useRef<HTMLDivElement>(null)

  // すべてのネットワークを抽出
  useEffect(() => {
    const networks = new Set<string>()
    
    // 型アサーションを使用して、bridgeNetworkDataをBridgeNetwork[]として扱う
    const typedBridgeData = bridgeNetworkData as unknown as BridgeNetwork[]
    
    // 除外ブリッジをフィルタリングしたデータ
    const filteredData = typedBridgeData.filter(bridge => 
      !EXCLUDED_BRIDGES.includes(bridge.displayName)
    )
    
    // 手動で追加したブリッジを結合
    const combinedData = [...filteredData, ...ADDITIONAL_BRIDGES]
    
    combinedData.forEach((bridge) => {
      bridge.chains.forEach(chain => {
        networks.add(chain)
      })
    })
    
    // 優先ネットワークを先頭に配置し、残りをアルファベット順に並べる
    const sortedNetworks = [
      ...PRIORITY_NETWORKS.filter(network => networks.has(network)),
      ...Array.from(networks)
        .filter(network => !PRIORITY_NETWORKS.includes(network))
        .sort()
    ]
    
    setAllNetworks(sortedNetworks)
    setFilteredBridges(combinedData)
  }, [])

  // ネットワークが選択された時にブリッジをフィルタリング
  useEffect(() => {
    // 型アサーションを使用して、bridgeNetworkDataをBridgeNetwork[]として扱う
    const typedBridgeData = bridgeNetworkData as unknown as BridgeNetwork[]
    
    // 除外ブリッジをフィルタリングしたデータ
    const filteredData = typedBridgeData.filter(bridge => 
      !EXCLUDED_BRIDGES.includes(bridge.displayName)
    )
    
    // 手動で追加したブリッジを結合
    const combinedData = [...filteredData, ...ADDITIONAL_BRIDGES]
    
    if (selectedNetworks.length > 0) {
      const bridges = combinedData.filter((bridge) => 
        // 選択されたすべてのネットワークをサポートしているブリッジをフィルタリング
        selectedNetworks.every(network => bridge.chains.includes(network))
      )
      setFilteredBridges(bridges)
    } else {
      setFilteredBridges(combinedData)
    }
  }, [selectedNetworks])

  // モーダル外のクリックを検知
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false)
        setNetworkFilter("")
      }
    }

    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false)
        setNetworkFilter("")
      }
    }

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscKey)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isModalOpen])

  // ネットワークフィルタリング関数
  const getFilteredNetworksForModal = () => {
    if (!networkFilter) return allNetworks
    
    const lowerFilter = networkFilter.toLowerCase()
    return allNetworks.filter(network => 
      network.toLowerCase().includes(lowerFilter)
    )
  }

  // ネットワーク選択の処理
  const handleNetworkSelection = (networkKey: string) => {
    setSelectedNetworks(prev => {
      // すでに選択されている場合は削除
      if (prev.includes(networkKey)) {
        return prev.filter(n => n !== networkKey)
      }
      
      // 選択されていない場合は追加（最大2つまで）
      if (prev.length < 2) {
        return [...prev, networkKey]
      }
      
      // すでに2つ選択されている場合は、最初の選択を削除して新しい選択を追加
      return [prev[1], networkKey]
    })
  }

  // 選択されたネットワークを削除
  const removeNetwork = (networkToRemove: string) => {
    setSelectedNetworks(prev => prev.filter(network => network !== networkToRemove))
  }

  // 選択されたネットワークをすべて削除
  const clearNetworks = () => {
    setSelectedNetworks([])
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-600">Bridge Network Checker</h2>
        <p className="text-gray-400">Check which bridges support specific networks</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Networks (Select up to 2)
          </label>
          <div className="border border-blue-200 rounded-md p-2 bg-white">
            <div className="flex items-center mb-2">
              <button
                onClick={() => {
                  setIsModalOpen(true)
                  setNetworkFilter("")
                }}
                className="flex items-center text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded mr-3"
              >
                <Settings className="h-3 w-3 mr-1" />
                {selectedNetworks.length > 0 ? "Change Networks" : "Select Networks"}
              </button>
              
              {selectedNetworks.length > 0 && (
                <button 
                  onClick={clearNetworks}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {selectedNetworks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedNetworks.map(network => (
                  <div 
                    key={network}
                    className="flex items-center bg-blue-50 border border-blue-200 rounded px-2 py-1"
                  >
                    <span className="text-sm text-blue-800">{network}</span>
                    <button 
                      onClick={() => removeNetwork(network)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">No networks selected (showing all bridges)</span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">
            {selectedNetworks.length > 0 
              ? `Bridges supporting ${selectedNetworks.join(" & ")} (${filteredBridges.length})`
              : `All Bridges (${filteredBridges.length})`
            }
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bridge Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supported Networks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBridges.map((bridge) => (
                  <tr key={bridge.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bridge.displayName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bridge.url ? (
                        <a 
                          href={bridge.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                        >
                          {bridge.url.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No URL available</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {bridge.chains.map((chain) => (
                          <span 
                            key={chain} 
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              selectedNetworks.includes(chain) 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {chain}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Network selection modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-medium text-gray-700 flex items-center">
                <Network className="h-5 w-5 mr-2 text-blue-500" />
                Network Selection
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setNetworkFilter("")
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-b bg-blue-50">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    You can select up to <strong>2 networks</strong> to filter bridges that support both networks.
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    Currently selected: {selectedNetworks.length === 0 ? "None" : selectedNetworks.join(", ")}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-grow">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filter networks..."
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                />
              </div>
              
              {getFilteredNetworksForModal().length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No networks match your filter
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {getFilteredNetworksForModal().map((networkKey) => (
                    <div
                      key={networkKey}
                      className={`p-2 border rounded-md flex items-center cursor-pointer ${
                        selectedNetworks.includes(networkKey)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => handleNetworkSelection(networkKey)}
                    >
                      <div className="mr-2">
                        {selectedNetworks.includes(networkKey) ? (
                          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-gray-300"></div>
                        )}
                      </div>
                      <span className="text-sm truncate">
                        {networkKey}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t p-4 flex justify-between">
              <button
                onClick={clearNetworks}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setNetworkFilter("")
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 