
const GROQ_API_KEY = "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";

export async function callLLMAgent(agentName: string, systemPrompt: string, userInput: string) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Groq API error (${response.status}):`, errorData);
      return `[${agentName} would respond here. LLM call failed: HTTP ${response.status}]`;
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response format from Groq API:', data);
      return `[${agentName} would respond here. Invalid response format]`;
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`Error calling LLM: ${error}`);
    return `[${agentName} would respond here. LLM call failed]`;
  }
}
