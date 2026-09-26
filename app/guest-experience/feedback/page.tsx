"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

const defaultQuestions = [
  "How was your journey from the airport?",
  "Did your driver arrive on time?",
  "Was the airport pickup easy and well coordinated?",
  "Was the vehicle clean and comfortable?",
  "Were the air-conditioning and drinking water satisfactory?",
  "How would you rate the driver's courtesy and safe driving?",
]

export default function GuestFeedbackPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [questions, setQuestions] = useState(defaultQuestions)

  useEffect(() => {
    fetch("/api/guest-experience/config")
      .then(r => r.json())
      .then(d => {
        if (d.feedbackQuestions && d.feedbackQuestions.length > 0) {
          setQuestions(d.feedbackQuestions)
        }
      })
      .catch(() => {})
  }, [])

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentStep]: answer }))
    
    // If "Needs attention", we could show issue tags. Keeping it simple for the initial design.
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Submit to backend API
      const finalAnswers = { ...answers, [currentStep]: answer }
      const formattedAnswers: Record<string, string> = {}
      questions.forEach((q, i) => { formattedAnswers[q] = finalAnswers[i] })
      
      fetch("/api/guest-experience/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "feedback_submit", answers: formattedAnswers })
      }).catch(() => {})
      
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col h-screen bg-[#FDFBF7] items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-24 h-24 text-green-500 mb-6" />
        <h2 className="text-3xl font-serif text-gray-800 mb-4">Thank you for your feedback!</h2>
        <p className="text-gray-500 text-lg max-w-md mb-12">Your responses help us improve our services and ensure a pleasant journey for all guests.</p>
        <Link href="/guest-experience">
          <Button size="lg" className="h-14 px-8 text-lg bg-amber-700 hover:bg-amber-800 rounded-xl">
            Return to Welcome Screen
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFBF7]">
      <header className="p-6 flex items-center gap-4 bg-white shadow-sm">
        <Link href="/guest-experience">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Button>
        </Link>
        <h1 className="text-xl font-medium text-gray-800">Quick Feedback</h1>
        <div className="ml-auto text-sm text-gray-400 font-medium">
          {currentStep + 1} of {questions.length}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        
        <h2 className="text-3xl md:text-4xl font-serif text-center text-gray-800 mb-12 leading-tight">
          {questions[currentStep]}
        </h2>

        <div className="flex flex-col w-full gap-4">
          <Button 
            onClick={() => handleAnswer("Excellent")}
            variant="outline" 
            className="w-full h-20 text-xl font-medium justify-between px-8 rounded-2xl border-2 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <span className="flex items-center gap-4">
              <span className="text-3xl">😊</span> Excellent
            </span>
            <ChevronRight className="w-6 h-6 text-gray-300" />
          </Button>

          <Button 
            onClick={() => handleAnswer("Good")}
            variant="outline" 
            className="w-full h-20 text-xl font-medium justify-between px-8 rounded-2xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="flex items-center gap-4">
              <span className="text-3xl">😐</span> Good
            </span>
            <ChevronRight className="w-6 h-6 text-gray-300" />
          </Button>

          <Button 
            onClick={() => handleAnswer("Needs Attention")}
            variant="outline" 
            className="w-full h-20 text-xl font-medium justify-between px-8 rounded-2xl border-2 hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <span className="flex items-center gap-4">
              <span className="text-3xl">😟</span> Needs Attention
            </span>
            <ChevronRight className="w-6 h-6 text-gray-300" />
          </Button>
        </div>

      </div>
    </div>
  )
}
