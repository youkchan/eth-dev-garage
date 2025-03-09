"use client"

import { useState, useEffect, useRef } from "react"
import { ethers } from "ethers"
import { Loader2, Network, ChevronDown, Layers, FileSearch, X, Settings, Plus, Search } from "lucide-react"
import { useRpcData, findWorkingRpc } from "../lib/rpc-utils"

// Search type options
type SearchType = "transaction" | "block";

// Priority order for networks in the dropdown
const PRIORITY_NETWORKS = ["ethereum", "arbitrum", "optimism", "polygon", "base", "taiko", "scroll", "zksync era", "morph", "sepolia", "holesky"];

export default function OnchainViewer() {
  const [network, setNetwork] = useState("ethereum")
  const [searchType, setSearchType] = useState<SearchType>("transaction")
  const [searchValue, setSearchValue] = useState("")
  const [transaction, setTransaction] = useState<any>(null)
  const [block, setBlock] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [excludedNetworks, setExcludedNetworks] = useState<Set<string>>(new Set())
  const [filteredNetworkList, setFilteredNetworkList] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [networkFilter, setNetworkFilter] = useState("")
  const modalRef = useRef<HTMLDivElement>(null)
  const { networksData, networkList, loading: networksLoading } = useRpcData()

  // Load excluded networks
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

  // Filter network list and sort by priority
  useEffect(() => {
    if (networkList && networkList.length > 0) {
      // Filter out excluded networks
      const filtered = networkList.filter(network => !excludedNetworks.has(network));
      
      // Sort networks by priority
      const sortedNetworks = [...filtered].sort((a, b) => {
        const indexA = PRIORITY_NETWORKS.indexOf(a);
        const indexB = PRIORITY_NETWORKS.indexOf(b);
        
        // If both networks are in the priority list, sort by priority
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        
        // If only one network is in the priority list, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // Otherwise, sort alphabetically
        return a.localeCompare(b);
      });
      
      setFilteredNetworkList(sortedNetworks);
      
      // Set default network if current one is excluded
      if (excludedNetworks.has(network) && sortedNetworks.length > 0) {
        setNetwork(sortedNetworks[0]);
      } else if (!network && sortedNetworks.length > 0) {
        setNetwork(sortedNetworks[0]);
      }
    }
  }, [networkList, excludedNetworks, network]);

  // Handle clicks outside modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false)
        setNetworkFilter("")
      }
    }

    // Handle escape key press
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        setNetworkFilter("")
      }
    }

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscKey)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isModalOpen])

  // Reset state when changing search type
  useEffect(() => {
    setSearchValue("")
    setTransaction(null)
    setBlock(null)
    setError(null)
  }, [searchType])

  // Fetch transaction or block data
  const fetchData = async () => {
    if (!searchValue || loading || !networksData) return
    
    setLoading(true)
    setError(null)
    setTransaction(null)
    setBlock(null)
    
    try {
      const networkInfo = networksData[network];
      if (!networkInfo) {
        throw new Error(`Network ${network} not found`);
      }
      
      // Find a working RPC from available options
      const workingRpc = await findWorkingRpc(networkInfo.rpcs);
      
      // Create provider
      const provider = new ethers.JsonRpcProvider(workingRpc);
      
      if (searchType === "transaction") {
        // Fetch transaction data
        const tx = await provider.getTransaction(searchValue);
        
        if (!tx) {
          throw new Error("Transaction not found");
        }
        
        setTransaction(tx);
      } else {
        // Fetch block data
        let blockData;
        
        // Check if search value is a block hash or block number
        if (searchValue.startsWith("0x")) {
          // Block hash
          blockData = await provider.send("eth_getBlockByHash", [searchValue, false]);
        } else {
          // Block number
          const blockNumber = parseInt(searchValue, 10);
          if (isNaN(blockNumber)) {
            throw new Error("Invalid block number");
          }
          // Convert block number to hexadecimal format for eth_getBlockByNumber
          const blockNumberHex = "0x" + blockNumber.toString(16);
          blockData = await provider.send("eth_getBlockByNumber", [blockNumberHex, false]);
        }
        
        if (!blockData) {
          throw new Error("Block not found");
        }
        
        setBlock(blockData);
      }
    } catch (err: any) {
      console.error(`Error fetching ${searchType}:`, err);
      setError(err.message || `Failed to fetch ${searchType}`);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered networks for modal display
  const getFilteredNetworksForModal = () => {
    if (!networkFilter) return filteredNetworkList;
    
    return filteredNetworkList.filter(networkKey => {
      const networkName = networksData?.[networkKey]?.name || networkKey;
      return networkName.toLowerCase().includes(networkFilter.toLowerCase());
    });
  };

  // Loading state
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

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-600">Onchain Viewer</h2>
        <p className="text-gray-400">View transaction and block details from various networks</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Network
          </label>
          <div className="border border-blue-200 rounded-md p-2 bg-white flex items-center">
            <button
              onClick={() => {
                setIsModalOpen(true);
                setNetworkFilter("");
              }}
              className="flex items-center text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded mr-3"
            >
              <Settings className="h-3 w-3 mr-1" />
              Change Network
            </button>
            <span className="text-black">{networksData?.[network]?.name || network}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            className={`flex-1 p-2 rounded-md flex items-center justify-center ${
              searchType === "transaction"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setSearchType("transaction")}
          >
            <FileSearch className="w-4 h-4 mr-2" />
            Transaction
          </button>
          <button
            className={`flex-1 p-2 rounded-md flex items-center justify-center ${
              searchType === "block"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setSearchType("block")}
          >
            <Layers className="w-4 h-4 mr-2" />
            Block
          </button>
        </div>

        <div>
          <label htmlFor="searchValue" className="block text-sm font-medium text-gray-600 mb-1">
            {searchType === "transaction" ? "Transaction Hash" : "Block Hash or Number"}
          </label>
          <input
            id="searchValue"
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={searchType === "transaction" 
              ? "Enter transaction hash (0x...)" 
              : "Enter block hash (0x...) or block number"}
            className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
          />
        </div>

        <button
          onClick={fetchData}
          disabled={loading || !searchValue}
          className={`w-full p-2 rounded-md flex items-center justify-center ${
            loading || !searchValue
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
              {searchType === "transaction" ? "View Transaction" : "View Block"}
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
            <h3 className="font-medium mb-2 text-gray-600">Transaction Data</h3>
            <pre className="text-xs whitespace-pre-wrap break-all bg-white p-2 rounded border border-blue-100 text-black">
              {JSON.stringify(transaction, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)}
            </pre>
          </div>
        )}

        {block && (
          <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50 overflow-auto">
            <h3 className="font-medium mb-2 text-gray-600">Block Data</h3>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="text-xs font-medium text-gray-500">Block Number</span>
                <div className="text-sm">
                  {block.number ? (
                    <>
                      {parseInt(block.number, 16)} <span className="text-gray-400">(Decimal)</span>
                      <br />
                      {block.number} <span className="text-gray-400">(Hex)</span>
                    </>
                  ) : 'N/A'}
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="text-xs font-medium text-gray-500">Timestamp</span>
                <div className="text-sm">{block.timestamp ? new Date(Number(block.timestamp) * 1000).toLocaleString() : 'N/A'}</div>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="text-xs font-medium text-gray-500">Transactions</span>
                <div className="text-sm">{block.transactions?.length || 0}</div>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <span className="text-xs font-medium text-gray-500">Gas Used</span>
                <div className="text-sm">{block.gasUsed?.toString() || 'N/A'}</div>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-all bg-white p-2 rounded border border-blue-100 text-black">
              {JSON.stringify(block, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)}
            </pre>
          </div>
        )}
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
                <Settings className="h-5 w-5 mr-2 text-blue-500" />
                Network Selection
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNetworkFilter("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-grow">
              {networksLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading networks...</span>
                </div>
              ) : (
                <>
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
                    <div className="grid grid-cols-5 gap-2">
                      {getFilteredNetworksForModal().map((networkKey) => (
                        <div
                          key={networkKey}
                          className={`p-1 border rounded-md flex flex-col items-center text-center ${
                            network === networkKey
                              ? "border-blue-500 bg-blue-50 cursor-pointer"
                              : "border-gray-200 hover:border-blue-300 cursor-pointer"
                          }`}
                          onClick={() => {
                            setNetwork(networkKey);
                            setIsModalOpen(false);
                            setNetworkFilter("");
                          }}
                        >
                          <div className="mb-1">
                            {network === networkKey ? (
                              <div className="h-3 w-3 rounded-full bg-blue-500 mx-auto"></div>
                            ) : (
                              <div className="h-3 w-3 rounded-full border border-gray-300 mx-auto"></div>
                            )}
                          </div>
                          <span className="text-xs truncate w-full px-1">
                            {networksData?.[networkKey]?.name || networkKey}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNetworkFilter("");
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