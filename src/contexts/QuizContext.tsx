import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { QuizState, QuizAction } from '@/types/quiz';
import { SAMPLE_MCQS } from '@/data/sampleMCQs';
import { callLLMAgent } from '@/services/llmService';
import { generateQuizQuestions } from '@/services/quizService';

// Agent Prompts
export const COMPREHENSION_PROMPT = `You are the Comprehension Agent. Your job is to:
1. Rephrase the question in simpler words.
2. Confirm the student's understanding.
3. If not understood, provide an analogy or stepwise logic.
4. Explain each option (A–D) in plain language.
5. Check if the student now understands all options.
6. Contextualize why the question matters.
7. Prompt the student to attempt an answer.

IMPORTANT: Structure your response in clear, separate paragraphs. Each paragraph should address ONE specific aspect of the question or options. This will allow the student to read and understand one piece at a time.

Be conversational, friendly, and encouraging. Your goal is to make the question accessible without giving away the answer.`;

export const CONFIDENCE_PROMPT = `You are the Confidence Agent. Ask the student how sure they feel about their answer in a VERY BRIEF way.

IMPORTANT: Keep your response to ONE SHORT SENTENCE. Just ask for their confidence level using 1 (Very Sure), 2 (Somewhat Sure), or 3 (Just Guessing).

Example good response: "How confident are you in your answer? (1: Very Sure, 2: Somewhat Sure, 3: Just Guessing)"`;

export const DEPTH_CHECKER_PROMPT = `You are the Depth Checker Agent. You ask whether the student:
a) glanced at every option
b) understands what each option means

Be brief but thorough. Help the student ensure they've properly considered all options before submitting.`;

export const CORRECTION_PROMPT = `You are the Correction Agent. Upon an incorrect answer:
1. Gently flag the mistake.
2. Ask a Socratic hint question.
3. Diagnose the confusion type: Guess, Half-logic, or Misconception.
4. Provide an appropriate explanation or visualization.
5. Offer a retry prompt and encouragement.

Be supportive and focus on learning, not the mistake itself.`;

export const REFLECTION_PROMPT = `You are the Reflection Agent. After a correct (or corrected) attempt:
1. Ask what helped them arrive at the right answer.
2. Reinforce the effective strategy.
3. Motivate self-reflection on learning.

Make your response conversational and focused on building good learning habits.`;

export const SCHEDULER_PROMPT = `You are the Scheduler Agent. Based on confidence and correctness:
- If Low confidence or incorrect → schedule in 1 day.
- If High confidence and correct → schedule in 7 days.
Ask for delivery preference, then log the plan.

Be brief but encouraging about the follow-up plan.`;

const initialState: QuizState = {
  topic: '',
  questions: SAMPLE_MCQS,
  currentIndex: 0,
  currentQuestion: SAMPLE_MCQS[0],
  studentResponses: [],
  sessionLog: [],
  quizStatus: 'init',
  loadingQuestions: false,
  agentResponse: '',
  processingAgent: false,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_TOPIC':
      return { ...state, topic: action.payload };
    case 'SET_QUESTIONS':
      return { 
        ...state, 
        questions: action.payload,
        currentQuestion: action.payload[0] 
      };
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
    case 'SET_REVIEW_MODE':
      return { ...state, reviewMode: action.payload };
    case 'SET_QUIZ_STATUS':
      return { ...state, quizStatus: action.payload };
    case 'SET_LOADING_QUESTIONS':
      return { ...state, loadingQuestions: action.payload };
    case 'SET_AGENT_RESPONSE':
      return { ...state, agentResponse: action.payload };
    case 'SET_PROCESSING_AGENT':
      return { ...state, processingAgent: action.payload };
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
    case 'RESET_QUIZ':
      return {
        ...initialState,
        quizStatus: 'init'
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
        currentQuestion: state.questions[newIndex] || null,
        studentResponses: [...state.studentResponses, studentResponse],
        selectedOption: undefined,
        confidence: undefined,
        depthCheck: undefined,
        outcome: undefined,
        reflection: undefined,
        reviewSchedule: undefined,
        quizStatus: newIndex < state.questions.length ? 'understanding' : 'complete',
        agentResponse: '',
      };
    default:
      return state;
  }
}

// Create the context with proper typing
interface QuizContextType {
  state: QuizState;
  dispatch: React.Dispatch<QuizAction>;
  callAgent: (agentName: string, prompt: string, inputs: string) => Promise<string>;
  fetchQuestions: (topic: string) => Promise<void>;
  checkAnswer: () => void;
  continueToNextStep: () => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  const callAgent = async (agentName: string, prompt: string, inputs: string) => {
    dispatch({ type: 'SET_PROCESSING_AGENT', payload: true });
    const response = await callLLMAgent(agentName, prompt, inputs);
    dispatch({ type: 'SET_AGENT_RESPONSE', payload: response });
    dispatch({ type: 'LOG_INTERACTION', payload: { agent: agentName, message: response } });
    dispatch({ type: 'SET_PROCESSING_AGENT', payload: false });
    return response;
  };

  const fetchQuestions = async (topic: string) => {
    if (!topic.trim()) {
      // Use default questions
      dispatch({ type: 'SET_QUESTIONS', payload: SAMPLE_MCQS });
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'understanding' });
      return;
    }

    dispatch({ type: 'SET_LOADING_QUESTIONS', payload: true });
    try {
      const questions = await generateQuizQuestions(topic);
      if (questions.length > 0) {
        dispatch({ type: 'SET_QUESTIONS', payload: questions });
      } else {
        // Fallback to sample questions if generation fails
        dispatch({ type: 'SET_QUESTIONS', payload: SAMPLE_MCQS });
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      dispatch({ type: 'SET_QUESTIONS', payload: SAMPLE_MCQS });
    }
    dispatch({ type: 'SET_LOADING_QUESTIONS', payload: false });
    dispatch({ type: 'SET_QUIZ_STATUS', payload: 'understanding' });
  };

  const checkAnswer = () => {
    const correct = state.currentQuestion.answer;
    const selected = state.selectedOption;
    
    if (selected === correct) {
      dispatch({ type: 'SET_OUTCOME', payload: 'Correct' });
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'reflection' });
    } else {
      dispatch({ type: 'SET_OUTCOME', payload: 'Incorrect' });
      dispatch({ type: 'SET_QUIZ_STATUS', payload: 'correction' });
    }
  };

  const continueToNextStep = () => {
    const { quizStatus, depthCheck, understood } = state;
    
    switch (quizStatus) {
      case 'understanding':
        if (understood) {
          dispatch({ type: 'SET_QUIZ_STATUS', payload: 'answering' });
        } else {
          dispatch({ type: 'SET_QUIZ_STATUS', payload: 'comprehension' });
        }
        break;
      case 'comprehension':
        dispatch({ type: 'SET_QUIZ_STATUS', payload: 'answering' });
        break;
      case 'answering':
        dispatch({ type: 'SET_QUIZ_STATUS', payload: 'confidence' });
        break;
      case 'confidence':
        dispatch({ type: 'SET_QUIZ_STATUS', payload: 'depthCheck' });
        break;
      case 'depthCheck':
        if (depthCheck?.glanced === 'yes' && depthCheck?.understood === 'yes') {
          dispatch({ type: 'SET_QUIZ_STATUS', payload: 'submission' });
        } else {
          dispatch({ type: 'SET_QUIZ_STATUS', payload: 'comprehension' });
        }
        break;
      case 'submission':
        checkAnswer();
        break;
      case 'correction':
        dispatch({ type: 'SET_QUIZ_STATUS', payload: 'reflection' });
        break;
      case 'reflection':
        dispatch({ type: 'SET_QUIZ_STATUS', payload: 'scheduler' });
        break;
      case 'scheduler':
        dispatch({ type: 'NEXT_QUESTION' });
        break;
    }
  };

  return (
    <QuizContext.Provider value={{ state, dispatch, callAgent, fetchQuestions, checkAnswer, continueToNextStep }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz(): QuizContextType {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
