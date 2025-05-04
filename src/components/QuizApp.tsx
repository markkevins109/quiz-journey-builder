
import React, { useState, useEffect } from 'react';
import { useQuiz, COMPREHENSION_PROMPT, CONFIDENCE_PROMPT, DEPTH_CHECKER_PROMPT, CORRECTION_PROMPT, REFLECTION_PROMPT, SCHEDULER_PROMPT } from '@/contexts/QuizContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Brain, CheckCircle2, XCircle, Clock, BookOpen, Star, ThumbsUp, Lightbulb, ArrowRight } from 'lucide-react';

export function QuizApp() {
  const { state, dispatch, callAgent, fetchQuestions, continueToNextStep } = useQuiz();
  const { toast } = useToast();
  const [topicInput, setTopicInput] = useState('');
  const [reflectionInput, setReflectionInput] = useState('');
  const [depthCheckInput, setDepthCheckInput] = useState({ glanced: '', understood: '' });
  const [confidenceInput, setConfidenceInput] = useState('');
  const [reviewModeInput, setReviewModeInput] = useState('');
  const [showAgentResponse, setShowAgentResponse] = useState(false);
  const [explanationStep, setExplanationStep] = useState(0);
  const [explanationParts, setExplanationParts] = useState<string[]>([]);

  // Handle topic submission and question generation
  const handleTopicSubmit = async () => {
    dispatch({ type: 'SET_TOPIC', payload: topicInput });
    dispatch({ type: 'SET_QUIZ_STATUS', payload: 'questions' });
    await fetchQuestions(topicInput);
  };

  // Handle understanding question response
  const handleUnderstandingResponse = async (understood: boolean) => {
    dispatch({ type: 'SET_UNDERSTOOD', payload: understood });
    
    if (!understood) {
      const response = await callAgent(
        'Comprehension',
        COMPREHENSION_PROMPT,
        `Question: "${state.currentQuestion.question}"\nOptions: ${state.currentQuestion.options.join(', ')}`
      );
      
      // Split the response into meaningful chunks for step-by-step explanation
      const parts = splitExplanationIntoParts(response);
      setExplanationParts(parts);
      setExplanationStep(0);
      
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'comprehension' });
      setShowAgentResponse(true);
    } else {
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'answering' });
    }
  };

  // Split explanation into meaningful parts
  const splitExplanationIntoParts = (explanation: string): string[] => {
    // Split by paragraphs or numbered points
    const parts = explanation
      .split(/\n\n|\n(?=\d+\.)/)
      .filter(part => part.trim().length > 0)
      .map(part => part.trim());
    
    // If we have too few parts, try to split further
    if (parts.length < 3) {
      return explanation
        .split(/\n/)
        .filter(part => part.trim().length > 0)
        .map(part => part.trim());
    }
    
    return parts;
  };

  // Handle next explanation step
  const handleNextExplanationStep = () => {
    if (explanationStep < explanationParts.length - 1) {
      setExplanationStep(explanationStep + 1);
    } else {
      // Last step reached, close the explanation
      setShowAgentResponse(false);
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'answering' });
    }
  };

  // Handle option selection
  const handleOptionSelect = (value: string) => {
    dispatch({ type: 'SET_SELECTED_OPTION', payload: value });
  };

  // Handle submission after answering
  const handleAnswerSubmit = () => {
    if (!state.selectedOption) {
      toast({
        title: "Selection Required",
        description: "Please select an answer option",
        variant: "destructive"
      });
      return;
    }
    dispatch({ type: 'SET_QUIZ_STATUS', payload: 'confidence' });
  };

  // Handle confidence submission
  const handleConfidenceSubmit = async () => {
    if (!confidenceInput || !['1', '2', '3'].includes(confidenceInput)) {
      toast({
        title: "Confidence Level Required",
        description: "Please enter your confidence level (1: High, 2: Medium, 3: Low)",
        variant: "destructive"
      });
      return;
    }

    const confidenceMap: Record<string, 'High' | 'Medium' | 'Low'> = {
      '1': 'High',
      '2': 'Medium',
      '3': 'Low'
    };

    dispatch({ type: 'SET_CONFIDENCE', payload: confidenceMap[confidenceInput] });
    
    // Call the confidence agent
    await callAgent(
      'Confidence',
      CONFIDENCE_PROMPT,
      `The student has selected answer ${state.selectedOption} for the question: "${state.currentQuestion.question}" with confidence level ${confidenceMap[confidenceInput]}.`
    );
    
    dispatch({ type: 'SET_QUIZ_STATUS', payload: 'depthCheck' });
  };

  // Handle depth check submission
  const handleDepthCheckSubmit = async () => {
    if (!depthCheckInput.glanced || !depthCheckInput.understood) {
      toast({
        title: "Response Required",
        description: "Please answer both questions",
        variant: "destructive"
      });
      return;
    }

    dispatch({ type: 'SET_DEPTH_CHECK', payload: depthCheckInput });
    
    // Call the depth checker agent
    await callAgent(
      'DepthChecker',
      DEPTH_CHECKER_PROMPT,
      `The student has selected answer ${state.selectedOption} for the question: "${state.currentQuestion.question}". 
      Did they glance at all options? ${depthCheckInput.glanced}.
      Do they understand what each option means? ${depthCheckInput.understood}.`
    );
    
    if (depthCheckInput.glanced.toLowerCase() === 'yes' && depthCheckInput.understood.toLowerCase() === 'yes') {
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'submission' });
      checkAnswer();
    } else {
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'comprehension' });
      const response = await callAgent(
        'Comprehension',
        COMPREHENSION_PROMPT,
        `Question: "${state.currentQuestion.question}"\nOptions: ${state.currentQuestion.options.join(', ')}`
      );
      
      // Split the response into meaningful chunks for step-by-step explanation
      const parts = splitExplanationIntoParts(response);
      setExplanationParts(parts);
      setExplanationStep(0);
      
      setShowAgentResponse(true);
    }
  };

  // Function to check the answer
  const checkAnswer = async () => {
    const correct = state.currentQuestion.answer === state.selectedOption;
    dispatch({ type: 'SET_OUTCOME', payload: correct ? 'Correct' : 'Incorrect' });
    
    if (!correct) {
      // Call the correction agent
      await callAgent(
        'Correction',
        CORRECTION_PROMPT,
        `Question: "${state.currentQuestion.question}"
        Options: A. ${state.currentQuestion.options[0]}, B. ${state.currentQuestion.options[1]}, C. ${state.currentQuestion.options[2]}, D. ${state.currentQuestion.options[3]}
        Correct Answer: ${state.currentQuestion.answer} (${state.currentQuestion.options[state.currentQuestion.answer.charCodeAt(0) - 65]})
        Student's Answer: ${state.selectedOption} (${state.currentQuestion.options[state.selectedOption!.charCodeAt(0) - 65]})
        Explanation: ${state.currentQuestion.explanation || 'No explanation available.'}`
      );
      
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'correction' });
    } else {
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'reflection' });
    }
  };

  // Handle reflection submission
  const handleReflectionSubmit = async () => {
    if (!reflectionInput.trim()) {
      toast({
        title: "Reflection Required",
        description: "Please share your thoughts on how you approached this question",
        variant: "destructive"
      });
      return;
    }

    dispatch({ type: 'SET_REFLECTION', payload: reflectionInput });
    
    // Call the reflection agent
    await callAgent(
      'Reflection',
      REFLECTION_PROMPT,
      `Question: "${state.currentQuestion.question}"
      Correct Answer: ${state.currentQuestion.answer} (${state.currentQuestion.options[state.currentQuestion.answer.charCodeAt(0) - 65]})
      Outcome: ${state.outcome}
      Student's reflection: ${reflectionInput}`
    );
    
    dispatch({ type: 'SET_QUIZ_STATUS', payload: 'scheduler' });
  };

  // Handle scheduler submission
  const handleSchedulerSubmit = async () => {
    if (!reviewModeInput.trim()) {
      toast({
        title: "Review Method Required",
        description: "Please select how you'd like to receive your review (Email, WhatsApp, or In-App)",
        variant: "destructive"
      });
      return;
    }

    // Calculate review date based on outcome and confidence
    const days = (state.outcome === 'Incorrect' || state.confidence === 'Low') ? 1 : 7;
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + days);
    const formattedDate = reviewDate.toISOString().split('T')[0];

    dispatch({ 
      type: 'SET_REVIEW_SCHEDULE', 
      payload: {
        concept: state.currentQuestion.question,
        reviewDate: formattedDate,
        mode: reviewModeInput
      }
    });
    
    // Call the scheduler agent
    await callAgent(
      'Scheduler',
      SCHEDULER_PROMPT,
      `Topic: ${state.topic}
      Question about: "${state.currentQuestion.question}"
      Outcome: ${state.outcome}
      Confidence: ${state.confidence}
      Requested delivery method: ${reviewModeInput}`
    );
    
    dispatch({ type: 'NEXT_QUESTION' });
  };

  // Reset inputs when moving between questions
  useEffect(() => {
    setConfidenceInput('');
    setDepthCheckInput({ glanced: '', understood: '' });
    setReflectionInput('');
    setReviewModeInput('');
    setExplanationStep(0);
    setExplanationParts([]);
  }, [state.currentIndex]);

  // Close agent response when status changes
  useEffect(() => {
    if (state.quizStatus !== 'comprehension') {
      setShowAgentResponse(false);
    }
  }, [state.quizStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="backdrop-blur-sm bg-white/90 shadow-xl border-t border-white/60 rounded-2xl overflow-hidden">
          {/* Quiz Header with animation */}
          <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjxwYXRoIGQ9Ik0yMCAyNGMwLTIuMiAxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNC00LTEuOC00LTR6Ii8+PHBhdGggZD0iTTQwIDE0YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
            <h1 className="text-3xl font-bold text-center mb-2 animate-fade-in relative z-10">Interactive Quiz Agent</h1>
            <p className="text-indigo-100 text-center text-lg relative z-10">Learning through understanding, not just memorizing</p>
          </div>

          {state.quizStatus === 'init' && (
            <CardContent className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-xl font-semibold text-indigo-900">Start Your Learning Journey</h2>
                  </div>
                  <ul className="space-y-3 text-indigo-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span>Personalized learning experience</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      <span>Comprehensive understanding checks</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span>Confidence building approach</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <span>Smart review scheduling</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="topic" className="text-lg font-medium text-gray-900">What would you like to learn about?</Label>
                <Input
                  id="topic"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="E.g., Photosynthesis, JavaScript, World History"
                  className="text-lg p-4 rounded-xl shadow-inner bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-500"
                />
                <Button 
                  onClick={handleTopicSubmit}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl p-6 font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-md"
                >
                  Begin Your Quiz Journey
                </Button>
                <p className="text-sm text-center text-gray-500">
                  Leave blank to explore our curated questions
                </p>
              </div>
            </CardContent>
          )}

          {/* Questions Flow */}
          {state.quizStatus !== 'init' && state.quizStatus !== 'questions' && !state.loadingQuestions && (
            <CardContent className="p-6">
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Question {state.currentIndex + 1} of {state.questions.length}
                  </h2>
                  <span className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 rounded-full text-sm font-medium">
                    Topic: {state.topic || "General Knowledge"}
                  </span>
                </div>
                <Card className="bg-white p-6 rounded-xl shadow-md border-t border-indigo-100">
                  <p className="text-lg font-medium text-indigo-900">{state.currentQuestion.question}</p>
                </Card>
              </div>

              {/* Understanding Phase */}
              {state.quizStatus === 'understanding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.currentQuestion.options.map((option, index) => (
                      <div key={index} className="p-4 bg-indigo-50/50 rounded-md border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-colors">
                        <span className="font-semibold text-indigo-800">{String.fromCharCode(65 + index)}.</span> {option}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <p className="mb-3 text-lg font-medium text-gray-800">Do you understand the question and all options?</p>
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleUnderstandingResponse(true)}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                      >
                        Yes, I understand
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleUnderstandingResponse(false)}
                        className="border-indigo-300 hover:bg-indigo-50"
                      >
                        No, need clarification
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Comprehension Phase */}
              {state.quizStatus === 'comprehension' && (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-md">
                    <h3 className="font-semibold text-indigo-800 text-lg mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <span>Comprehension Agent</span> 
                      {!state.processingAgent && explanationParts.length > 0 && (
                        <span className="text-sm font-normal text-indigo-500 ml-2">
                          Step {explanationStep + 1} of {explanationParts.length}
                        </span>
                      )}
                    </h3>
                    
                    <div className="whitespace-pre-line text-indigo-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <span className="ml-3 text-indigo-600 font-medium">Thinking...</span>
                        </div>
                      ) : (
                        explanationParts.length > 0 ? (
                          <div className="animate-fade-in">
                            {explanationParts[explanationStep]}
                          </div>
                        ) : (
                          "Let me help you understand this question better."
                        )
                      )}
                    </div>
                    
                    {!state.processingAgent && explanationParts.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <Button 
                          onClick={handleNextExplanationStep}
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 flex items-center gap-2"
                        >
                          {explanationStep < explanationParts.length - 1 ? (
                            <>Continue <ArrowRight className="w-4 h-4" /></>
                          ) : (
                            "I understand now"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {!explanationParts.length && (
                    <Button 
                      onClick={() => dispatch({ type: 'SET_QUIZ_STATUS', payload: 'answering' })}
                      disabled={state.processingAgent}
                    >
                      I understand now, let me answer
                    </Button>
                  )}
                </div>
              )}

              {/* Answer Phase */}
              {state.quizStatus === 'answering' && (
                <div className="space-y-4">
                  <RadioGroup
                    value={state.selectedOption}
                    onValueChange={handleOptionSelect}
                    className="space-y-3"
                  >
                    {state.currentQuestion.options.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index);
                      return (
                        <div key={index} className="flex items-center space-x-2 p-4 bg-gradient-to-r from-white to-indigo-50/30 rounded-lg border border-indigo-100 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all duration-200 cursor-pointer shadow-sm">
                          <RadioGroupItem value={optionLetter} id={`option-${index}`} className="text-indigo-600" />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            <span className="font-semibold text-indigo-800">{optionLetter}.</span> {option}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      onClick={handleAnswerSubmit}
                      disabled={!state.selectedOption}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                      Submit Answer
                    </Button>
                  </div>
                </div>
              )}

              {/* Confidence Phase */}
              {state.quizStatus === 'confidence' && (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-md">
                    <h3 className="font-semibold text-indigo-800 text-lg mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      How confident are you in your answer?
                    </h3>
                    <p className="text-indigo-700">
                      Rate your confidence: 1 (Very Sure), 2 (Somewhat Sure), 3 (Just Guessing)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[1, 2, 3].map((level) => (
                        <button
                          key={level}
                          onClick={() => setConfidenceInput(level.toString())}
                          className={`p-4 rounded-lg border ${
                            confidenceInput === level.toString()
                              ? 'bg-indigo-100 border-indigo-300 ring-2 ring-indigo-500'
                              : 'bg-white border-gray-200 hover:bg-indigo-50'
                          } transition-all text-center`}
                        >
                          <div className="font-semibold text-lg text-indigo-900">{level}</div>
                          <div className="text-sm text-gray-600">
                            {level === 1 ? 'Very Sure' : level === 2 ? 'Somewhat Sure' : 'Just Guessing'}
                          </div>
                        </button>
                      ))}
                    </div>
                    <Button 
                      onClick={handleConfidenceSubmit}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                      Submit Confidence
                    </Button>
                  </div>
                </div>
              )}

              {/* Depth Check Phase */}
              {state.quizStatus === 'depthCheck' && (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-md">
                    <h3 className="font-semibold text-indigo-800 text-lg mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      Let's check your approach
                    </h3>
                    <div className="whitespace-pre-line text-indigo-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let's ensure you considered all options carefully."
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
                    <div>
                      <Label htmlFor="glanced" className="text-indigo-900">Did you glance at all options before selecting? (yes/no)</Label>
                      <div className="flex gap-3 mt-2">
                        {['yes', 'no'].map(answer => (
                          <button
                            key={answer}
                            onClick={() => setDepthCheckInput(prev => ({ ...prev, glanced: answer }))}
                            className={`px-4 py-2 rounded-md border ${
                              depthCheckInput.glanced === answer
                                ? 'bg-indigo-100 border-indigo-300 ring-2 ring-indigo-500'
                                : 'bg-white border-gray-200 hover:bg-indigo-50'
                            } transition-all`}
                          >
                            {answer.charAt(0).toUpperCase() + answer.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="understood" className="text-indigo-900">Do you understand what each option means? (yes/no)</Label>
                      <div className="flex gap-3 mt-2">
                        {['yes', 'no'].map(answer => (
                          <button
                            key={answer}
                            onClick={() => setDepthCheckInput(prev => ({ ...prev, understood: answer }))}
                            className={`px-4 py-2 rounded-md border ${
                              depthCheckInput.understood === answer
                                ? 'bg-indigo-100 border-indigo-300 ring-2 ring-indigo-500'
                                : 'bg-white border-gray-200 hover:bg-indigo-50'
                            } transition-all`}
                          >
                            {answer.charAt(0).toUpperCase() + answer.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button 
                      onClick={handleDepthCheckSubmit}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                      Submit Depth Check
                    </Button>
                  </div>
                </div>
              )}

              {/* Submission Phase */}
              {state.quizStatus === 'submission' && (
                <div className="space-y-4 text-center py-10">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-lg font-medium text-indigo-800">Checking your answer...</p>
                </div>
              )}

              {/* Correction Phase */}
              {state.quizStatus === 'correction' && (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200 shadow-md">
                    <h3 className="font-semibold text-red-800 text-lg mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Your answer was incorrect
                    </h3>
                    <p className="mt-1 text-red-700">
                      Correct answer: {state.currentQuestion.answer}. {state.currentQuestion.options[state.currentQuestion.answer.charCodeAt(0) - 65]}
                    </p>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-md">
                    <h3 className="font-semibold text-indigo-800 text-lg mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <span>Correction Insights</span>
                    </h3>
                    <div className="whitespace-pre-line text-indigo-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <span className="ml-3 text-indigo-600 font-medium">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let me help you understand why this answer is correct."
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => dispatch({ type: 'SET_QUIZ_STATUS', payload: 'reflection' })}
                    disabled={state.processingAgent}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    I understand now, continue
                  </Button>
                </div>
              )}

              {/* Reflection Phase */}
              {state.quizStatus === 'reflection' && (
                <div className="space-y-4">
                  {state.outcome === 'Correct' && (
                    <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-200 shadow-md">
                      <h3 className="font-semibold text-green-800 text-lg mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Your answer was correct! Well done!
                      </h3>
                      {state.currentQuestion.explanation && (
                        <p className="mt-2 text-green-700">{state.currentQuestion.explanation}</p>
                      )}
                    </div>
                  )}

                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-md">
                    <h3 className="font-semibold text-indigo-800 text-lg mb-3 flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-indigo-600" />
                      <span>Reflection Moment</span>
                    </h3>
                    <div className="whitespace-pre-line text-indigo-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let's reflect on how you approached this question."
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="reflection" className="text-indigo-900">What strategy helped you with this question?</Label>
                    <Textarea
                      id="reflection"
                      value={reflectionInput}
                      onChange={(e) => setReflectionInput(e.target.value)}
                      placeholder="Share your approach..."
                      className="h-24 border-indigo-200 focus:border-indigo-400 shadow-inner"
                    />
                    <Button 
                      onClick={handleReflectionSubmit}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                      Submit Reflection
                    </Button>
                  </div>
                </div>
              )}

              {/* Scheduler Phase */}
              {state.quizStatus === 'scheduler' && (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-md">
                    <h3 className="font-semibold text-indigo-800 text-lg mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <span>Schedule Your Review</span>
                    </h3>
                    <div className="whitespace-pre-line text-indigo-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let's schedule a review for this concept based on your performance."
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="reviewMode" className="text-indigo-900">How would you like to receive your review reminder?</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Email', 'WhatsApp', 'In-App'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setReviewModeInput(mode)}
                          className={`p-4 rounded-lg border ${
                            reviewModeInput === mode
                              ? 'bg-indigo-100 border-indigo-300 ring-2 ring-indigo-500'
                              : 'bg-white border-gray-200 hover:bg-indigo-50'
                          } transition-all text-center`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <Button 
                      onClick={handleSchedulerSubmit}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 mt-2"
                    >
                      Schedule Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Quiz Complete */}
              {state.quizStatus === 'complete' && (
                <div className="space-y-6">
                  <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl text-center border border-green-200 shadow-md">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 text-white rounded-full mb-4 animate-scale-in">
                      <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-green-800 mb-2">Quiz Completed!</h2>
                    <p className="text-xl font-medium text-green-700">
                      Your Score: {state.studentResponses.filter(resp => resp.outcome === 'Correct').length}/{state.questions.length}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-indigo-900">Performance Summary</h3>
                    <div className="bg-white rounded-lg p-6 border border-indigo-100 shadow-md space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Correct answers:</span>
                        <span className="font-semibold text-indigo-900">{state.studentResponses.filter(resp => resp.outcome === 'Correct').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Success rate:</span>
                        <span className="font-semibold text-indigo-900">
                          {(state.studentResponses.filter(resp => resp.outcome === 'Correct').length / state.questions.length * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-500 h-2.5 rounded-full" 
                             style={{ width: `${(state.studentResponses.filter(resp => resp.outcome === 'Correct').length / state.questions.length * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-indigo-900">Your Review Schedule</h3>
                    <div className="bg-white rounded-lg p-6 border border-indigo-100 shadow-md">
                      {state.studentResponses.filter(resp => resp.reviewSchedule).length > 0 ? (
                        <ul className="divide-y divide-indigo-100">
                          {state.studentResponses
                            .filter(resp => resp.reviewSchedule)
                            .map((resp, idx) => (
                              <li key={idx} className="py-4 first:pt-0 last:pb-0">
                                <div className="text-sm text-gray-700">{resp.question.substring(0, 60)}...</div>
                                <div className="flex justify-between mt-2">
                                  <span className="text-sm font-medium text-indigo-700 flex items-center">
                                    <Clock className="w-4 h-4 mr-1" /> 
                                    {resp.reviewSchedule?.reviewDate}
                                  </span>
                                  <span className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                    via {resp.reviewSchedule?.mode}
                                  </span>
                                </div>
                              </li>
                            ))
                          }
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No reviews scheduled.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => dispatch({ type: 'RESET_QUIZ' })}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 px-8 py-6 text-lg"
                    >
                      Start New Quiz
                    </Button>
                  </div>
                </div>
              )}

              {/* Agent Response Sheet */}
              <Sheet open={showAgentResponse && state.quizStatus === 'comprehension'} onOpenChange={setShowAgentResponse}>
                <SheetContent className="bg-gradient-to-br from-white to-indigo-50 w-[95%] sm:w-[540px] sm:max-w-md overflow-auto">
                  <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <span>Understanding the Question</span>
                      {!state.processingAgent && explanationParts.length > 0 && (
                        <span className="text-sm font-normal text-indigo-500 ml-2">
                          Step {explanationStep + 1} of {explanationParts.length}
                        </span>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-6">
                    <div className="whitespace-pre-line bg-white/80 p-6 rounded-xl shadow-inner border border-indigo-100">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <span className="ml-3 text-indigo-600 font-medium">Thinking...</span>
                        </div>
                      ) : (
                        explanationParts.length > 0 ? (
                          <div className="animate-fade-in">
                            {explanationParts[explanationStep]}
                          </div>
                        ) : (
                          state.agentResponse || "Let me help you understand this question better."
                        )
                      )}
                    </div>
                    
                    {!state.processingAgent && explanationParts.length > 0 && (
                      <Button 
                        className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        onClick={handleNextExplanationStep}
                      >
                        {explanationStep < explanationParts.length - 1 ? (
                          <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>
                        ) : (
                          "I understand now"
                        )}
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
