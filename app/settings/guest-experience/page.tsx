"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Eye, CheckCircle2, AlertCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export default function GuestExperienceConfigPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [lastPublished, setLastPublished] = useState<string | null>("Today at 10:45 AM")

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setLastPublished(new Date().toLocaleTimeString())
      toast.success("Configuration published successfully to all active vehicles.")
    }, 1000)
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Guest Experience PWA Configuration</h1>
          <p className="text-gray-500 mt-1">Manage content, videos, and AI chat settings for the vehicle tablets.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.open('/guest-experience', '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Preview App
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-amber-700 hover:bg-amber-800">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Publishing..." : "Publish to Devices"}
          </Button>
        </div>
      </div>

      {lastPublished && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Currently active on devices. Last published: <strong>{lastPublished}</strong></span>
        </div>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 bg-white border h-auto p-1">
          <TabsTrigger value="general" className="py-2.5 px-6">General & AI Chat</TabsTrigger>
          <TabsTrigger value="welcome" className="py-2.5 px-6">Welcome Screen</TabsTrigger>
          <TabsTrigger value="slides" className="py-2.5 px-6">Slides & Content</TabsTrigger>
          <TabsTrigger value="feedback" className="py-2.5 px-6">Feedback Form</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Riya Sharma AI Chat</CardTitle>
              <CardDescription>Configure the destination URL for the AI Guest Relations Manager QR code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-url">Chat Destination URL</Label>
                <Input id="ai-url" defaultValue="https://chat.kairali.com/riya?source=vehicle-pwa" placeholder="https://..." />
                <p className="text-xs text-gray-500">This URL will be automatically encoded into the QR code displayed on the tablets.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">QR Code Caption</Label>
                <Textarea id="ai-prompt" defaultValue="Scan to chat with our AI Guest Relations Manager on your personal device." />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Media & Download Center</CardTitle>
              <CardDescription>Link for the Explore Kairali section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="media-url">Official Media URL</Label>
                <Input id="media-url" defaultValue="https://www.kairali.com/media-assets.html" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="welcome" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Video & Hero</CardTitle>
              <CardDescription>Configure the main video and text shown on the first slide.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-url">Background Video URL (MP4)</Label>
                <Input id="video-url" defaultValue="https://cdn.kairali.com/videos/welcome-hq.mp4" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-poster">Video Thumbnail/Poster (Image URL)</Label>
                <Input id="video-poster" defaultValue="https://images.unsplash.com/photo-1596178060671-7a80fc80764b?q=80&w=2000" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Primary Heading</Label>
                  <Input defaultValue="Welcome to" />
                </div>
                <div className="space-y-2">
                  <Label>Highlighted Text (Gold)</Label>
                  <Input defaultValue="God's Own Country." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subtitle Message</Label>
                <Textarea defaultValue="Your journey to holistic wellness begins here. Please sit back, relax, and allow us to take care of every detail." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slides" className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Auto-Slider Configured:</strong> The PWA currently crossfades through 5 slides every 30 seconds. You can edit the imagery and text for slides 2-5 below.
            </div>
          </div>
          {/* Placeholder for repeating slide configs */}
          {[2, 3, 4, 5].map((num) => (
            <Card key={num}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Slide {num} Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label>Background Image URL</Label>
                  <Input placeholder="https://..." defaultValue={`Slide ${num} Image URL...`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input defaultValue={`Sample Title ${num}`} />
                  </div>
                  <div className="space-y-2">
                    <Label>Highlight</Label>
                    <Input defaultValue={`Sample Highlight ${num}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feedback Questionnaire</CardTitle>
              <CardDescription>Manage the quick questions asked during the airport transfer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["How was your journey from the airport?", "Did your driver arrive on time?", "Was the vehicle clean and comfortable?"].map((q, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-medium text-sm text-gray-500 shrink-0">{i + 1}</div>
                    <Input defaultValue={q} />
                  </div>
                ))}
                <Button variant="outline" className="mt-4 w-full border-dashed">
                  + Add Question
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
