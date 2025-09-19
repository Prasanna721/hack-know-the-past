import { GoogleGenAI, Type } from "@google/genai";
import { historicalPlaceSchema } from "./geminiService";
import type { HistoricalPlace } from "../types";

// Reuse the same API key convention as geminiService
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey });

export type SuggestionItem = {
  suggestion: string;
  historicalPlaceSchema: HistoricalPlace; // named as requested
};

// Schema for an array of suggestions each with text and a HistoricalPlace payload
const suggestionItemSchema = {
  type: Type.OBJECT,
  properties: {
    suggestion: {
      type: Type.STRING,
      description: "Short query-like suggestion text the user can click.",
    },
    historicalPlaceSchema: historicalPlaceSchema,
  },
  required: ["suggestion", "historicalPlaceSchema"],
};

const suggestionsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: suggestionItemSchema,
    },
  },
  required: ["suggestions"],
};

/**
 * getSearchSuggestions
 * Input: free-form search text (event or place)
 * Output: Array of { suggestion: string, historicalPlaceSchema: HistoricalPlace }
 * Notes:
 * - If the query is an event, map it to a representative physical location with a valid Google Place ID.
 * - Prefer unique, globally interesting places; avoid overused examples unless user explicitly asks.
 */
export async function getSearchSuggestions(
  searchText: string
): Promise<SuggestionItem[]> {
  const trimmed = (searchText || "").trim();
  if (!trimmed) return [];

  const prompt = `You are a search suggestions agent for an immersive learning app, "Know the Past".
User typed: "${trimmed}".

Return 3–7 high-quality suggestion items. Each item must include:
- suggestion: a concise, clickable text (<= 8 words) that refines the user's query
- historicalPlaceSchema: a fully populated place object following THIS schema:
  ${JSON.stringify(historicalPlaceSchema)}

CRITICAL RULES:
1) Always provide a valid Google Place ID (placeId) for the location.
2) locationType is either 'point' (single site/monument) or 'area' (city/park/region). Use the right type.
3) Include latitude, longitude, zoom_level (15–22 for points; for areas choose a reasonable overview if needed).
4) details: 2–4 tailored facts with labels and icons from ['calendar','globe','geology','architecture','growth','time','sparkles'].
   Always include one 'globe' detail showing the country.
5) Avoid overused examples (e.g., Giza pyramids, Great Wall, Eiffel Tower) unless explicitly in the query.
6) If the query is an event (e.g., a battle, discovery, or period), choose a representative physical location tied to that event (battlefield, city center, excavation site, museum, etc.).
7) Suggestions should mix places and event-linked places where relevant, with geographic diversity.


Return strictly as JSON matching the response schema.`;

  try {
    const llamaMod = await import("llamaindex");
    const geminiMod = await import("@llamaindex/google");
    const GeminiCtor = (geminiMod as any).Gemini;

    const llm = new GeminiCtor({
      apiKey,
      model: "gemini-2.5-flash",
    });

    // Create a simple ReAct agent with a strong system prompt
    const ReActAgent = (llamaMod as any).ReActAgent;
    const agent = ReActAgent.fromTools([], {
      llm,
      systemPrompt:
        "You generate short search suggestions with structured JSON results.",
    });
    
    const result = await agent.chat({ message: prompt });
    const text: string = (result?.message?.content ?? result?.response ?? "")
      .toString()
      .trim();
      
    if (!text) throw new Error("Empty response from LlamaIndex agent");

    const data = JSON.parse(text) as { suggestions: SuggestionItem[] };
    postProcessCategories(data);
    return data.suggestions;
  } catch (error) {
    console.error("Error with LlamaIndex agent:", error);
    throw error;
  }
}

function postProcessCategories(data: { suggestions: SuggestionItem[] }) {
  for (const item of data.suggestions) {
    const hp = item.historicalPlaceSchema as HistoricalPlace & {
      category?: string;
    };
    if (!hp.category) {
      const desc = (hp.description || "").toLowerCase();
      let category: string = "time";
      if (
        /reef|fjords|glacier|volcano|desert|canyon|karst|dune|geyser|basalt|limestone/.test(
          desc
        )
      )
        category = "nature";
      else if (
        /empire|dynasty|ancient|temple|ruins|roman|greek|mayan|aztec|maurya|feudal/.test(
          desc
        )
      )
        category = "ancient";
      else if (
        /trade|port|republic|commerce|industrial|growth|boom|expansion|urban/.test(
          desc
        )
      )
        category = "growth";
      hp.category = category as any;
    }
  }
}
