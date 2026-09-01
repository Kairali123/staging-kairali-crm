"use client"

import React from "react"
import { BookingAuthProvider } from "@/hooks/use-booking-auth"

export default function NewBookingLayout({ children }: { children: React.ReactNode }) {
  return <BookingAuthProvider>{children}</BookingAuthProvider>
}
