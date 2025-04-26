
import React, { useState } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export function QuizApp() {
  const { state, dispatch } = useQuiz();

  const handleOptionSelect = (value: string) => {
    dispatch({ type: 'SET_SELECTED_OPTION', payload: value });
  };

  const handleConfidenceSelect = (value: 'High' | 'Medium' | 'Low') => {
    dispatch({ type: 'SET_CONFIDENCE', payload: value });
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
