import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CropRecommendation {
  cropName: string;
  allocationPercentage: number;
  duration: string;
  expectedYield: string;
  profitEstimate: string;
  riskScore: number;
  reasoning: string;
  color: string; // Hex color code
}

export interface RecommendationResponse {
  crops: CropRecommendation[];
  overallRisk: string;
  totalExpectedProfit: string;
  summary: string;
  distributionAdvice?: string;
}

export async function getCropRecommendations(inputs: {
  landSize: number;
  location: string;
  soilType: string;
  pH?: number;
  npk?: { n: number; p: number; k: number };
  waterAvailability: string;
  riskPreference: string;
  droneView?: string; // Base64 string or Static Map URL
  polygonPath?: { lat: number; lng: number }[];
}): Promise<RecommendationResponse> {
  const prompt = `
    As an expert agricultural AI assistant, provide crop recommendations for a farmer with the following conditions:
    - Land Size: ${inputs.landSize} acres
    - Location: ${inputs.location}
    - Soil Type: ${inputs.soilType}
    - pH: ${inputs.pH || "Not provided"}
    - NPK: ${inputs.npk ? `N:${inputs.npk.n}, P:${inputs.npk.p}, K:${inputs.npk.k}` : "Not provided"}
    - Water Availability: ${inputs.waterAvailability}
    - Risk Preference: ${inputs.riskPreference}

    ${inputs.polygonPath ? `The farm boundary coordinates are: ${JSON.stringify(inputs.polygonPath)}. Please use this geometry to suggest how the crops should be distributed across the land (e.g., "Plant Crop A in the northern section", "Crop B along the western boundary").` : ""}

    ${inputs.droneView && !inputs.droneView.startsWith('http') ? "I have also provided a drone view image of the land. Please analyze the terrain, existing vegetation, and land shape from the image to refine the land allocation and crop choices." : ""}
    ${inputs.droneView && inputs.droneView.startsWith('http') ? "I have also provided a satellite map image of the land boundary. Please analyze the shape and orientation to refine the land allocation and crop choices." : ""}

    Consider current weather patterns and market price trends.
    
    CRITICAL: Use the Google Search tool to find the CURRENT live market prices and seasonal trends for crops in ${inputs.location} for the current date (${new Date().toLocaleDateString()}). Ensure the profit estimates are based on these real-time values.
    Provide a detailed intercropping plan with 3-5 crops.
    For each crop, include:
    - Name
    - Land allocation percentage (total must be 100%)
    - Growth duration
    - Expected yield per acre
    - Profit estimate (range)
    - Risk score (1-10)
    - Reasoning ("Why this crop?")
    - A distinct color hex code (e.g., #10b981) to represent this crop in a land allocation map.

    Also provide an overall summary and total expected profit.
    If a polygon path or drone view was provided, include a "distributionAdvice" field explaining how to distribute the crops across the specific land geometry.
  `;

  const contents: any[] = [{ text: prompt }];
  if (inputs.droneView && !inputs.droneView.startsWith('http')) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: inputs.droneView.split(',')[1] || inputs.droneView,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: contents },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          crops: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                cropName: { type: Type.STRING },
                allocationPercentage: { type: Type.NUMBER },
                duration: { type: Type.STRING },
                expectedYield: { type: Type.STRING },
                profitEstimate: { type: Type.STRING },
                riskScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
                color: { type: Type.STRING },
              },
              required: ["cropName", "allocationPercentage", "duration", "expectedYield", "profitEstimate", "riskScore", "reasoning", "color"],
            },
          },
          overallRisk: { type: Type.STRING },
          totalExpectedProfit: { type: Type.STRING },
          summary: { type: Type.STRING },
          distributionAdvice: { type: Type.STRING },
        },
        required: ["crops", "overallRisk", "totalExpectedProfit", "summary"],
      },
    },
  });

  return JSON.parse(response.text);
}
