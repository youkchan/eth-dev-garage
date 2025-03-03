"use client"

import { useState, type ChangeEvent } from "react"
import { parseUnits, parseEther, formatUnits, formatEther } from "ethers"

const formatFixedNumber = (numStr: string, decimals: number) => {
  if (!numStr) return ""
  if (!numStr.includes(".")) return numStr
  const [integerPart, fractionPart = ""] = numStr.split(".")
  let trimmedFraction = fractionPart.slice(0, decimals)
  trimmedFraction = trimmedFraction.replace(/0+$/, "")
  return trimmedFraction ? `${integerPart}.${trimmedFraction}` : integerPart
}

export default function UnitConverter() {
  const [currency, setCurrency] = useState<"ETH" | "USDC">("ETH")
  const [error, setError] = useState<string | null>(null)

  const [ethInput, setEthInput] = useState({ wei: "", gwei: "", ether: "" })
  const [usdcInput, setUsdcInput] = useState({ wei: "", usdc: "" })

  const handleEthInputChange = (e: ChangeEvent<HTMLInputElement>, unit: "wei" | "gwei" | "ether") => {
    setError(null)
    let inputValue = e.target.value.replace(/[^0-9.]/g, "")
    const dotIndex = inputValue.indexOf(".")
    if (dotIndex !== -1) {
      const secondDotIndex = inputValue.indexOf(".", dotIndex + 1)
      if (secondDotIndex !== -1) {
        inputValue = inputValue.slice(0, secondDotIndex)
      }
    }

    // 入力値を更新
    const newInputs = { ...ethInput, [unit]: inputValue }
    setEthInput(newInputs)

    if (inputValue === "" || inputValue === ".") {
      // 入力が空の場合は他のフィールドもクリア
      setEthInput({
        wei: unit === "wei" ? inputValue : "",
        gwei: unit === "gwei" ? inputValue : "",
        ether: unit === "ether" ? inputValue : "",
      })
      return
    }

    try {
      let weiValue: bigint
      if (unit === "wei") {
        // 整数値のみ許可
        if (inputValue.includes(".")) {
          throw new Error("Wei must be an integer")
        }
        weiValue = BigInt(inputValue)
      } else if (unit === "gwei") {
        weiValue = parseUnits(inputValue, "gwei")
      } else {
        weiValue = parseEther(inputValue)
      }

      // 他の単位の値を計算して入力フィールドに設定
      const weiStr = weiValue.toString()
      const gweiStr = formatUnits(weiValue, "gwei")
      const etherStr = formatEther(weiValue)

      setEthInput({
        wei: unit === "wei" ? inputValue : weiStr,
        gwei: unit === "gwei" ? inputValue : formatFixedNumber(gweiStr, 9),
        ether: unit === "ether" ? inputValue : formatFixedNumber(etherStr, 18),
      })
    } catch (err: any) {
      console.error("Conversion error:", err)
      setError(err.message || "Conversion error occurred")
      // エラー時は入力値のみを保持し、他の値はクリア
      setEthInput({
        wei: unit === "wei" ? inputValue : "",
        gwei: unit === "gwei" ? inputValue : "",
        ether: unit === "ether" ? inputValue : "",
      })
    }
  }

  const handleUsdcInputChange = (e: ChangeEvent<HTMLInputElement>, unit: "wei" | "usdc") => {
    setError(null)
    let inputValue = e.target.value.replace(/[^0-9.]/g, "")
    const dotIndex = inputValue.indexOf(".")
    if (dotIndex !== -1) {
      const secondDotIndex = inputValue.indexOf(".", dotIndex + 1)
      if (secondDotIndex !== -1) {
        inputValue = inputValue.slice(0, secondDotIndex)
      }
    }

    // 入力値を更新
    const newInputs = { ...usdcInput, [unit]: inputValue }
    setUsdcInput(newInputs)

    if (inputValue === "" || inputValue === ".") {
      // 入力が空の場合は他のフィールドもクリア
      setUsdcInput({
        wei: unit === "wei" ? inputValue : "",
        usdc: unit === "usdc" ? inputValue : "",
      })
      return
    }

    try {
      let weiValue: bigint
      if (unit === "wei") {
        // 整数値のみ許可
        if (inputValue.includes(".")) {
          throw new Error("Wei must be an integer")
        }
        weiValue = BigInt(inputValue)
      } else {
        weiValue = parseUnits(inputValue, 6)
      }

      // 他の単位の値を計算して入力フィールドに設定
      const weiStr = weiValue.toString()
      const usdcStr = formatUnits(weiValue, 6)

      setUsdcInput({
        wei: unit === "wei" ? inputValue : weiStr,
        usdc: unit === "usdc" ? inputValue : formatFixedNumber(usdcStr, 6),
      })
    } catch (err: any) {
      console.error("Conversion error:", err)
      setError(err.message || "Conversion error occurred")
      // エラー時は入力値のみを保持し、他の値はクリア
      setUsdcInput({
        wei: unit === "wei" ? inputValue : "",
        usdc: unit === "usdc" ? inputValue : "",
      })
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-600">
          ETH & USDC Unit Converter
        </h2>
        <p className="text-gray-400">
          Convert between Wei, Gwei, Ether and USDC units instantly. The perfect calculator for crypto transactions and development.
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="currency" className="block text-sm font-medium text-gray-600 mb-1">
          Select Currency
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as "ETH" | "USDC")}
          className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
        >
          <option value="ETH">ETH</option>
          <option value="USDC">USDC</option>
        </select>
      </div>

      {currency === "ETH" && (
        <div className="space-y-4">
          {(["wei", "gwei", "ether"] as const).map((unit) => (
            <div key={unit}>
              <label htmlFor={`eth-${unit}`} className="block text-sm font-medium text-gray-600 mb-1 capitalize">
                {unit}
              </label>
              <input
                id={`eth-${unit}`}
                type="text"
                value={ethInput[unit]}
                onChange={(e) => handleEthInputChange(e, unit)}
                placeholder={`Enter ${unit} value`}
                className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
              />
            </div>
          ))}
        </div>
      )}

      {currency === "USDC" && (
        <div className="space-y-4">
          {(["wei", "usdc"] as const).map((unit) => (
            <div key={unit}>
              <label htmlFor={`usdc-${unit}`} className="block text-sm font-medium text-gray-600 mb-1 capitalize">
                {unit}
              </label>
              <input
                id={`usdc-${unit}`}
                type="text"
                value={usdcInput[unit]}
                onChange={(e) => handleUsdcInputChange(e, unit)}
                placeholder={`Enter ${unit} value`}
                className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}