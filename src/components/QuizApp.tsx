
import React, { useState } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { COMPREHENSION_PROMPT } from '@/contexts/QuizContext';

export function QuizApp() {
  const { state, dispatch, callAgent } = useQuiz();
  const { toast } = useToast();
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [showTopicInput, setShowTopicInput] = useState(true);
  const [showUnderstandingPrompt, setShowUnderstandingPrompt] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(false);
  const [showDepthCheck, setShowDepthCheck] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [reflectionInput, setReflectionInput] = useState('');
  const [depthCheckInput, setDepthCheckInput] = useState({ glanced: '', understood: '' });
  const [confidenceInput, setConfidenceInput] = useState('');

  const handleTopicSubmit = () => {
    if (topicInput.trim()) {
      dispatch({ type: 'SET_TOPIC', payload: topicInput });
      setShowTopicInput(false);
      setShowUnderstandingPrompt(true);
    } else {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your quiz",
        variant: "destructive"
      });
    }
  };

  const handleUnderstandingResponse = async (understood: boolean) => {
    dispatch({ type: 'SET_UNDERSTOOD', payload: understood });
    if (!understood) {
      const response = await callAgent(
        'Comprehension',
        COMPREHENSION_PROMPT,
        `Question: "${state.currentQuestion.question}"\nOptions: ${state.currentQuestion.options.join(', ')}`
      );
      setAgentResponse(response);
    } else {
      setShowOptions(true);
    }
    setShowUnderstandingPrompt(false);
  };

  const handleOptionSelect = async (value: string) => {
    dispatch({ type: 'SET_SELECTED_OPTION', payload: value });
    setShowConfidencePrompt(true);
    setShowOptions(false);
    setAgentResponse('');
  };

  const handleConfidenceSubmit = async () => {
    if (!confidenceInput) {
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
    setShowConfidencePrompt(false);
    setShowDepthCheck(true);
  };

  const handleDepthCheckSubmit = async () => {
    const isThorough = depthCheckInput.glanced.toLowerCase() === 'yes' && 
                      depthCheckInput.understood.toLowerCase() === 'yes';
    dispatch({ type: 'SET_DEPTH_CHECK', payload: isThorough ? 'Thorough' : 'Needs Review' });
    setShowDepthCheck(false);

    if (!isThorough) {
      setShowUnderstandingPrompt(true);
    } else {
      setShowReflection(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          {showTopicInput && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Welcome to the Interactive Quiz Agent!</h2>
              <div className="space-y-2">
                <Label htmlFor="topic">Enter a topic for your quiz:</Label>
                <Input
                  id="topic"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Enter your topic"
                  className="mb-2"
                />
                <Button onClick={handleTopicSubmit}>Start Quiz</Button>
              </div>
            </div>
          )}

          {!showTopicInput && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold">
                  Question {state.currentIndex + 1} of {state.questions.length}
                </h2>
                <p className="text-gray-600 mt-2">{state.currentQuestion.question}</p>
              </div>

              {agentResponse && (
                <div className="mb-4 p-4 bg-blue-50 rounded-md">
                  <p className="text-blue-800 whitespace-pre-line">{agentResponse}</p>
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

              {showConfidencePrompt && (
                <div className="space-y-4">
                  <Label htmlFor="confidence">How confident are you? (1: Very Sure, 2: Kinda Sure, 3: Just Guessed)</Label>
                  <Input
                    id="confidence"
                    value={confidenceInput}
                    onChange={(e) => setConfidenceInput(e.target.value)}
                    placeholder="Enter 1, 2, or 3"
                    className="mb-2"
                  />
                  <Button onClick={handleConfidenceSubmit}>Submit Confidence</Button>
                </div>
              )}

              {showDepthCheck && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="glanced">Did you glance at all options? (yes/no)</Label>
                    <Input
                      id="glanced"
                      value={depthCheckInput.glanced}
                      onChange={(e) => setDepthCheckInput(prev => ({ ...prev, glanced: e.target.value }))}
                      placeholder="Enter yes or no"
                      className="mb-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="understood">Do you understand what each option means? (yes/no)</Label>
                    <Input
                      id="understood"
                      value={depthCheckInput.understood}
                      onChange={(e) => setDepthCheckInput(prev => ({ ...prev, understood: e.target.value }))}
                      placeholder="Enter yes or no"
                      className="mb-2"
                    />
                  </div>
                  <Button onClick={handleDepthCheckSubmit}>Submit Depth Check</Button>
                </div>
              )}

              {showOptions && (
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
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
