
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface StudentResponse {
  questionIndex: number;
  question: string;
  selected: string;
  correct: string;
  outcome: 'Correct' | 'Incorrect';
  confidence: 'High' | 'Medium' | 'Low';
  reflection: string;
  reviewSchedule?: {
    concept: string;
    reviewDate: string;
    mode: string;
  };
}

export interface QuizState {
  topic: string;
  questions: QuizQuestion[];
  currentIndex: number;
  currentQuestion: QuizQuestion;
  studentResponses: StudentResponse[];
  sessionLog: {
    timestamp: string;
    agent: string;
    message: string;
  }[];
  understood?: boolean;
  selectedOption?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  depthCheck?: 'Thorough' | 'Needs Review';
  outcome?: 'Correct' | 'Incorrect';
  reflection?: string;
  reviewSchedule?: {
    concept: string;
    reviewDate: string;
    mode: string;
  };
}
