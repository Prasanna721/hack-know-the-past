import { GoogleGenAI, Type } from "@google/genai";
import { historicalPlaceSchema } from "./geminiService";
import type { HistoricalPlace } from "../types";

// API keys
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey });

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

export type SuggestionItem = {
  suggestion: string;
  historicalPlaceSchema: HistoricalPlace; // named as requested
};

/**
 * getSearchSuggestions
 * Input: free-form search text (event or place)
 * Output: Array of { suggestion: string, historicalPlaceSchema: HistoricalPlace }
 * Notes:
 * - If the query is an event, map it to a representative physical location with a valid Google Place ID.
 * - Prefer unique, globally interesting places; avoid overused examples unless user explicitly asks.
 */
// Core search logic without tracing
const searchSuggestionsCore = async (
  searchText: string
): Promise<SuggestionItem[]> => {
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
    // Use direct Gemini API with structured output (working approach)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestionsResponseSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText) as { suggestions: SuggestionItem[] };
    postProcessCategories(data);
    return data.suggestions;
  } catch (error) {
    console.error("Error with search suggestions:", error);
    throw error;
  }
};

export async function getSearchSuggestions(
  searchText: string
): Promise<SuggestionItem[]> {
  return await searchSuggestionsCore(searchText);
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
