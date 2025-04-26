
export interface QuizState {
  topic: string;
  questions: { question: string; options: string[]; answer: string; explanation?: string }[];
  currentIndex: number;
  currentQuestion: { question: string; options: string[]; answer: string; explanation?: string };
  studentResponses: {
    questionIndex: number;
    question: string;
    selected: string;
    correct: string;
    outcome: string;
    confidence: string;
    reflection: string;
    reviewSchedule: { concept: string; reviewDate: string; mode: string } | undefined;
  }[];
  selectedOption?: string;
  understood?: boolean;
  confidence?: string;
  depthCheck?: string;
  outcome?: string;
  reflection?: string;
  reviewSchedule?: { concept: string; reviewDate: string; mode: string };
  sessionLog: { timestamp: string; agent: string; message: string }[];
}

export type QuizAction = 
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
