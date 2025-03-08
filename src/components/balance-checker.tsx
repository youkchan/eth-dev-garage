"use client"

import { useState, useEffect, useRef } from "react"
import { ethers } from "ethers"
import { Loader2, Check, X, Plus, Settings } from "lucide-react"
import { useRpcData, findWorkingRpc } from "../lib/rpc-utils"
import { 
  SUPPORTED_TOKENS, 
  getTokenBalance, 
  formatTokenBalance, 
  getCombinedEthBalance,
  formatCombinedBalance,
  getCombinedUsdcBalance,
  formatCombinedUsdcBalance,
  isEthCompatibleSymbol
} from "../lib/token-utils"
import chainsData from "../data/chains.json"

// Create a map of chainId to native currency symbol for quick lookup
const nativeCurrencyMap = new Map<number, string>(
  chainsData.map((chain: any) => [chain.chainId, chain.nativeCurrency?.symbol || ""])
);

export default function BalanceChecker() {
  const [address, setAddress] = useState("")
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  const [selectedTokens, setSelectedTokens] = useState<string[]>(["ETH"])
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [ethBalances, setEthBalances] = useState<Record<string, { eth: string; weth: string; total: string }>>({})
  const [usdcBalances, setUsdcBalances] = useState<Record<string, { usdc: string; usdce: string; total: string }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const { networksData, networkList, loading: networksLoading } = useRpcData()

  // Load network selection from localStorage
  useEffect(() => {
    const savedNetworks = localStorage.getItem("selectedNetworks")
    if (savedNetworks) {
      try {
        const parsed = JSON.parse(savedNetworks)
        if (Array.isArray(parsed)) {
          setSelectedNetworks(parsed)
        }
      } catch (e) {
        console.error("Failed to parse saved networks:", e)
      }
    }

    // Load selected tokens
    const savedTokens = localStorage.getItem("selectedTokens")
    if (savedTokens) {
      try {
        const parsed = JSON.parse(savedTokens)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate that all tokens exist in SUPPORTED_TOKENS
          const validTokens = parsed.filter(token => SUPPORTED_TOKENS[token])
          if (validTokens.length > 0) {
            setSelectedTokens(validTokens)
          }
        }
      } catch (e) {
        console.error("Failed to parse saved tokens:", e)
      }
    }
  }, [])

  // Save selected networks to localStorage
  useEffect(() => {
    if (selectedNetworks.length > 0) {
      localStorage.setItem("selectedNetworks", JSON.stringify(selectedNetworks))
    }
  }, [selectedNetworks])

  // Save selected tokens to localStorage
  useEffect(() => {
    localStorage.setItem("selectedTokens", JSON.stringify(selectedTokens))
  }, [selectedTokens])

  // Handle clicks outside the modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false)
      }
    }

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isModalOpen])

  // Handle Escape key to close modal
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false)
      }
    }

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscKey)
    } else {
      document.removeEventListener("keydown", handleEscKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isModalOpen])

  // Toggle network selection
  const toggleNetwork = (networkKey: string) => {
    setSelectedNetworks(prev => {
      if (prev.includes(networkKey)) {
        return prev.filter(key => key !== networkKey)
      } else {
        return [...prev, networkKey]
      }
    })
  }

  // Clear all selected networks
  const clearAllNetworks = () => {
    setSelectedNetworks([])
  }

  // Toggle token selection
  const toggleToken = (tokenSymbol: string) => {
    setSelectedTokens(prev => {
      // Special handling for ETH and WETH
      if (tokenSymbol === "ETH" || tokenSymbol === "WETH") {
        // If both ETH and WETH are selected and we're toggling one of them off
        if (prev.includes("ETH") && prev.includes("WETH") && prev.includes(tokenSymbol)) {
          // Remove the toggled token
          return prev.filter(t => t !== tokenSymbol)
        }
        // If we're adding ETH or WETH
        if (!prev.includes(tokenSymbol)) {
          // If we're adding ETH or WETH, remove all other tokens except the other one in the pair
          const otherToken = tokenSymbol === "ETH" ? "WETH" : "ETH"
          const newTokens = prev.includes(otherToken) ? [otherToken, tokenSymbol] : [tokenSymbol]
          return newTokens
        }
      } 
      // Special handling for USDC and USDCe
      else if (tokenSymbol === "USDC" || tokenSymbol === "USDCe") {
        // If both USDC and USDCe are selected and we're toggling one of them off
        if (prev.includes("USDC") && prev.includes("USDCe") && prev.includes(tokenSymbol)) {
          // Remove the toggled token
          return prev.filter(t => t !== tokenSymbol)
        }
        // If we're adding USDC or USDCe
        if (!prev.includes(tokenSymbol)) {
          // If we're adding USDC or USDCe, remove all other tokens except the other one in the pair
          const otherToken = tokenSymbol === "USDC" ? "USDCe" : "USDC"
          const newTokens = prev.includes(otherToken) ? [otherToken, tokenSymbol] : [tokenSymbol]
          return newTokens
        }
      }
      else {
        // For other tokens, only allow one selection
        return [tokenSymbol]
      }
      
      // Default case: just return the current selection
      return prev
    })
    
    // Reset balances when changing tokens
    setBalances({})
    setEthBalances({})
    setUsdcBalances({})
  }

  // Check if selected token is available on the network
  const isTokenAvailableOnNetwork = (tokenSymbol: string, networkKey: string): boolean => {
    // For ETH, check if the network's native currency is ETH or ETH-compatible
    if (tokenSymbol === "ETH") {
      // Get the chainId for this network
      const networkInfo = networksData?.[networkKey];
      if (!networkInfo) return false;
      
      // Get the native currency symbol for this chainId
      const nativeCurrencySymbol = nativeCurrencyMap.get(networkInfo.chainId);
      
      // Check if the native currency is ETH or ETH-compatible
      return nativeCurrencySymbol ? isEthCompatibleSymbol(nativeCurrencySymbol) : false;
    }
    
    // For other tokens, check if they have an address for this network
    const tokenInfo = SUPPORTED_TOKENS[tokenSymbol];
    return tokenInfo && !!tokenInfo.addresses[networkKey];
  }

  // Check if any selected token is available on the network
  const isAnySelectedTokenAvailableOnNetwork = (networkKey: string): boolean => {
    return selectedTokens.some(token => isTokenAvailableOnNetwork(token, networkKey));
  }

  // Fetch balances
  const fetchBalances = async () => {
    if (!address || selectedNetworks.length === 0 || loading || !networksData || selectedTokens.length === 0) {
      return
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      setError("Invalid Ethereum address")
      return
    }

    setLoading(true)
    setError(null)
    setBalances({})
    setEthBalances({})
    setUsdcBalances({})

    const newBalances: Record<string, string> = {}
    const newEthBalances: Record<string, { eth: string; weth: string; total: string }> = {}
    const newUsdcBalances: Record<string, { usdc: string; usdce: string; total: string }> = {}
    const errors: string[] = []

    // Check if both ETH and WETH are selected
    const showCombinedEthBalance = selectedTokens.includes("ETH") && selectedTokens.includes("WETH")
    
    // Check if both USDC and USDCe are selected
    const showCombinedUsdcBalance = selectedTokens.includes("USDC") && selectedTokens.includes("USDCe")

    // Fetch balances for all networks in parallel
    await Promise.all(
      selectedNetworks.map(async (networkKey) => {
        try {
          const networkInfo = networksData[networkKey]
          if (!networkInfo) {
            throw new Error(`Network ${networkKey} not found`)
          }

          // Find working RPC from available RPCs
          const workingRpc = await findWorkingRpc(networkInfo.rpcs)
          if (!workingRpc) {
            throw new Error(`No working RPC found for ${networkKey}`)
          }

          // Create provider
          const provider = new ethers.JsonRpcProvider(workingRpc)
          
          // If showing combined ETH+WETH balance
          if (showCombinedEthBalance) {
            try {
              // Timeout setup (10 seconds)
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Timeout")), 10000)
              })
              
              // Fetch combined ETH and WETH balances (with timeout)
              const balancePromise = getCombinedEthBalance(provider, address, networkKey)
              
              // Race condition
              const result = await Promise.race([balancePromise, timeoutPromise]) as { 
                ethBalance: string; 
                wethBalance: string; 
                totalBalance: string; 
                decimals: number 
              }
              
              // Format the balances
              const formattedBalances = formatCombinedBalance(
                result.ethBalance,
                result.wethBalance,
                result.totalBalance,
                result.decimals
              )
              
              newEthBalances[networkKey] = formattedBalances
            } catch (err: any) {
              console.error(`Error fetching combined ETH/WETH balance for ${networkKey}:`, err)
              newEthBalances[networkKey] = { eth: "Error", weth: "Error", total: "Error" }
              errors.push(`${networkKey}: ${err.message || "Unknown error"}`)
            }
          }
          // If showing combined USDC+USDCe balance
          else if (showCombinedUsdcBalance) {
            try {
              // Timeout setup (10 seconds)
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Timeout")), 10000)
              })
              
              // Fetch combined USDC and USDCe balances (with timeout)
              const balancePromise = getCombinedUsdcBalance(provider, address, networkKey)
              
              // Race condition
              const result = await Promise.race([balancePromise, timeoutPromise]) as { 
                usdcBalance: string; 
                usdceBalance: string; 
                totalBalance: string; 
                decimals: number 
              }
              
              // Format the balances
              const formattedBalances = formatCombinedUsdcBalance(
                result.usdcBalance,
                result.usdceBalance,
                result.totalBalance,
                result.decimals
              )
              
              newUsdcBalances[networkKey] = formattedBalances
            } catch (err: any) {
              console.error(`Error fetching combined USDC/USDCe balance for ${networkKey}:`, err)
              newUsdcBalances[networkKey] = { usdc: "Error", usdce: "Error", total: "Error" }
              errors.push(`${networkKey}: ${err.message || "Unknown error"}`)
            }
          } else {
            // Regular token balance check for a single token
            const singleToken = selectedTokens[0]
            
            // Check if selected token is available on this network
            if (!isTokenAvailableOnNetwork(singleToken, networkKey)) {
              newBalances[networkKey] = "Not Available"
              return
            }
            
            // Timeout setup (10 seconds)
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Timeout")), 10000)
            })
            
            // Fetch token balance (with timeout)
            const balancePromise = getTokenBalance(
              provider,
              singleToken,
              address,
              networkKey
            )
            
            // Race condition
            const { balance, decimals } = await Promise.race([balancePromise, timeoutPromise]) as { balance: string, decimals: number }
            
            // Convert and save in appropriate unit
            newBalances[networkKey] = formatTokenBalance(balance, decimals)
          }
        } catch (err: any) {
          console.error(`Error fetching balance for ${networkKey}:`, err)
          if (showCombinedEthBalance) {
            newEthBalances[networkKey] = { eth: "Error", weth: "Error", total: "Error" }
          } else if (showCombinedUsdcBalance) {
            newUsdcBalances[networkKey] = { usdc: "Error", usdce: "Error", total: "Error" }
          } else {
            newBalances[networkKey] = "Error"
          }
          errors.push(`${networkKey}: ${err.message || "Unknown error"}`)
        }
      })
    )

    setBalances(newBalances)
    setEthBalances(newEthBalances)
    setUsdcBalances(newUsdcBalances)
    setLoading(false)

    if (errors.length > 0) {
      setError(`Failed to fetch balances for some networks: ${errors.join(", ")}`)
    }
  }

  // Render selected networks
  const renderSelectedNetworks = () => {
    if (selectedNetworks.length === 0) {
      return (
        <div className="text-gray-500 italic text-sm p-2">
          No networks selected. Click "Add Network" to select a network.
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedNetworks.map(networkKey => (
          <div 
            key={networkKey}
            className="flex items-center bg-blue-50 border border-blue-200 rounded-md px-2 py-1"
          >
            <span className="text-sm text-blue-700 mr-1">
              {networksData?.[networkKey]?.name || networkKey}
            </span>
            <button
              onClick={() => toggleNetwork(networkKey)}
              className="text-blue-500 hover:text-blue-700"
              aria-label={`Remove ${networksData?.[networkKey]?.name || networkKey}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  // Token selection UI
  const renderTokenSelector = () => {
    // Check if both ETH and WETH are selected
    const showCombinedEthBalance = selectedTokens.includes("ETH") && selectedTokens.includes("WETH")
    
    // Check if both USDC and USDCe are selected
    const showCombinedUsdcBalance = selectedTokens.includes("USDC") && selectedTokens.includes("USDCe")
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Select Token
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUPPORTED_TOKENS).map(([tokenSymbol, tokenInfo]) => {
            const isSelected = selectedTokens.includes(tokenSymbol)
            const isEthOrWeth = tokenSymbol === "ETH" || tokenSymbol === "WETH"
            const isUsdcOrUsdce = tokenSymbol === "USDC" || tokenSymbol === "USDCe"
            
            const otherEthToken = tokenSymbol === "ETH" ? "WETH" : "ETH"
            const isOtherEthTokenSelected = selectedTokens.includes(otherEthToken)
            
            const otherUsdcToken = tokenSymbol === "USDC" ? "USDCe" : "USDC"
            const isOtherUsdcTokenSelected = selectedTokens.includes(otherUsdcToken)
            
            // Disable non-ETH/WETH tokens if both ETH and WETH are selected
            // Disable non-USDC/USDCe tokens if both USDC and USDCe are selected
            const isDisabled = (showCombinedEthBalance && !isEthOrWeth) || 
                              (showCombinedUsdcBalance && !isUsdcOrUsdce)
            
            // Special styling for ETH/WETH when both are selected
            // Special styling for USDC/USDCe when both are selected
            let buttonStyle = "bg-gray-100 text-gray-700 hover:bg-gray-200" // Default unselected style
            
            if (isSelected) {
              if ((isEthOrWeth && isOtherEthTokenSelected) || (isUsdcOrUsdce && isOtherUsdcTokenSelected)) {
                buttonStyle = "bg-green-600 text-white" // Special style for combined tokens
              } else {
                buttonStyle = "bg-blue-600 text-white" // Normal selected style
              }
            }
            
            return (
              <button
                key={tokenSymbol}
                onClick={() => toggleToken(tokenSymbol)}
                className={`px-3 py-1 rounded-md text-sm ${buttonStyle} ${
                  isDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title={tokenInfo.name}
                disabled={isDisabled}
              >
                {tokenSymbol}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Render balance results
  const renderBalanceResults = () => {
    // Check if both ETH and WETH are selected
    const showCombinedEthBalance = selectedTokens.includes("ETH") && selectedTokens.includes("WETH")
    
    // Check if both USDC and USDCe are selected
    const showCombinedUsdcBalance = selectedTokens.includes("USDC") && selectedTokens.includes("USDCe")
    
    if (showCombinedEthBalance) {
      // Render combined ETH+WETH balances
      return (
        <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50">
          <h3 className="font-medium mb-3 text-gray-600">Combined ETH + WETH Balance Results</h3>
          <div className="space-y-2">
            {Object.entries(ethBalances).map(([networkKey, balances]) => (
              <div key={networkKey} className="p-2 bg-white rounded border border-blue-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">
                    {networksData?.[networkKey]?.name || networkKey}
                  </span>
                  <span className="text-blue-600 font-mono">
                    {balances.total === "Error" 
                      ? <span className="text-red-500">Error</span>
                      : `${parseFloat(balances.total || "0").toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6
                        })} ETH+WETH`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <div>
                    <span className="mr-2">ETH: {balances.eth === "Error" ? "Error" : parseFloat(balances.eth || "0").toFixed(6)}</span>
                    <span>WETH: {balances.weth === "Error" ? "Error" : parseFloat(balances.weth || "0").toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (showCombinedUsdcBalance) {
      // Render combined USDC+USDCe balances
      return (
        <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50">
          <h3 className="font-medium mb-3 text-gray-600">Combined USDC + USDCe Balance Results</h3>
          <div className="space-y-2">
            {Object.entries(usdcBalances).map(([networkKey, balances]) => (
              <div key={networkKey} className="p-2 bg-white rounded border border-blue-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">
                    {networksData?.[networkKey]?.name || networkKey}
                  </span>
                  <span className="text-blue-600 font-mono">
                    {balances.total === "Error" 
                      ? <span className="text-red-500">Error</span>
                      : `${parseFloat(balances.total || "0").toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} USDC+USDCe`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <div>
                    <span className="mr-2">USDC: {balances.usdc === "Error" ? "Error" : parseFloat(balances.usdc || "0").toFixed(2)}</span>
                    <span>USDCe: {balances.usdce === "Error" ? "Error" : parseFloat(balances.usdce || "0").toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Render regular token balances
      const singleToken = selectedTokens[0]
      return (
        <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50">
          <h3 className="font-medium mb-3 text-gray-600">Balance Results</h3>
          <div className="space-y-2">
            {Object.entries(balances).map(([networkKey, balance]) => (
              <div key={networkKey} className="flex justify-between items-center p-2 bg-white rounded border border-blue-100">
                <span className="font-medium text-gray-700">
                  {networksData?.[networkKey]?.name || networkKey}
                </span>
                <span className="text-blue-600 font-mono">
                  {balance === "Not Available" 
                    ? <span className="text-gray-500">Not Available</span>
                    : balance === "Error"
                      ? <span className="text-red-500">Error</span>
                      : `${parseFloat(balance || "0").toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: singleToken === "USDC" || singleToken === "USDCe" ? 2 : 6
                        })} ${singleToken}`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Calculate total balance across all networks
  const calculateTotalBalance = () => {
    // Check if both ETH and WETH are selected
    const showCombinedEthBalance = selectedTokens.includes("ETH") && selectedTokens.includes("WETH");
    
    // Check if both USDC and USDCe are selected
    const showCombinedUsdcBalance = selectedTokens.includes("USDC") && selectedTokens.includes("USDCe");
    
    if (showCombinedEthBalance) {
      // Calculate total ETH+WETH balance across all networks
      let totalEth = ethers.toBigInt(0);
      let totalWeth = ethers.toBigInt(0);
      let hasValidBalance = false;
      
      Object.values(ethBalances).forEach(balance => {
        if (balance.eth !== "Error" && balance.weth !== "Error") {
          try {
            // Convert from string to BigInt
            const ethValue = ethers.parseUnits(balance.eth || "0", 18);
            const wethValue = ethers.parseUnits(balance.weth || "0", 18);
            
            totalEth += ethValue;
            totalWeth += wethValue;
            hasValidBalance = true;
          } catch (e) {
            console.error("Error parsing balance:", e);
          }
        }
      });
      
      const totalValue = totalEth + totalWeth;
      
      if (hasValidBalance) {
        return {
          eth: ethers.formatUnits(totalEth, 18),
          weth: ethers.formatUnits(totalWeth, 18),
          total: ethers.formatUnits(totalValue, 18),
          type: "eth"
        };
      }
    } else if (showCombinedUsdcBalance) {
      // Calculate total USDC+USDCe balance across all networks
      let totalUsdc = ethers.toBigInt(0);
      let totalUsdce = ethers.toBigInt(0);
      let hasValidBalance = false;
      
      Object.values(usdcBalances).forEach(balance => {
        if (balance.usdc !== "Error" && balance.usdce !== "Error") {
          try {
            // Convert from string to BigInt
            const usdcValue = ethers.parseUnits(balance.usdc || "0", 6);
            const usdceValue = ethers.parseUnits(balance.usdce || "0", 6);
            
            totalUsdc += usdcValue;
            totalUsdce += usdceValue;
            hasValidBalance = true;
          } catch (e) {
            console.error("Error parsing balance:", e);
          }
        }
      });
      
      const totalValue = totalUsdc + totalUsdce;
      
      if (hasValidBalance) {
        return {
          usdc: ethers.formatUnits(totalUsdc, 6),
          usdce: ethers.formatUnits(totalUsdce, 6),
          total: ethers.formatUnits(totalValue, 6),
          type: "usdc"
        };
      }
    } else if (selectedTokens.length > 0) {
      // Calculate total for a single token
      const singleToken = selectedTokens[0];
      let totalBalance = ethers.toBigInt(0);
      let hasValidBalance = false;
      const decimals = singleToken === "USDC" || singleToken === "USDCe" ? 6 : 18;
      
      Object.values(balances).forEach(balance => {
        if (balance !== "Error" && balance !== "Not Available") {
          try {
            // Convert from string to BigInt
            const value = ethers.parseUnits(balance || "0", decimals);
            totalBalance += value;
            hasValidBalance = true;
          } catch (e) {
            console.error("Error parsing balance:", e);
          }
        }
      });
      
      if (hasValidBalance) {
        return {
          single: ethers.formatUnits(totalBalance, decimals),
          token: singleToken,
          type: "single"
        };
      }
    }
    
    return null;
  };

  // Render total balance
  const renderTotalBalance = () => {
    const totalBalance = calculateTotalBalance();
    
    if (!totalBalance) return null;
    
    // Check if both ETH and WETH are selected
    const showCombinedEthBalance = selectedTokens.includes("ETH") && selectedTokens.includes("WETH");
    
    // Check if both USDC and USDCe are selected
    const showCombinedUsdcBalance = selectedTokens.includes("USDC") && selectedTokens.includes("USDCe");
    
    return (
      <div className="mt-4 p-4 border border-green-200 rounded-md bg-green-50">
        <h3 className="font-medium mb-2 text-gray-700">Total Balance Across All Networks</h3>
        
        {totalBalance.type === "eth" && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Total ETH + WETH</span>
              <span className="text-green-600 font-mono font-bold text-lg">
                {parseFloat(totalBalance.total || "0").toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })} ETH+WETH
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <div>
                <span className="mr-4">ETH: {parseFloat(totalBalance.eth || "0").toFixed(6)}</span>
                <span>WETH: {parseFloat(totalBalance.weth || "0").toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}
        
        {totalBalance.type === "usdc" && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Total USDC + USDCe</span>
              <span className="text-green-600 font-mono font-bold text-lg">
                {parseFloat(totalBalance.total || "0").toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} USDC+USDCe
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <div>
                <span className="mr-4">USDC: {parseFloat(totalBalance.usdc || "0").toFixed(2)}</span>
                <span>USDCe: {parseFloat(totalBalance.usdce || "0").toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        
        {totalBalance.type === "single" && (
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Total {totalBalance.token}</span>
            <span className="text-green-600 font-mono font-bold text-lg">
              {parseFloat(totalBalance.single || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: totalBalance.token === "USDC" || totalBalance.token === "USDCe" ? 2 : 6
              })} {totalBalance.token}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-600">Balance Checker</h2>
        <p className="text-gray-400">Check token balances across multiple networks</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-600 mb-1">
            Ethereum Address
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Ethereum address (0x...)"
            className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
          />
        </div>

        {renderTokenSelector()}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-600">
              Selected Networks
            </label>
            <div className="flex gap-2">
              {selectedNetworks.length > 0 && (
                <button
                  onClick={clearAllNetworks}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Network
              </button>
            </div>
          </div>
          
          <div className="border border-blue-100 rounded-md p-2 min-h-[60px] bg-gray-50">
            {renderSelectedNetworks()}
          </div>
        </div>

        <button
          onClick={fetchBalances}
          disabled={loading || !address || selectedNetworks.length === 0 || selectedTokens.length === 0}
          className={`w-full p-2 rounded-md flex items-center justify-center ${
            loading || !address || selectedNetworks.length === 0 || selectedTokens.length === 0
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Fetching balances...
            </>
          ) : (
            "Check Balances"
          )}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {(Object.keys(balances).length > 0 || Object.keys(ethBalances).length > 0 || Object.keys(usdcBalances).length > 0) && (
          <>
            {renderBalanceResults()}
            {renderTotalBalance()}
          </>
        )}
      </div>

      {/* Network selection modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-medium text-gray-700 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-500" />
                Network Selection
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                <div className="grid grid-cols-2 gap-2">
                  {networkList.map((networkKey) => {
                    // Check if any selected token is available on this network
                    const isAvailable = isAnySelectedTokenAvailableOnNetwork(networkKey);
                    
                    return (
                      <div
                        key={networkKey}
                        className={`p-2 border rounded-md flex items-center ${
                          !isAvailable 
                            ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                            : selectedNetworks.includes(networkKey)
                              ? "border-blue-500 bg-blue-50 cursor-pointer"
                              : "border-gray-200 hover:border-blue-300 cursor-pointer"
                        }`}
                        onClick={() => isAvailable && toggleNetwork(networkKey)}
                      >
                        <div className="mr-2">
                          {selectedNetworks.includes(networkKey) && isAvailable ? (
                            <Check className="h-4 w-4 text-blue-500" />
                          ) : (
                            <div className="h-4 w-4 border border-gray-300 rounded-sm" />
                          )}
                        </div>
                        <span className="text-sm truncate">
                          {networksData?.[networkKey]?.name || networkKey}
                        </span>
                        {!isAvailable && (
                          <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-1 rounded">
                            {selectedTokens.join("/")} Not Available
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="border-t p-4 flex justify-between">
              <div className="text-sm text-gray-500">
                {selectedNetworks.length} networks selected
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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