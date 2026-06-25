import { IAIDesignIntent } from './types';

export class AIResponseParser {
  static parse(jsonString: string, requestId: string): IAIDesignIntent {
    try {
      // Sometimes LLMs return markdown code blocks, strip them out
      const cleanJsonStr = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJsonStr);

      // Validate core fields
      if (!parsed.target || typeof parsed.target !== 'string') {
        throw new Error('Missing or invalid "target" field in AI response');
      }

      // Basic normalization
      let target = parsed.target.toLowerCase();
      if (!['roof', 'asset', 'garden', 'material'].includes(target)) {
        target = 'unknown';
      }

      let parameters = parsed.parameters || {};

      // Ensure roof structure matches V2
      if (target === 'roof') {
        if (!parameters.geometryParameters || !parameters.geometryParameters.segments) {
          // Provide a fallback V2 structure if Gemini messed up and returned V1
          const legacyRoofType = parameters.roofType || 'hip';
          const legacyAngle = parameters.angle || 30;
          const legacyColor = parameters.color || 'brown';
          const legacyMaterial = parameters.material || 'tile';
          
          parameters = {
            styleParameters: { style: 'japanese' },
            geometryParameters: {
              segments: [
                {
                  id: 'segment-1',
                  relativeFootprint: { centerX: 0, centerZ: 0, widthRatio: 1, depthRatio: 1 },
                  relativeHeight: 1,
                  roofType: legacyRoofType,
                  angle: legacyAngle
                }
              ]
            },
            materialParameters: {
              material: legacyMaterial,
              color: legacyColor
            }
          };
        }
      }

      return {
        version: "2.0",
        requestId,
        category: parsed.category || 'unknown',
        target: target as any,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        summary: parsed.summary || 'Phân tích từ AI (Gemini)',
        parameters
      };
    } catch (e) {
      console.error('[AIResponseParser] Failed to parse JSON from AI:', e);
      throw new Error('AI response is not valid JSON or missing required fields.');
    }
  }
}
