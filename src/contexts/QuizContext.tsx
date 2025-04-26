
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { QuizState } from '@/types/quiz';
import { SAMPLE_MCQS } from '@/data/sampleMCQs';
import { callLLMAgent } from '@/services/llmService';

// Agent Prompts
const COMPREHENSION_PROMPT = `You are the Comprehension Agent. Your job is to:
1. Rephrase the question in simpler words.
2. Confirm the student's understanding.
3. If not understood, provide an analogy or stepwise logic.
4. Explain each option (A–D) in plain language.
5. Check if the student now understands all options.
6. Contextualize why the question matters.
7. Prompt the student to attempt an answer.

Be conversational, friendly, and encouraging. Your goal is to make the question accessible without giving away the answer.`;

const CONFIDENCE_PROMPT = `You are the Confidence Agent. You ask the student how sure they feel
about their upcoming answer and map it to a confidence level.

Be brief but encouraging. Help the student reflect on their confidence honestly.`;

const DEPTH_CHECKER_PROMPT = `You are the Depth Checker Agent. You ask whether the student:
a) glanced at every option
b) understands what each option means

Be brief but thorough. Help the student ensure they've properly considered all options before submitting.`;

const CORRECTION_PROMPT = `You are the Correction Agent. Upon an incorrect answer:
1. Gently flag the mistake.
2. Ask a Socratic hint question.
3. Diagnose the confusion type: Guess, Half-logic, or Misconception.
4. Provide an appropriate explanation or visualization.
5. Offer a retry prompt and encouragement.

Be supportive and focus on learning, not the mistake itself.`;

const REFLECTION_PROMPT = `You are the Reflection Agent. After a correct (or corrected) attempt:
1. Ask what helped them arrive at the right answer.
2. Reinforce the effective strategy.
3. Motivate self-reflection on learning.

Make your response conversational and focused on building good learning habits.`;

const SCHEDULER_PROMPT = `You are the Scheduler Agent. Based on confidence and correctness:
- If Low confidence or incorrect → schedule in 1 day.
- If High confidence and correct → schedule in 7 days.
Ask for delivery preference, then log the plan.

Be brief but encouraging about the follow-up plan.`;

type QuizAction = 
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
  topic: 'General Knowledge',
  questions: SAMPLE_MCQS,
  currentIndex: 0,
  currentQuestion: SAMPLE_MCQS[0],
  studentResponses: [],
  sessionLog: [],
};

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

  const callAgent = async (agentName: string, prompt: string, inputs: string) => {
    const response = await callLLMAgent(agentName, prompt, inputs);
    dispatch({ type: 'LOG_INTERACTION', payload: { agent: agentName, message: response } });
    return response;
  };

  return (
    <QuizContext.Provider value={{ state, dispatch, callAgent }}>
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
