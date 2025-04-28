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
import { Brain, CheckCircle2, XCircle, Clock, BookOpen, Star, ThumbsUp, Lightbulb } from 'lucide-react';

export function QuizApp() {
  const { state, dispatch, callAgent, fetchQuestions, continueToNextStep } = useQuiz();
  const { toast } = useToast();
  const [topicInput, setTopicInput] = useState('');
  const [reflectionInput, setReflectionInput] = useState('');
  const [depthCheckInput, setDepthCheckInput] = useState({ glanced: '', understood: '' });
  const [confidenceInput, setConfidenceInput] = useState('');
  const [reviewModeInput, setReviewModeInput] = useState('');
  const [showAgentResponse, setShowAgentResponse] = useState(false);

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
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'comprehension' });
      setShowAgentResponse(true);
    } else {
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
  }, [state.currentIndex]);

  // Close agent response when status changes
  useEffect(() => {
    setShowAgentResponse(false);
  }, [state.quizStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="backdrop-blur-sm bg-white/90 shadow-xl border-t border-white/60">
          {/* Quiz Header with animation */}
          <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-lg text-white">
            <h1 className="text-3xl font-bold text-center mb-2 animate-fade-in">Interactive Quiz Agent</h1>
            <p className="text-indigo-100 text-center">Learning through understanding, not just memorizing</p>
          </div>

          {state.quizStatus === 'init' && (
            <CardContent className="p-6 space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-inner">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-blue-900">Start Your Learning Journey</h2>
                </div>
                <ul className="space-y-3 text-blue-800">
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
              
              <div className="space-y-4">
                <Label htmlFor="topic" className="text-lg font-medium text-gray-900">What would you like to learn about?</Label>
                <Input
                  id="topic"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="E.g., Photosynthesis, JavaScript, World History"
                  className="text-lg p-4 rounded-xl shadow-inner bg-gray-50 border-gray-200 focus:ring-2 focus:ring-indigo-500"
                />
                <Button 
                  onClick={handleTopicSubmit}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl p-6 font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02]"
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
                <Card className="bg-white p-6 rounded-xl shadow-md border-t border-gray-100">
                  <p className="text-lg font-medium text-gray-800">{state.currentQuestion.question}</p>
                </Card>
              </div>

              {/* Understanding Phase */}
              {state.quizStatus === 'understanding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.currentQuestion.options.map((option, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md border">
                        <span className="font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <p className="mb-3">Do you understand the question and all options?</p>
                    <div className="flex space-x-3">
                      <Button onClick={() => handleUnderstandingResponse(true)}>Yes, I understand</Button>
                      <Button variant="outline" onClick={() => handleUnderstandingResponse(false)}>
                        No, need clarification
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Comprehension Phase */}
              {state.quizStatus === 'comprehension' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold text-blue-800">Comprehension Agent:</h3>
                    <div className="whitespace-pre-line text-blue-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let me help you understand this question better."
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => dispatch({ type: 'SET_QUIZ_STATUS', payload: 'answering' })}
                    disabled={state.processingAgent}
                  >
                    I understand now, let me answer
                  </Button>
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
                        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border hover:bg-gray-100 cursor-pointer">
                          <RadioGroupItem value={optionLetter} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            <span className="font-semibold">{optionLetter}.</span> {option}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      onClick={handleAnswerSubmit}
                      disabled={!state.selectedOption}
                    >
                      Submit Answer
                    </Button>
                  </div>
                </div>
              )}

              {/* Confidence Phase */}
              {state.quizStatus === 'confidence' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold text-blue-800">Confidence Agent:</h3>
                    <div className="whitespace-pre-line text-blue-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "How confident are you in your answer?"
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confidence">How confident are you? (1: Very Sure / 2: Kinda Sure / 3: Just Guessed)</Label>
                    <Input
                      id="confidence"
                      value={confidenceInput}
                      onChange={(e) => setConfidenceInput(e.target.value)}
                      placeholder="Enter 1, 2, or 3"
                      className="mb-2"
                    />
                    <Button onClick={handleConfidenceSubmit}>Submit Confidence</Button>
                  </div>
                </div>
              )}

              {/* Depth Check Phase */}
              {state.quizStatus === 'depthCheck' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold text-blue-800">Depth Checker Agent:</h3>
                    <div className="whitespace-pre-line text-blue-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let's check your approach to this question."
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="glanced">Did you glance at all options before selecting? (yes/no)</Label>
                      <Input
                        id="glanced"
                        value={depthCheckInput.glanced}
                        onChange={(e) => setDepthCheckInput(prev => ({ ...prev, glanced: e.target.value.toLowerCase() }))}
                        placeholder="Enter yes or no"
                        className="mb-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="understood">Do you understand what each option means? (yes/no)</Label>
                      <Input
                        id="understood"
                        value={depthCheckInput.understood}
                        onChange={(e) => setDepthCheckInput(prev => ({ ...prev, understood: e.target.value.toLowerCase() }))}
                        placeholder="Enter yes or no"
                        className="mb-2"
                      />
                    </div>
                    <Button onClick={handleDepthCheckSubmit}>Submit Depth Check</Button>
                  </div>
                </div>
              )}

              {/* Submission Phase */}
              {state.quizStatus === 'submission' && (
                <div className="space-y-4 text-center">
                  <div className="animate-pulse flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                  <p>Checking your answer...</p>
                </div>
              )}

              {/* Correction Phase */}
              {state.quizStatus === 'correction' && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-md">
                    <h3 className="font-semibold text-red-800">Your answer was incorrect</h3>
                    <p className="mt-1 text-red-700">
                      Correct answer: {state.currentQuestion.answer}. {state.currentQuestion.options[state.currentQuestion.answer.charCodeAt(0) - 65]}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold text-blue-800">Correction Agent:</h3>
                    <div className="whitespace-pre-line text-blue-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let me help you understand why this answer is correct."
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => dispatch({ type: 'SET_QUIZ_STATUS', payload: 'reflection' })}
                    disabled={state.processingAgent}
                  >
                    I understand now, continue
                  </Button>
                </div>
              )}

              {/* Reflection Phase */}
              {state.quizStatus === 'reflection' && (
                <div className="space-y-4">
                  {state.outcome === 'Correct' && (
                    <div className="p-4 bg-green-50 rounded-md">
                      <h3 className="font-semibold text-green-800">Your answer was correct! Well done!</h3>
                      {state.currentQuestion.explanation && (
                        <p className="mt-2 text-green-700">{state.currentQuestion.explanation}</p>
                      )}
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold text-blue-800">Reflection Agent:</h3>
                    <div className="whitespace-pre-line text-blue-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let's reflect on how you approached this question."
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="reflection">What strategy helped you with this question?</Label>
                    <Textarea
                      id="reflection"
                      value={reflectionInput}
                      onChange={(e) => setReflectionInput(e.target.value)}
                      placeholder="Share your approach..."
                      className="h-24"
                    />
                    <Button onClick={handleReflectionSubmit}>Submit Reflection</Button>
                  </div>
                </div>
              )}

              {/* Scheduler Phase */}
              {state.quizStatus === 'scheduler' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold text-blue-800">Scheduler Agent:</h3>
                    <div className="whitespace-pre-line text-blue-700 mt-2">
                      {state.processingAgent ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                          <span className="ml-2">Thinking...</span>
                        </div>
                      ) : (
                        state.agentResponse || "Let's schedule a review for this concept based on your performance."
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="reviewMode">How would you like to receive your review reminder?</Label>
                    <Input
                      id="reviewMode"
                      value={reviewModeInput}
                      onChange={(e) => setReviewModeInput(e.target.value)}
                      placeholder="Email, WhatsApp, or In-App"
                      className="mb-2"
                    />
                    <Button onClick={handleSchedulerSubmit}>Schedule Review</Button>
                  </div>
                </div>
              )}

              {/* Quiz Complete */}
              {state.quizStatus === 'complete' && (
                <div className="space-y-6">
                  <div className="p-6 bg-green-50 rounded-md text-center">
                    <h2 className="text-2xl font-bold text-green-800 mb-2">Quiz Completed!</h2>
                    <p className="text-lg font-medium text-green-700">
                      Your Score: {state.studentResponses.filter(resp => resp.outcome === 'Correct').length}/{state.questions.length}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Performance Summary</h3>
                    <div className="bg-white rounded-lg p-4 border space-y-1">
                      <p>Correct answers: {state.studentResponses.filter(resp => resp.outcome === 'Correct').length}</p>
                      <p>Success rate: {(state.studentResponses.filter(resp => resp.outcome === 'Correct').length / state.questions.length * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Your Review Schedule</h3>
                    <div className="bg-white rounded-lg p-4 border">
                      {state.studentResponses.filter(resp => resp.reviewSchedule).length > 0 ? (
                        <ul className="space-y-2">
                          {state.studentResponses
                            .filter(resp => resp.reviewSchedule)
                            .map((resp, idx) => (
                              <li key={idx} className="p-2 border-b last:border-b-0">
                                <div className="text-sm text-gray-700">{resp.question.substring(0, 60)}...</div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-sm font-medium">
                                    {resp.reviewSchedule?.reviewDate}
                                  </span>
                                  <span className="text-sm text-blue-600">
                                    via {resp.reviewSchedule?.mode}
                                  </span>
                                </div>
                              </li>
                            ))
                          }
                        </ul>
                      ) : (
                        <p className="text-gray-500">No reviews scheduled.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button onClick={() => dispatch({ type: 'RESET_QUIZ' })}>Start New Quiz</Button>
                  </div>
                </div>
              )}

              {/* Agent Response Sheet with improved styling */}
              <Sheet open={showAgentResponse} onOpenChange={setShowAgentResponse}>
                <SheetContent className="bg-gradient-to-br from-white to-indigo-50">
                  <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Agent Insights
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-6">
                    <div className="whitespace-pre-line bg-white/80 p-6 rounded-xl shadow-inner border border-indigo-100">
                      {state.agentResponse}
                    </div>
                    <Button 
                      className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      onClick={() => setShowAgentResponse(false)}
                    >
                      Got it!
                    </Button>
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
