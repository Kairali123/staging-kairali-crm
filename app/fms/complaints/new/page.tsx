"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BackButton } from "@/components/back-button"
import { AlertTriangle, Save } from "lucide-react"
import { toast } from "sonner"

export default function NewComplaintPage() {
  const [formData, setFormData] = useState({
    complaintType: "",
    severity: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    complaintDate: new Date().toISOString().split("T")[0],
    description: "",
    assignedTo: "",
    targetDate: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    toast.success("Complaint registered successfully!")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <BackButton />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Complaint Registration</h2>
          <p className="text-muted-foreground">Register a new customer complaint for CAPA process</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Complaint Details
          </CardTitle>
          <CardDescription>Fill in the complaint information for proper tracking and resolution</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Complaint Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Complaint Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complaintType">Complaint Type *</Label>
                  <Select
                    value={formData.complaintType}
                    onValueChange={(value) => setFormData({ ...formData, complaintType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select complaint type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service Quality</SelectItem>
                      <SelectItem value="product">Product Quality</SelectItem>
                      <SelectItem value="billing">Billing/Payment</SelectItem>
                      <SelectItem value="staff">Staff Behavior</SelectItem>
                      <SelectItem value="facility">Facility/Infrastructure</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="severity">Severity Level *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Phone Number *</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email Address</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="complaintDate">Complaint Date *</Label>
                  <Input
                    id="complaintDate"
                    type="date"
                    value={formData.complaintDate}
                    onChange={(e) => setFormData({ ...formData, complaintDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Complaint Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Complaint Description</h3>
              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed description of the complaint..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* Assignment & Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assignment & Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignedTo">Assign To *</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr-priya">Dr. Priya Nair</SelectItem>
                      <SelectItem value="dr-suresh">Dr. Suresh Menon</SelectItem>
                      <SelectItem value="operations-manager">Operations Manager</SelectItem>
                      <SelectItem value="customer-service">Customer Service Head</SelectItem>
                      <SelectItem value="quality-manager">Quality Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="targetDate">Target Resolution Date *</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Register Complaint
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/fms/complaints">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
