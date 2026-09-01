"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface BackButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  customBackUrl?: string
}

export function BackButton({ className = "", variant = "outline", size = "sm", customBackUrl }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (customBackUrl) {
      router.push(customBackUrl)
    } else {
      router.back()
    }
  }

  return (
    <Button onClick={handleBack} variant={variant} size={size} className={className}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  )
}
