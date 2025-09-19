import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { HistoricalPlace, Slide } from '../types';

// This assumes the API_KEY is available as an environment variable.
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey });

const historicalPlaceSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Official name of the place." },
        description: { type: Type.STRING, description: "A concise and engaging 1-2 sentence description, focusing on its core identity." },
        latitude: { type: Type.NUMBER },
        longitude: { type: Type.NUMBER },
        zoom_level: { type: Type.INTEGER, description: "Zoom level between 15 and 22. This is for 'point' locations." },
        locationType: { type: Type.STRING, enum: ['point', 'area'], description: "'point' for a specific monument/building, 'area' for a city, park, or country." },
        placeId: { type: Type.STRING, description: "The official Google Place ID for this location. This is crucial." },
        details: {
            type: Type.ARRAY,
            description: "An array of 2-4 key details tailored to the place's category.",
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "Custom label for the detail (e.g., 'Geological Age', 'Era')." },
                    value: { type: Type.STRING, description: "The specific fact or data for the label." },
                    icon: { type: Type.STRING, description: "An icon name from the allowed list: 'calendar', 'globe', 'geology', 'architecture', 'growth', 'time', 'sparkles'." }
                },
                required: ["label", "value", "icon"]
            }
        }
    },
    required: ["name", "description", "latitude", "longitude", "zoom_level", "locationType", "placeId", "details"]
};

const visualSlidesSchema = {
    type: Type.OBJECT,
    properties: {
        slides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    slide_type: { type: Type.STRING, enum: ['overview', 'historical_timeline', 'cultural_context', 'then_vs_now', 'architectural_details'] },
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                    image_prompt: { type: Type.STRING },
                },
                required: ["slide_type", "title", "subtitle", "key_points", "image_prompt"]
            }
        }
    },
    required: ["slides"]
};


export const fetchHistoricalPlace = async (category: string): Promise<HistoricalPlace> => {
    let categorySpecificInstructions = '';
    switch (category) {
        case 'ancient':
            categorySpecificInstructions = "For 'Ancient', focus on diverse civilizations. Find a significant monument or site from ancient Greece, the Roman Empire, Feudal Japan, the Mauryan Empire in India, or Mesoamerican cultures like the Maya or Aztec in Mexico. Think beyond the most famous examples.";
            break;
        case 'nature':
            categorySpecificInstructions = "For 'Nature', find a breathtakingly scenic natural wonder. This could be a unique geological formation, a stunning fjord, a vibrant coral reef, or a vast, remote desert. Focus on visual impact and geological uniqueness.";
            break;
        case 'growth':
            categorySpecificInstructions = "For 'Growth', focus on human expansion and commerce. Find a historically significant ancient port city that was a hub of global trade (e.g., on the Silk Road or maritime routes), the capital of a vast ancient empire, or a city that experienced a dramatic and historically important period of rapid development.";
            break;
        case 'time':
            categorySpecificInstructions = "For 'Time', focus on transformation over centuries. Find a location that powerfully illustrates change. This could be a place visibly affected by climate change (like a receding glacier or a changing coastline), or a historic European city center where distinct architectural styles from different eras stand side-by-side, telling a story of its evolution.";
            break;
        default:
            categorySpecificInstructions = `Find a globally significant location for the category '${category}'.`;
    }
    
    const prompt = `You are a world-class historian, geographer, and storyteller. Your goal is to surprise and educate the user with unique, globally significant locations.
    
**CRITICAL INSTRUCTION: AVOID REPETITIVE OR OBVIOUS EXAMPLES** like the Pyramids of Giza, the Great Wall of China, or the Eiffel Tower. Seek out less common but equally fascinating places.

Based on the category '${category}', find a location. ${categorySpecificInstructions}

Your response must follow these rules precisely:
1.  **Determine Location Type:** Is it a specific 'point' (a single monument) or a larger 'area' (a city, park, region)? Set 'locationType' accordingly.
2.  **Provide Google Place ID:** You MUST provide the official Google Place ID for the location in the 'placeId' field. This is non-negotiable.
3.  **Engaging Description:** Write a concise, engaging 1-2 sentence description.
4.  **Tailored Details:** Generate an array of 2 to 4 key details that are *specifically relevant* to this place and its category. Use insightful, custom labels.
5.  **Icons:** For each detail, provide a custom 'label', a 'value', and an 'icon' name from this list: ['calendar', 'globe', 'geology', 'architecture', 'growth', 'time', 'sparkles'].
6.  **Country Detail:** Always include one detail for the location's country using the 'globe' icon.

Example for category 'growth' (Venice - an 'area'):
- locationType: 'area'
- placeId: 'ChIJi7b5IqxdFYwR3a0IuTEb_gU'
- A detail could be { "label": "Maritime Republic", "value": "Dominated Mediterranean trade for centuries", "icon": "growth" }.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: historicalPlaceSchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        
        data.category = category;

        return data as HistoricalPlace;
    } catch (error) {
        console.error("Error fetching data from Gemini API:", error);
        throw new Error("Failed to generate historical place from AI. Please try again.");
    }
};


export const fetchVisualSlides = async (place: HistoricalPlace): Promise<Slide[]> => {
    const prompt = `You are an expert visual educator and historical content creator. Your task is to create engaging, visual-first educational slides about a historical place.

ANALYZE the following place:
- Name: ${place.name}
- Category: ${place.category}
- Description: ${place.description}
- Details: ${JSON.stringify(place.details)}

Based on this, determine what users would be most interested in seeing. Create 1-5 slides (you decide the optimal number) based on what's most compelling about this specific location.

AVAILABLE SLIDE TYPES:
- "overview" - Stunning introduction to the place
- "historical_timeline" - Key events and historical periods
- "cultural_context" - People, customs, daily life of the era
- "then_vs_now" - Historical appearance vs current state
- "architectural_details" - Unique construction, design, engineering marvels

CONTENT STRATEGY:
- For ANCIENT places: Focus on architectural marvels, construction techniques, cultural significance, historical context
- For NATURE places: Focus on geological formation, natural processes, human interaction with landscape, scenic beauty
- For GROWTH places: Focus on transformation over time, urban development, before/after comparisons
- For TIME places: Focus on multiple historical layers, geological time scales, civilization changes

REQUIREMENTS:
- Title: 2-4 words max (punchy, engaging)
- Subtitle: One compelling sentence (8-15 words)
- Key points: Maximum 3 bullet points, each 5-10 words
- Image prompts: HIGHLY DETAILED, specific prompts for AI image generation
- Choose slides that tell the most interesting story about this specific place

DETAILED IMAGE PROMPT GUIDELINES:
- Include specific architectural styles, materials, colors
- Mention historical clothing, people, activities if relevant
- Specify lighting conditions (golden hour, dramatic shadows, etc.)
- Include environmental details (landscape, weather, season)
- Specify camera angle and composition (aerial view, close-up, wide shot)
- Request photorealistic quality with historical accuracy
- Include cultural and geographical context
- Mention specific visual elements that make this place unique`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: visualSlidesSchema,
            },
        });
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.slides as Slide[];
    } catch (error) {
        console.error("Error fetching visual slides from Gemini API:", error);
        throw new Error("Failed to generate visual content. Please try again.");
    }
};


export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    try {
        const promptContent = [
            { text: prompt }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: promptContent,
        });
        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return base64ImageBytes;
                }
            }
        }
        
        throw new Error("No image was generated from the prompt.");
    } catch (error) {
        console.error("Error generating image from Gemini API:", error);
        throw new Error("Failed to generate image.");
    }
};