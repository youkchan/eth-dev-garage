"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type Tool = "converter" | "transaction" | "balance"

interface NavigationProps {
  activeTool: Tool
  onChange: (tool: Tool) => void
}

export function Navigation({ activeTool, onChange }: NavigationProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onChange("converter")}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          activeTool === "converter"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        Unit Converter
      </button>
      <button
        onClick={() => onChange("transaction")}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          activeTool === "transaction"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        Transaction Viewer
      </button>
      <button
        onClick={() => onChange("balance")}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          activeTool === "balance"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        Balance Checker
      </button>
    </div>
  )
} 