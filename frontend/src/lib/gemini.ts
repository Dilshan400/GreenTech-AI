import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const openAIKey = (process.env.OPENAI_API_KEY || "").trim();
let hasLoggedProviderFailure = false;

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

  const normalizedQuery = query.trim().toLowerCase();
  const greetings = new Set([
    "hi",
    "hello",
    "hey",
    "hello there",
    "hi there",
    "good morning",
    "good afternoon",
    "good evening",
  ]);

  if (greetings.has(normalizedQuery)) {
    return "Hello! I am GreenTech Advisor AI. Ask me about sustainable electronics, green buying choices, device longevity, or e-waste handling in Sri Lanka.";
  }

  let response = "";

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
      response += "\nIf you share your budget and priorities, I can also compare practical options for your use case.";
    } else {
      response += `I found matching text chunks, but was unable to segment them. Here is the raw retrieved context:\n\n${retrievedContext.substring(0, 300)}...`;
    }
  } else {
    response += `I could not find a direct match in the indexed documents for "${query}".\n\nTry asking in one of these forms:\n1. "How do EPEAT Gold ratings affect purchase decisions?"\n2. "Where can I recycle e-waste in Sri Lanka?"\n3. "Should I buy refurbished business laptops or new consumer models?"`;
  }

  return response;
}

async function generateOpenAIResponse(
  systemInstruction: string,
  history: ChatMessage[],
  latestMessage: string
): Promise<string> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemInstruction },
  ];

  for (const msg of history) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.parts.map((part) => part.text).join("\n"),
    });
  }

  messages.push({ role: "user", content: latestMessage });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("OpenAI response was missing text content.");
  }

  return text;
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
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
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
  if (!genAI && openAIKey) {
    try {
      const openAIResponse = await generateOpenAIResponse(systemInstruction, history, latestMessage);
      const chunks = openAIResponse.split(/(\s+)/);

      for (const chunk of chunks) {
        if (!chunk) continue;
        yield {
          text: () => chunk,
        };
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("OpenAI API error:", message);
      yield {
        text: () => `⚠️ **OpenAI API Error**: ${message}\n\nPlease check your OpenAI API key and credit balance at [platform.openai.com](https://platform.openai.com/settings/organization/billing).`,
      };
      return;
    }
  }

  if (!genAI) {
    // Generate streaming tokens for fallback mode when no provider key is configured
    const mockResponse = generateMockResponse(latestMessage, systemInstruction);
    const words = mockResponse.split(/(\s+)/);

    for (const word of words) {
      if (!word) continue;
      // Small artificial typing delay
      await new Promise((resolve) => setTimeout(resolve, 30));
      yield {
        text: () => word,
      };
    }
    return;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
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
