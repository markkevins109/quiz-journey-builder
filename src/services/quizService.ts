
import { callLLMAgent } from './llmService';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

const GENERATE_QUESTIONS_PROMPT = `You are a quiz question generator. Create 5 multiple-choice questions (MCQs) on the given topic.
For each question:
1. Provide a clear, concise question
2. Give exactly 4 options (A, B, C, D format)
3. Indicate the correct answer as A, B, C, or D
4. Include a brief explanation of why the answer is correct

Return the questions in this JSON format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "A", 
    "explanation": "Explanation of why A is correct"
  },
  ...
]

Make questions challenging but fair, covering different aspects of the topic.`;

export async function generateQuizQuestions(topic: string): Promise<QuizQuestion[]> {
  try {
    const response = await callLLMAgent(
      "QuestionGenerator", 
      GENERATE_QUESTIONS_PROMPT,
      `Generate 5 multiple-choice questions about: ${topic}`
    );
    
    // Parse the response and extract the JSON
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                     response.match(/\[\s*\{\s*"question"/);
    
    let parsedQuestions: QuizQuestion[] = [];
    
    if (jsonMatch) {
      const jsonContent = jsonMatch[1] ? jsonMatch[1] : response;
      parsedQuestions = JSON.parse(jsonContent);
    } else {
      console.error("Could not parse questions from LLM response");
      return [];
    }
    
    return parsedQuestions;
  } catch (error) {
    console.error("Error generating questions:", error);
    return [];
  }
}
