"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"

const properties = [
  { name: "Kairali – The Ayurvedic Healing Village", desc: "Our award-winning health resort in Palakkad, Kerala." },
  { name: "Kairali Ayurvedic Products", desc: "Authentic herbal remedies and classical Ayurvedic formulations." },
  { name: "Kairali Ayurvedic Centre", desc: "Traditional treatment centers globally." },
  { name: "Villa Raag", desc: "Exclusive private wellness villas." }
]

export default function ExplorePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7]">
      <header className="p-6 flex items-center gap-4 bg-white shadow-sm sticky top-0 z-10">
        <Link href="/guest-experience">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Button>
        </Link>
        <h1 className="text-xl font-medium text-gray-800">Explore Kairali</h1>
      </header>

      <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        
        <div className="text-center mb-4">
          <h2 className="text-3xl font-serif text-amber-900 mb-3">Discover the World of Kairali</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Learn more about our heritage, holistic treatments, and the complete range of Ayurvedic offerings designed for your wellbeing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((prop, i) => (
            <Card key={i} className="rounded-2xl border-amber-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white">
              <div className="h-32 bg-amber-50 flex items-center justify-center">
                <span className="text-amber-800/20 font-serif text-2xl font-bold">KAIRALI</span>
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{prop.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{prop.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card className="bg-amber-800 text-white rounded-3xl overflow-hidden shadow-lg border-0">
            <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="flex-1">
                <h3 className="text-2xl font-serif mb-3">Media & Download Center</h3>
                <p className="text-amber-100/90 text-sm max-w-md">Access our official brochures, price lists, photo galleries, video tours, and company documents directly.</p>
              </div>
              <Link href="https://www.kairali.com/media-assets.html" target="_blank">
                <Button size="lg" className="bg-white text-amber-900 hover:bg-gray-50 rounded-xl h-14 px-8 shadow-sm">
                  Visit Media Center
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
