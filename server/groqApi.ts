import axios from "axios";

interface Message {
  role: string;
  content: string;
}

/**
 * General purpose Groq completion function
 */
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

/**
 * Specialized function for email categorization that uses a different model and parameters
 * with improved handling for custom categories
 */
export async function getGroqEmailCategorization(
  systemMessage: string,
  messages: Message[]
): Promise<string> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY || "";
    
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    
    // Determine if this is for our special email:category list format
    // by checking if the message contains the format instruction
    const isStandardFormat = messages.some(msg => 
      msg.content && msg.content.includes("Email 1:") && 
      msg.content.includes("Category:") && 
      msg.content.includes("IsCustom:")
    );
    
    // Determine if we're dealing with custom categories
    const hasCustomCategories = messages.some(msg => 
      msg.content && msg.content.includes("IsCustom: YES")
    );
    
    console.log(`Making email categorization request to Groq with ${isStandardFormat ? 'standard text' : 'JSON'} output format`);
    if (hasCustomCategories) {
      console.log("Custom categories detected, using enhanced categorization prompt");
    }
    
    // Create enhanced system message that emphasizes custom categories
    const enhancedSystemMessage = systemMessage + 
      (hasCustomCategories ? 
        " As an email categorization specialist, your primary task is to match emails to user-defined custom categories FIRST. " +
        "Only use default categories when there is absolutely no possible match to any custom category. " +
        "Be permissive with custom category matching - if there's any reasonable connection between the email and a custom category, use that category. " +
        "Look beyond exact keyword matches to find semantic and conceptual relationships. " 
        : "") +
      (isStandardFormat 
        ? "\nRespond with the email categorizations in the specified format." 
        : "\nYou must respond with valid JSON only. No conversation or explanation, only JSON.");
    
    // Prepare the API request
    const apiRequest: any = {
      model: isStandardFormat 
        ? "llama3-8b-8192"    // Better for text format lists
        : "mixtral-8x7b-32768", // Better for JSON structures
      messages: [
        {
          role: "system",
          content: enhancedSystemMessage
        },
        ...messages,
      ],
      temperature: isStandardFormat ? 0.1 : 0.2, // Lower temperature for more predictable output
      max_tokens: 1500, // Increased for more detailed categorization
      top_p: 0.95, // Wider sampling but still focused
    };
    
    // Only add response_format for JSON, not for the text format responses
    if (!isStandardFormat) {
      apiRequest.response_format = { type: "json_object" }; // Force JSON output format
    }
    
    console.log(`Using model: ${apiRequest.model} for email categorization`);
    
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      apiRequest,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log("Received categorization response from Groq");
      
      // Return the raw content (could be JSON or text format)
      return content;
    } else {
      throw new Error("Invalid response format from Groq API");
    }
  } catch (error) {
    console.error("Error calling Groq Email Categorization API:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Groq API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error("Failed to get email categorization from Groq");
  }
}

/**
 * Specialized function just for custom category matching
 * This is optimized for making decisions about custom categories
 */
export async function getGroqCustomCategoryMatch(
  systemMessage: string,
  messages: Message[]
): Promise<string> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY || "";
    
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    
    console.log("Making custom category matching request to Groq");
    
    // Enhance system message to emphasize custom category importance
    const enhancedSystemMessage = systemMessage + 
      " You are a custom categories specialist. Your only job is to match emails to user-defined categories. " +
      "Be permissive in your matching - if an email has ANY relevance to a custom category, match it to that category. " +
      "Never default to general categories unless there is absolutely no match to any custom category. " +
      "Look for implicit connections, semantic similarities, and conceptual relationships beyond exact keyword matches.";
    
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192", // Using Llama 3 for better understanding of match criteria
        messages: [
          {
            role: "system",
            content: enhancedSystemMessage
          },
          ...messages,
        ],
        temperature: 0.1, // Very low temperature for consistent matching decisions
        max_tokens: 500, // Short responses needed
        top_p: 0.95,
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
    console.error("Error calling Groq Custom Category Matching API:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Groq API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error("Failed to get custom category matching from Groq");
  }
}
