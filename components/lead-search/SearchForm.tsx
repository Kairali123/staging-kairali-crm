"use client"

import React from "react"

import { useState } from "react"
import { Search, RefreshCw, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchFormProps {
  onSearch: (leadId: string, phone: string) => void
  onNewSearch: () => void
  isSearching: boolean
  hasSearched: boolean
}

export function SearchForm({ onSearch, onNewSearch, isSearching, hasSearched }: SearchFormProps) {
  const [leadId, setLeadId] = useState("")
  const [phone, setPhone] = useState("")

  const bothFilled = leadId.trim() !== "" && phone.trim() !== ""
  const neitherFilled = leadId.trim() === "" && phone.trim() === ""

  const handleLeadIdChange = (value: string) => {
    setLeadId(value)
    if (value.trim() !== "") {
      setPhone("")
    }
  }

  const handlePhoneChange = (value: string) => {
    setPhone(value)
    if (value.trim() !== "") {
      setLeadId("")
    }
  }

  const handleSearch = () => {
    if (!bothFilled && !neitherFilled) {
      onSearch(leadId.trim(), phone.trim())
    }
  }

  const handleNewSearch = () => {
    setLeadId("")
    setPhone("")
    onNewSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !bothFilled && !neitherFilled && !isSearching) {
      handleSearch()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      {bothFilled && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-amber-800 text-sm">
            Please enter either Lead ID or Phone Number, not both. Clear one field to proceed.
          </span>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label htmlFor="leadId" className="block text-sm font-medium text-gray-700 mb-1">
            Lead ID
          </label>
          <Input
            id="leadId"
            type="text"
            placeholder="Enter Lead ID (e.g., KTAHV-2025-001)"
            value={leadId}
            onChange={(e) => handleLeadIdChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center justify-center px-4 py-2">
          <span className="text-gray-400 font-medium text-lg">OR</span>
        </div>
        
        <div className="flex-1 w-full">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter Phone Number (e.g., 9876543210)"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
          />
        </div>
        
        <div className="flex items-end gap-2 pt-6">
          <Button
            onClick={handleSearch}
            disabled={bothFilled || neitherFilled || isSearching}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isSearching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
          
          {hasSearched && (
            <Button
              onClick={handleNewSearch}
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Search
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
