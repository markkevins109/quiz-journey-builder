
import { QuizProvider } from '@/contexts/QuizContext';
import { QuizApp } from '@/components/QuizApp';

const Index = () => {
  return (
    <QuizProvider>
      <QuizApp />
    </QuizProvider>
  );
};

export default Index;
