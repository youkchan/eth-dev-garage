"use client"

import { useState, useEffect } from "react"
import UnitConverter from "@/components/unit-converter"
import OnchainViewer from "@/components/onchain-viewer"
import BalanceChecker from "@/components/balance-checker"
import { Calculator, Search, Wallet, Heart } from "lucide-react"

type Tool = "converter" | "transaction" | "balance"

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>("converter")

  // LocalStorageから最後に使用したツールを読み込む
  useEffect(() => {
    const savedTool = localStorage.getItem("activeTool") as Tool | null
    if (savedTool) {
      setActiveTool(savedTool)
    }
  }, [])

  // アクティブなツールをLocalStorageに保存
  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool)
    localStorage.setItem("activeTool", tool)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col">
      <div className="container mx-auto p-4 max-w-4xl flex-grow">
        <h1 className="text-4xl font-bold mb-8 text-center text-black-600 pt-8">Ethereum Dev Garage</h1>

        <div className="mb-8">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-4 ${
                activeTool === "converter"
                  ? "border-b-2 border-blue-500 text-black-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleToolChange("converter")}
            >
              <Calculator className="w-5 h-5 mr-2 inline-block" />
              Unit Converter
            </button>
            <button
              className={`py-2 px-4 ${
                activeTool === "transaction"
                  ? "border-b-2 border-blue-500 text-black-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleToolChange("transaction")}
            >
              <Search className="w-5 h-5 mr-2 inline-block" />
              Onchain Viewer
            </button>
            <button
              className={`py-2 px-4 ${
                activeTool === "balance"
                  ? "border-b-2 border-blue-500 text-black-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleToolChange("balance")}
            >
              <Wallet className="w-5 h-5 mr-2 inline-block" />
              Balance Checker
            </button>
          </div>
        </div>

        {activeTool === "converter" && <UnitConverter />}
        {activeTool === "transaction" && <OnchainViewer />}
        {activeTool === "balance" && <BalanceChecker />}
      </div>
      
      <footer className="mt-12 py-6 bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-600 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Ethereum Dev Garage.
            </div>
            <div className="flex items-center">
              <Heart className="w-4 h-4 text-red-500 mr-2" />
              <div className="text-gray-600 text-sm">
                <span>If you find these tools useful, please consider donating:</span>
                <div className="font-mono bg-gray-200 p-2 rounded mt-1 text-xs break-all">
                  0xc4C1739a0aA11Ba6ceb6fBC3BC9ace5E009488Be
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

