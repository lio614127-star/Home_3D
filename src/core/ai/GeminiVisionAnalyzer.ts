import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { IAIRequest } from '../../types';
import { IAIAnalyzer, IAIDesignIntent } from './types';
import { AIResponseParser } from './AIResponseParser';

export class GeminiVisionAnalyzer implements IAIAnalyzer {
  private genAI: GoogleGenerativeAI;
  private modelName = 'gemini-2.5-flash'; // Trả về bản Flash (dùng cho API key free). Lỗi 503 là do server Google nghẽn mạng, bấm lại vài lần sẽ được.

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not defined in environment variables.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyze(request: IAIRequest): Promise<IAIDesignIntent> {
    console.log(`[GeminiAI] Analyzing image for request ${request.id} using ${this.modelName}...`);

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const systemInstruction = `
You are an architectural design assistant extracting structured parameters for a parametric CAD system from reference images.
Return JSON only.

Primary task: Describe roof semantically (Semantic Model).
Secondary task: Estimate geometric footprint (Geometric Model).

Category: ${request.category}
User request: ${request.prompt || 'Extract architectural details'}

Output schema MUST be exactly like this:
{
  "target": "roof" | "asset" | "garden" | "material",
  "category": "string",
  "confidence": number (between 0 and 1),
  "summary": "string (brief summary in Vietnamese)",
  "parameters": {
    // specific parameters based on the target
  }
}

For "roof" targets, parameters MUST match this structure:
{
  "styleParameters": {
    "style": "japanese" | "thai" | "traditional" | "modern"
  },
  "geometryParameters": {
    "segments": [
      {
        "id": "segment-1",
        
        // --- SEMANTIC LAYER (Primary) ---
        "role": "main_roof" | "entry_roof" | "garage_roof" | "side_roof" | "porch_roof" | "balcony_roof" | "canopy_roof",
        "position": {
          "side": "front" | "back" | "left" | "right" | "center",
          "horizontal": "left" | "center" | "right" // optional
        },
        "alignment": "flush" | "inside" | "overhang",
        "style": "string (e.g. japanese_modern)",
        "material": "string (e.g. ceramic_tile)",
        "color": "string (e.g. dark_grey, blue)",
        "pitch": number (e.g. 30),
        "overhang": number (e.g. 0.6),
        "confidence": number (0 to 1),
        "source": "vision" | "inferred",
        "roofType": "hip" | "gable" | "flat",
        
        // --- GEOMETRIC LAYER (Secondary) ---
        "relativeFootprint": {
          "centerX": number (-1 to 1, 0 is center of building),
          "centerZ": number (-1 to 1, 0 is center of building),
          "widthRatio": number (0 to 1, relative to building width),
          "depthRatio": number (0 to 1, relative to building depth)
        },
        "relativeHeight": number (e.g. 0.5 for 1.5m, 1 for 3m)
      }
    ]
  },
  "materialParameters": {
    "material": "tile" | "metal" | "concrete",
    "color": "brown" | "red" | "dark_grey" | "grey"
  }
}

Important:
1. Decompose complex roofs into segments (e.g., main roof vs entry roof).
2. Semantic fields (role, position, alignment, style, material, color) are crucial. Be as descriptive as an architect.
3. Use "source": "vision" if you clearly see it, or "inferred" if you guess it.
4. "relativeFootprint" helps position the segment relative to the main building bounding box. Even though semantic is primary, try your best to estimate these.
`;

      const promptPart = { text: systemInstruction };
      const parts: Part[] = [promptPart];

      if (request.imageDataUrl) {
        // Assume request.imageDataUrl is a base64 data URL: data:image/jpeg;base64,...
        const mimeTypeMatch = request.imageDataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        const base64Data = request.imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType
          }
        });
      } else {
        throw new Error("No image URL provided for analysis.");
      }

      const result = await model.generateContent(parts);
      const responseText = result.response.text();
      
      console.log("[GeminiAI] Raw response:", responseText);

      return AIResponseParser.parse(responseText, request.id);

    } catch (e) {
      console.error("[GeminiAI] Failed to analyze:", e);
      throw e;
    }
  }
}
