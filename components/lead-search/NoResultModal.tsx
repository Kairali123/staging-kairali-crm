"use client"

import { SearchX, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface NoResultModalProps {
  isOpen: boolean
  onClose: () => void
  onNewSearch: () => void
  searchTerm: string
}

export function NoResultModal({ isOpen, onClose, onNewSearch, searchTerm }: NoResultModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 p-4 bg-blue-50 rounded-full">
            <SearchX className="h-10 w-10 text-blue-500" />
          </div>
          <DialogTitle className="text-center text-xl">No Results Found</DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            We couldn&apos;t find any leads matching{" "}
            <span className="font-medium text-gray-800">&quot;{searchTerm}&quot;</span>.
            <br />
            Please check your search criteria and try again.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <p className="text-sm text-gray-600">
            <strong>Tips:</strong>
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1 list-disc list-inside">
            <li>Check if the Lead ID format is correct (e.g., KTAHV-2025-001)</li>
            <li>Ensure the phone number is 10 digits without spaces</li>
            <li>Try searching with a different data source filter</li>
          </ul>
        </div>
        
        <DialogFooter className="mt-6 flex gap-2 sm:justify-center">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onNewSearch} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            New Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
