import axios from "axios";

interface Message {
  role: string;
  content: string;
}

export async function getGroqCompletion(
  systemMessage: string,
  messages: Message[]
): Promise<string> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY || "";
    
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192", // Using Llama 3 model
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          ...messages,
        ],
        temperature: 0.6, // Slightly lower temperature for more focused responses
        max_tokens: 800, // Reduced max tokens to encourage conciseness
        top_p: 0.9, // More focused sampling
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error("Invalid response format from Groq API");
    }
  } catch (error) {
    console.error("Error calling Groq API:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Groq API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error("Failed to get completion from Groq");
  }
}
