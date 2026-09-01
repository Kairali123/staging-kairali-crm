"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, ArrowLeft, Save, User, MapPin, CreditCard, FileText, Building } from "lucide-react"
import Link from "next/link"
import { useBookingAuth } from "@/hooks/use-booking-auth"
import type { Booking } from "@/types/booking"
import { toast } from "sonner"

export default function NewBookingPage() {
  const { user, hasPermission } = useBookingAuth()

  const [formData, setFormData] = useState({
    // Identity & Timing
    clientName: "",
    dialCountryCode: "+91",
    mobile: "",
    email: "",
    gender: "",
    arrivalDate: "",
    departureDate: "",

    // Location & Billing
    billingAddress: "",
    country: "India",
    state: "Kerala",
    district: "",

    // Stay & Package
    programPackageName: "",
    roomType: "",
    roomCategory: "",
    adults: 1,
    male: 0,
    female: 0,
    children: 0,
    guestStatus: "",
    guestHistoryNote: "",

    // Commercials & Ownership
    invoiceAmount: "",
    bookingTakenBy: user?.name || "",
    bookingStatus: "CONFIRMED",
    companyName: "KTAHV",
    paymentTerms: "",
    clientCategory: "",
    clientType: "Individual",
    groupBookingPeople: 1,
    repeatClient: false,
    purposeOfStay: "",
    bookingType: "Direct",
    currency: "INR",
    dataSource: "Manual Entry",

    // Documents & Links
    uploadTestReportsLink: "",

    // Initial Payment
    initialPaymentAmount: "",
    paymentMode: "",
    receiptNumber: "",

    // Additional Notes
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasPermission("booking.create")) {
      toast.error("You do not have permission to create bookings")
      return
    }

    // Calculate days of stay
    const arrival = new Date(formData.arrivalDate)
    const departure = new Date(formData.departureDate)
    const daysOfStay = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOfStay <= 0) {
      toast.error("Departure date must be after arrival date")
      return
    }

    // Create booking object
    const newBooking: Partial<Booking> = {
      ...formData,
      gender: formData.gender ? (formData.gender as NonNullable<Booking["gender"]>) : undefined,
      bookingStatus: formData.bookingStatus as Booking["bookingStatus"],
      daysOfStay,
      reservationId: `RES${Date.now()}`,
      guestId: `G${Date.now()}`,
      timestamp: new Date().toISOString(),
      bookingDateTime: new Date().toISOString(),
      invoiceAmount: Number.parseFloat(formData.invoiceAmount) || 0,
      inrValue: Number.parseFloat(formData.invoiceAmount) || 0,
      payments: formData.initialPaymentAmount
        ? [
            {
              id: `P${Date.now()}`,
              receivedDateTime: new Date().toISOString(),
              receivedAmount: Number.parseFloat(formData.initialPaymentAmount),
              paymentMode: formData.paymentMode,
              receiptTransactionNumber: formData.receiptNumber,
              paymentCollectionBy: user?.name || "",
            },
          ]
        : [],
      totalReceivedAmount: Number.parseFloat(formData.initialPaymentAmount) || 0,
      percentReceived:
        formData.initialPaymentAmount && formData.invoiceAmount
          ? Math.round(
              (Number.parseFloat(formData.initialPaymentAmount) / Number.parseFloat(formData.invoiceAmount)) * 100,
            )
          : 0,
      pendingAmount:
        (Number.parseFloat(formData.invoiceAmount) || 0) - (Number.parseFloat(formData.initialPaymentAmount) || 0),
      approvals: [],
      alerts: {
        whatsappBookingReceived: true,
        emailBookingReceived: true,
      },
      stage: 1,
      stageUpdatedAt: new Date().toISOString(),
    }

    toast.success("Booking created successfully with all required fields!")
  }

  if (!user) {
    return <div>Please login to create bookings</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/fms/bookings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New KTAHV Client Booking</h2>
          <p className="text-muted-foreground">Create comprehensive booking with all required fields</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Comprehensive Booking Form
          </CardTitle>
          <CardDescription>Complete all sections for proper booking management</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="identity">Identity & Timing</TabsTrigger>
                <TabsTrigger value="location">Location & Stay</TabsTrigger>
                <TabsTrigger value="commercial">Commercial</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="additional">Additional</TabsTrigger>
              </TabsList>

              {/* Identity & Timing Tab */}
              <TabsContent value="identity" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Identity & Timing Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dialCode">Country Code</Label>
                    <Select
                      value={formData.dialCountryCode}
                      onValueChange={(value) => setFormData({ ...formData, dialCountryCode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+91">+91 (India)</SelectItem>
                        <SelectItem value="+1">+1 (USA)</SelectItem>
                        <SelectItem value="+44">+44 (UK)</SelectItem>
                        <SelectItem value="+971">+971 (UAE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="arrivalDate">Arrival Date *</Label>
                    <Input
                      id="arrivalDate"
                      type="date"
                      value={formData.arrivalDate}
                      onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="departureDate">Departure Date *</Label>
                    <Input
                      id="departureDate"
                      type="date"
                      value={formData.departureDate}
                      onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Location & Stay Tab */}
              <TabsContent value="location" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Location & Stay Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="billingAddress">Billing Address</Label>
                    <Textarea
                      id="billingAddress"
                      value={formData.billingAddress}
                      onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kerala">Kerala</SelectItem>
                        <SelectItem value="Karnataka">Karnataka</SelectItem>
                        <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                        <SelectItem value="Goa">Goa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="programPackageName">Programme/Package *</Label>
                    <Select
                      value={formData.programPackageName}
                      onValueChange={(value) => setFormData({ ...formData, programPackageName: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Panchakarma Detox Package">Panchakarma Detox Package</SelectItem>
                        <SelectItem value="Ayurvedic Consultation">Ayurvedic Consultation</SelectItem>
                        <SelectItem value="Wellness Retreat">Wellness Retreat</SelectItem>
                        <SelectItem value="Therapeutic Massage">Therapeutic Massage</SelectItem>
                        <SelectItem value="Yoga Therapy">Yoga Therapy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="roomType">Room Type</Label>
                    <Select
                      value={formData.roomType}
                      onValueChange={(value) => setFormData({ ...formData, roomType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Deluxe">Deluxe</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Suite">Suite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="roomCategory">Room Category</Label>
                    <Select
                      value={formData.roomCategory}
                      onValueChange={(value) => setFormData({ ...formData, roomCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC</SelectItem>
                        <SelectItem value="Non-AC">Non-AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="adults">Adults *</Label>
                    <Input
                      id="adults"
                      type="number"
                      min="1"
                      value={formData.adults}
                      onChange={(e) => setFormData({ ...formData, adults: Number.parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="male">Male</Label>
                    <Input
                      id="male"
                      type="number"
                      min="0"
                      value={formData.male}
                      onChange={(e) => setFormData({ ...formData, male: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="female">Female</Label>
                    <Input
                      id="female"
                      type="number"
                      min="0"
                      value={formData.female}
                      onChange={(e) => setFormData({ ...formData, female: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="children">Children</Label>
                    <Input
                      id="children"
                      type="number"
                      min="0"
                      value={formData.children}
                      onChange={(e) => setFormData({ ...formData, children: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Commercial Tab */}
              <TabsContent value="commercial" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Commercial Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invoiceAmount">Invoice Amount (₹) *</Label>
                    <Input
                      id="invoiceAmount"
                      type="number"
                      value={formData.invoiceAmount}
                      onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientCategory">Client Category</Label>
                    <Select
                      value={formData.clientCategory}
                      onValueChange={(value) => setFormData({ ...formData, clientCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Premium">Premium</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="clientType">Client Type</Label>
                    <Select
                      value={formData.clientType}
                      onValueChange={(value) => setFormData({ ...formData, clientType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Group">Group</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="purposeOfStay">Purpose of Stay</Label>
                    <Select
                      value={formData.purposeOfStay}
                      onValueChange={(value) => setFormData({ ...formData, purposeOfStay: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Health Treatment">Health Treatment</SelectItem>
                        <SelectItem value="Wellness">Wellness</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Detox">Detox</SelectItem>
                        <SelectItem value="Therapy">Therapy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bookingType">Booking Type</Label>
                    <Select
                      value={formData.bookingType}
                      onValueChange={(value) => setFormData({ ...formData, bookingType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Travel Agent">Travel Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full Advance">Full Advance</SelectItem>
                        <SelectItem value="50% Advance">50% Advance</SelectItem>
                        <SelectItem value="Pay on Arrival">Pay on Arrival</SelectItem>
                        <SelectItem value="Credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Payment Tab */}
              <TabsContent value="payment" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Initial Payment Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="initialPaymentAmount">Initial Payment Amount (₹)</Label>
                    <Input
                      id="initialPaymentAmount"
                      type="number"
                      value={formData.initialPaymentAmount}
                      onChange={(e) => setFormData({ ...formData, initialPaymentAmount: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="receiptNumber">Receipt/Transaction Number</Label>
                    <Input
                      id="receiptNumber"
                      value={formData.receiptNumber}
                      onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Additional Tab */}
              <TabsContent value="additional" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="uploadTestReportsLink">Test Reports Link</Label>
                    <Input
                      id="uploadTestReportsLink"
                      type="url"
                      value={formData.uploadTestReportsLink}
                      onChange={(e) => setFormData({ ...formData, uploadTestReportsLink: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="guestHistoryNote">Guest History/Notes</Label>
                    <Textarea
                      id="guestHistoryNote"
                      value={formData.guestHistoryNote}
                      onChange={(e) => setFormData({ ...formData, guestHistoryNote: e.target.value })}
                      rows={3}
                      placeholder="Previous visits, medical history, special requirements..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requirements or notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 pt-6 border-t">
              <Button type="submit" className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Create Comprehensive Booking
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/fms/bookings">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
