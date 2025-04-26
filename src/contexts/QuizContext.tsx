
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { QuizState } from '@/types/quiz';
import { SAMPLE_MCQS } from '@/data/sampleMCQs';

type QuizAction = 
  | { type: 'SET_TOPIC'; payload: string }
  | { type: 'SET_UNDERSTOOD'; payload: boolean }
  | { type: 'SET_SELECTED_OPTION'; payload: string }
  | { type: 'SET_CONFIDENCE'; payload: 'High' | 'Medium' | 'Low' }
  | { type: 'SET_DEPTH_CHECK'; payload: 'Thorough' | 'Needs Review' }
  | { type: 'SET_OUTCOME'; payload: 'Correct' | 'Incorrect' }
  | { type: 'SET_REFLECTION'; payload: string }
  | { type: 'SET_REVIEW_SCHEDULE'; payload: { concept: string; reviewDate: string; mode: string } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'LOG_INTERACTION'; payload: { agent: string; message: string } };

const initialState: QuizState = {
  topic: '',
  questions: SAMPLE_MCQS,
  currentIndex: 0,
  currentQuestion: SAMPLE_MCQS[0],
  studentResponses: [],
  sessionLog: [],
};

const QuizContext = createContext<{
  state: QuizState;
  dispatch: React.Dispatch<QuizAction>;
} | null>(null);

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_TOPIC':
      return { ...state, topic: action.payload };
    case 'SET_UNDERSTOOD':
      return { ...state, understood: action.payload };
    case 'SET_SELECTED_OPTION':
      return { ...state, selectedOption: action.payload };
    case 'SET_CONFIDENCE':
      return { ...state, confidence: action.payload };
    case 'SET_DEPTH_CHECK':
      return { ...state, depthCheck: action.payload };
    case 'SET_OUTCOME':
      return { ...state, outcome: action.payload };
    case 'SET_REFLECTION':
      return { ...state, reflection: action.payload };
    case 'SET_REVIEW_SCHEDULE':
      return { ...state, reviewSchedule: action.payload };
    case 'LOG_INTERACTION':
      return {
        ...state,
        sessionLog: [
          ...state.sessionLog,
          {
            timestamp: new Date().toLocaleTimeString(),
            agent: action.payload.agent,
            message: action.payload.message,
          },
        ],
      };
    case 'NEXT_QUESTION':
      const newIndex = state.currentIndex + 1;
      const studentResponse = {
        questionIndex: state.currentIndex,
        question: state.currentQuestion.question,
        selected: state.selectedOption!,
        correct: state.currentQuestion.answer,
        outcome: state.outcome!,
        confidence: state.confidence!,
        reflection: state.reflection || '',
        reviewSchedule: state.reviewSchedule,
      };
      return {
        ...state,
        currentIndex: newIndex,
        currentQuestion: state.questions[newIndex],
        studentResponses: [...state.studentResponses, studentResponse],
        selectedOption: undefined,
        confidence: undefined,
        depthCheck: undefined,
        outcome: undefined,
        reflection: undefined,
        reviewSchedule: undefined,
      };
    default:
      return state;
  }
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  return (
    <QuizContext.Provider value={{ state, dispatch }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
