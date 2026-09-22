import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

// Initialize the Gemini API client if the API key is available
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Generates a deterministic 768-dimensional unit vector from a string.
 * Used for RAG retrieval testing in local offline development mode.
 */
function getMockEmbedding(text: string): number[] {
  const vector: number[] = new Array(768);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Seed a simple LCG pseudo-random generator
  let seed = Math.abs(hash) || 1;
  let sumSq = 0;
  for (let i = 0; i < 768; i++) {
    // LCG: X_{n+1} = (a * X_n + c) % m
    seed = (seed * 9301 + 49297) % 233280;
    const val = (seed / 233280) - 0.5;
    vector[i] = val;
    sumSq += val * val;
  }
  
  // Normalize to unit length
  const magnitude = Math.sqrt(sumSq);
  for (let i = 0; i < 768; i++) {
    vector[i] /= magnitude;
  }
  return vector;
}

/**
 * Generates a simulated response summarizing retrieved RAG context
 * when running in local offline demo mode.
 */
function generateMockResponse(query: string, systemInstruction: string): string {
  // Extract TRUSTED CONTEXT block
  const contextMarker = "TRUSTED CONTEXT AVAILABLE:";
  const markerIdx = systemInstruction.indexOf(contextMarker);
  let retrievedContext = "";
  if (markerIdx !== -1) {
    retrievedContext = systemInstruction.substring(markerIdx + contextMarker.length).trim();
  }

  const hasContext = retrievedContext && !retrievedContext.startsWith("No specific reference");
  
  let response = `👋 **[GreenTech Offline Demo Mode]**\n\nI am running in local offline demo mode because the \`GEMINI_API_KEY\` environment variable is not configured. However, my RAG search index is active and working!\n\n`;

  if (hasContext) {
    response += `Using my local database search, I found relevant snippets and formulated this response:\n\n`;
    
    // Parse references from the context string
    const references: { num: number; text: string; source: string }[] = [];
    const refRegex = /\[Reference (\d+)\] Source: (.*?)\n"(.*?)"/g;
    let match;
    while ((match = refRegex.exec(retrievedContext)) !== null) {
      references.push({
        num: parseInt(match[1]),
        source: match[2],
        text: match[3],
      });
    }

    if (references.length > 0) {
      response += `According to our guidelines, when evaluating **${query}**: \n\n`;
      references.forEach((ref) => {
        // Summarize or display snippet briefly with citation tag
        const cleanText = ref.text.length > 150 ? ref.text.substring(0, 147) + "..." : ref.text;
        response += `* **From ${ref.source}**: "${cleanText}" [${ref.num}]\n`;
      });
      response += `\nFor production use, add your \`GEMINI_API_KEY\` to a \`.env\` file and rerun \`npm run ingest\` to unlock natural language responses powered by Gemini 1.5 Flash.`;
    } else {
      response += `I found matching text chunks, but was unable to segment them. Here is the raw retrieved context:\n\n${retrievedContext.substring(0, 300)}...`;
    }
  } else {
    response += `No matching document chunks were retrieved for the query: *"${query}"*.\n\nTry asking questions about topics represented in the sample documents, such as:\n1. **"EPEAT Gold ratings"**\n2. **"recycle e-waste in Sri Lanka"**\n3. **"refurbished business laptops vs new consumer models"**`;
  }
  
  return response;
}

/**
 * Generates a 768-dimensional vector embedding for the given text.
 * Falls back to deterministic mock embedding if Gemini API client is not configured.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!genAI) {
    // Graceful fallback to mock embedding for offline demonstration
    return getMockEmbedding(text);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    
    if (result && result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    throw new Error("Invalid embedding response from Gemini API.");
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Formats a chat history into the structure expected by the Gemini SDK.
 */
export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Calls the Gemini model to generate a streaming response.
 * Yields chunk tokens using an async generator.
 */
export async function* generateChatStream(
  systemInstruction: string,
  history: ChatMessage[],
  latestMessage: string
) {
  if (!genAI) {
    // Generate streaming tokens for mock response in offline mode
    const mockResponse = generateMockResponse(latestMessage, systemInstruction);
    const words = mockResponse.split(" ");
    
    for (const word of words) {
      // Small artificial typing delay
      await new Promise((resolve) => setTimeout(resolve, 30));
      yield {
        text: () => word + " ",
      };
    }
    return;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessageStream(latestMessage);
    
    for await (const chunk of result.stream) {
      yield chunk;
    }
  } catch (error) {
    console.error("Error generating chat stream:", error);
    throw error;
  }
}
