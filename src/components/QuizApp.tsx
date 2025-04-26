
import React, { useState } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export function QuizApp() {
  const { state, dispatch } = useQuiz();
  const [topicInput, setTopicInput] = useState('');

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_TOPIC', payload: topicInput });
  };

  const handleOptionSelect = (value: string) => {
    dispatch({ type: 'SET_SELECTED_OPTION', payload: value });
  };

  const handleConfidenceSelect = (value: 'High' | 'Medium' | 'Low') => {
    dispatch({ type: 'SET_CONFIDENCE', payload: value });
  };

  if (!state.topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Interactive Quiz Agent</h1>
          <form onSubmit={handleTopicSubmit} className="space-y-4">
            <div>
              <Label htmlFor="topic">Enter a topic for your quiz:</Label>
              <Input
                id="topic"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., Science, History, Math"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full">Start Quiz</Button>
          </form>
        </Card>
      </div>
    );
  }

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

          {state.selectedOption && !state.confidence && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">How confident are you?</h3>
              <div className="space-x-3">
                <Button
                  onClick={() => handleConfidenceSelect('High')}
                  variant="outline"
                >
                  Very Sure
                </Button>
                <Button
                  onClick={() => handleConfidenceSelect('Medium')}
                  variant="outline"
                >
                  Kinda Sure
                </Button>
                <Button
                  onClick={() => handleConfidenceSelect('Low')}
                  variant="outline"
                >
                  Just Guessed
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
