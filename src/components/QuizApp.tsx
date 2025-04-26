
import React, { useState, useEffect } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  COMPREHENSION_PROMPT,
  DEPTH_CHECKER_PROMPT, 
  CORRECTION_PROMPT,
  SCHEDULER_PROMPT
} from '@/contexts/QuizContext';

export function QuizApp() {
  const { state, dispatch, callAgent } = useQuiz();
  const { toast } = useToast();
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [showUnderstandingPrompt, setShowUnderstandingPrompt] = useState(true);
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(false);
  const [showDepthCheck, setShowDepthCheck] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  const handleUnderstandingResponse = async (understood: boolean) => {
    dispatch({ type: 'SET_UNDERSTOOD', payload: understood });
    if (!understood) {
      const response = await callAgent(
        'Comprehension',
        COMPREHENSION_PROMPT,
        `Question: "${state.currentQuestion.question}"\nOptions: ${state.currentQuestion.options.join(', ')}`
      );
      setAgentResponse(response);
    }
    setShowUnderstandingPrompt(false);
  };

  const handleOptionSelect = async (value: string) => {
    dispatch({ type: 'SET_SELECTED_OPTION', payload: value });
    setShowConfidencePrompt(true);
    setAgentResponse('');
  };

  const handleConfidenceSelect = async (confidence: 'High' | 'Medium' | 'Low') => {
    dispatch({ type: 'SET_CONFIDENCE', payload: confidence });
    setShowConfidencePrompt(false);
    setShowDepthCheck(true);
    
    const response = await callAgent(
      'DepthChecker',
      DEPTH_CHECKER_PROMPT,
      `The student selected ${state.selectedOption} with ${confidence} confidence.`
    );
    setAgentResponse(response);
  };

  const handleDepthCheck = async (thorough: boolean) => {
    const depthCheckResult = thorough ? 'Thorough' : 'Needs Review';
    dispatch({ type: 'SET_DEPTH_CHECK', payload: depthCheckResult });
    setShowDepthCheck(false);

    if (depthCheckResult === 'Thorough') {
      // Check if answer is correct
      const isCorrect = state.selectedOption === state.currentQuestion.answer;
      dispatch({ type: 'SET_OUTCOME', payload: isCorrect ? 'Correct' : 'Incorrect' });

      if (!isCorrect) {
        const response = await callAgent(
          'Correction',
          CORRECTION_PROMPT,
          `The student selected ${state.selectedOption} but the correct answer is ${state.currentQuestion.answer}`
        );
        setAgentResponse(response);
      }
      setShowReflection(true);
    } else {
      setShowUnderstandingPrompt(true);
    }
  };

  const handleReflection = async (reflection: string) => {
    dispatch({ type: 'SET_REFLECTION', payload: reflection });
    setShowReflection(false);
    setShowScheduler(true);

    const response = await callAgent(
      'Scheduler',
      SCHEDULER_PROMPT,
      `Outcome: ${state.outcome}, Confidence: ${state.confidence}`
    );
    setAgentResponse(response);
  };

  const handleSchedulerResponse = async (mode: string) => {
    const days = state.outcome === 'Incorrect' || state.confidence === 'Low' ? 1 : 7;
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + days);

    dispatch({
      type: 'SET_REVIEW_SCHEDULE',
      payload: {
        concept: state.currentQuestion.question,
        reviewDate: reviewDate.toISOString().split('T')[0],
        mode
      }
    });

    dispatch({ type: 'NEXT_QUESTION' });
    setShowScheduler(false);
    setShowUnderstandingPrompt(true);
    setAgentResponse('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Question {state.currentIndex + 1} of {state.questions.length}
            </h2>
            <p className="text-gray-600 mt-2">{state.currentQuestion.question}</p>
          </div>

          {agentResponse && (
            <div className="mb-4 p-4 bg-blue-50 rounded-md">
              <p className="text-blue-800">{agentResponse}</p>
            </div>
          )}

          {showUnderstandingPrompt && (
            <div className="mb-4">
              <p className="mb-2">Do you understand the question and all options?</p>
              <div className="space-x-2">
                <Button onClick={() => handleUnderstandingResponse(true)}>Yes</Button>
                <Button variant="outline" onClick={() => handleUnderstandingResponse(false)}>No</Button>
              </div>
            </div>
          )}

          {!showUnderstandingPrompt && !showConfidencePrompt && !showDepthCheck && !showReflection && !showScheduler && (
            <RadioGroup
              onValueChange={handleOptionSelect}
              value={state.selectedOption}
              className="space-y-3"
            >
              {state.currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={String.fromCharCode(65 + index)} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {showConfidencePrompt && (
            <div className="space-y-2">
              <h3 className="font-semibold">How confident are you about your answer?</h3>
              <div className="space-x-2">
                <Button onClick={() => handleConfidenceSelect('High')}>Very Sure</Button>
                <Button onClick={() => handleConfidenceSelect('Medium')}>Kinda Sure</Button>
                <Button onClick={() => handleConfidenceSelect('Low')}>Just Guessed</Button>
              </div>
            </div>
          )}

          {showDepthCheck && (
            <div className="space-y-2">
              <h3 className="font-semibold">Did you thoroughly review all options?</h3>
              <div className="space-x-2">
                <Button onClick={() => handleDepthCheck(true)}>Yes, thoroughly</Button>
                <Button variant="outline" onClick={() => handleDepthCheck(false)}>Need another look</Button>
              </div>
            </div>
          )}

          {showReflection && (
            <div className="space-y-2">
              <h3 className="font-semibold">What helped you arrive at your answer?</h3>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                onBlur={(e) => handleReflection(e.target.value)}
              />
            </div>
          )}

          {showScheduler && (
            <div className="space-y-2">
              <h3 className="font-semibold">How would you like to receive your review reminder?</h3>
              <div className="space-x-2">
                <Button onClick={() => handleSchedulerResponse('Email')}>Email</Button>
                <Button onClick={() => handleSchedulerResponse('WhatsApp')}>WhatsApp</Button>
                <Button onClick={() => handleSchedulerResponse('In-App')}>In-App</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
