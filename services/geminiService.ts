import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryScene } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the schema for the story output to ensure structured JSON
const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short title for the current scene or chapter." },
    backgroundDescription: { type: Type.STRING, description: "Visual description of the setting." },
    backgroundKeyword: { type: Type.STRING, description: "A single English keyword to find a stock photo (e.g., 'forest', 'cyberpunk', 'school')." },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          color: { type: Type.STRING, description: "A hex color code representing the character (e.g., #FF5733)." },
          expression: { type: Type.STRING, description: "Facial expression description." },
          position: { type: Type.STRING, enum: ["left", "center", "right"] }
        }
      }
    },
    dialogue: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING, description: "Name of the speaker. Use 'Narrator' for descriptive text." },
          text: { type: Type.STRING },
          emotion: { type: Type.STRING }
        }
      }
    },
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "The text displayed on the button." },
          intent: { type: Type.STRING, description: "A short summary of what this choice implies for the plot." }
        }
      }
    }
  },
  required: ["backgroundKeyword", "dialogue", "choices"]
};

export const generateStoryStart = async (premise: string): Promise<StoryScene> => {
  const prompt = `
    You are an advanced Visual Novel Story Engine. 
    Start a new story based on this premise: "${premise}".
    
    Create an engaging opening scene. 
    - If the premise is empty, invent a creative Sci-Fi or Fantasy setting.
    - Include 1-2 characters introducing themselves or the conflict.
    - Provide 2-4 distinct choices for the player to continue the story.
    - Format the output strictly as JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 1.0, // High creativity
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as StoryScene;
  } catch (error) {
    console.error("Error generating story start:", error);
    throw error;
  }
};

export const generateNextScene = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  choiceIntent: string
): Promise<StoryScene> => {
  
  // We construct a prompt that includes the user's choice
  const nextPrompt = `The player chose: "${choiceIntent}". Continue the story based on this choice. Advance the plot, develop characters, and end with new choices.`;

  try {
    // We send the chat history + the new prompt
    // Note: For a stateless REST feel, we might just send the summary, but here we pass history structure
    // However, since we need to enforce JSON schema on *every* turn, we use generateContent with the history included as 'contents' if possible, 
    // or we manage the prompt manually. 
    
    // To simplify for this demo and ensure Schema compliance (which is easiest with generateContent), 
    // we will serialize the relevant history context into the prompt or use a sliding window if it gets too long.
    // Ideally, we'd use chat.sendMessage, but enforcing Schema on chat is also supported in newer SDKs.
    // Let's use generateContent with a constructed prompt containing context for robustness.

    const context = history.slice(-4).map(h => `${h.role}: ${h.parts[0].text}`).join('\n');

    const fullPrompt = `
      Context of the story so far:
      ${context}

      Current Action:
      ${nextPrompt}

      Generate the next scene in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.9,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as StoryScene;

  } catch (error) {
    console.error("Error continuing story:", error);
    throw error;
  }
};

export const generateAIBackground = async (description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Anime style visual novel background, high quality, masterpiece, ${description}`,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg'
      }
    });
    
    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
      return `data:image/jpeg;base64,${base64}`;
    }
    return null;
  } catch (e) {
    console.warn("Image generation failed (likely due to safety or quota), falling back to placeholder.", e);
    return null;
  }
}