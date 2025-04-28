
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
    console.log(`Generating questions for topic: ${topic}`);
    const response = await callLLMAgent(
      "QuestionGenerator", 
      GENERATE_QUESTIONS_PROMPT,
      `Generate 5 multiple-choice questions about: ${topic}`
    );
    
    console.log("LLM response received:", response.substring(0, 100) + "...");
    
    // Try various regex patterns to extract JSON
    let jsonContent = '';
    
    // Find JSON between triple backticks
    const jsonMatch = response.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1];
      console.log("Found JSON between backticks");
    }
    // Find array starting with [ and ending with ]
    else if (response.includes('[') && response.includes(']')) {
      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']') + 1;
      if (startIndex < endIndex) {
        jsonContent = response.substring(startIndex, endIndex);
        console.log("Found JSON array with brackets");
      }
    }
    
    if (!jsonContent) {
      console.error("Could not extract JSON from LLM response");
      return [];
    }
    
    try {
      console.log("Attempting to parse JSON");
      const parsedQuestions: QuizQuestion[] = JSON.parse(jsonContent);
      console.log(`Successfully parsed ${parsedQuestions.length} questions`);
      
      // Validate the format of each question
      const validQuestions = parsedQuestions.filter(q => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        q.answer && 
        ['A', 'B', 'C', 'D'].includes(q.answer)
      );
      
      if (validQuestions.length < parsedQuestions.length) {
        console.warn(`Filtered out ${parsedQuestions.length - validQuestions.length} invalid questions`);
      }
      
      return validQuestions;
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    return [];
  }
}
