const fs = require('fs');
['app/guest-experience/feedback/page.tsx', 'app/guest-experience-light/feedback/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  const oldImport = 'import { useState } from "react"';
  const newImport = 'import { useState, useEffect } from "react"';
  c = c.replace(oldImport, newImport);

  const defaultQuestions = `const questions = [
  "How was your journey from the airport?",
  "Did your driver arrive on time?",
  "Was the airport pickup easy and well coordinated?",
  "Was the vehicle clean and comfortable?",
  "Were the air-conditioning and drinking water satisfactory?",
  "How would you rate the driver's courtesy and safe driving?",
]`;

  const newDefaultQuestions = `const defaultQuestions = [
  "How was your journey from the airport?",
  "Did your driver arrive on time?",
  "Was the airport pickup easy and well coordinated?",
  "Was the vehicle clean and comfortable?",
  "Were the air-conditioning and drinking water satisfactory?",
  "How would you rate the driver's courtesy and safe driving?",
]`;

  c = c.replace(defaultQuestions, newDefaultQuestions);

  const oldState = `  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)`;

  const newState = `  const [currentStep, setCurrentStep] = useState(0)
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
  }, [])`;

  c = c.replace(oldState, newState);

  const oldSubmit = `    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setIsSubmitted(true)
    }`;

  const newSubmit = `    if (currentStep < questions.length - 1) {
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
    }`;

  c = c.replace(oldSubmit, newSubmit);

  fs.writeFileSync(file, c);
  console.log('Patched feedback ' + file);
});
