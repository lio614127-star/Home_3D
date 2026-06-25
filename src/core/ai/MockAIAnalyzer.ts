import { IAIRequest } from '../../types';
import { IAIAnalyzer, IAIDesignIntent, RoofIntentParams, AssetIntentParams, GardenIntentParams } from './types';

export class MockAIAnalyzer implements IAIAnalyzer {
  async analyze(request: IAIRequest): Promise<IAIDesignIntent> {
    console.log(`[MockAI] Analyzing image for request ${request.id}...`);
    
    // Simulate network delay (1.5s to 3s)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

    const confidence = Math.round((0.8 + Math.random() * 0.19) * 100) / 100; // 0.80 to 0.99

    let target: IAIDesignIntent['target'] = 'unknown';
    let summary = '';
    let parameters: any = {};

    // Very naive mocking based on category name or group
    const cat = request.category.toLowerCase();
    
    if (cat.includes('mái') || cat.includes('roof')) {
      target = 'roof';
      summary = 'Mái Nhật, ngói nâu hiện đại';
      const params: RoofIntentParams = {
        roofType: 'hip', // Japanese roof is often hip
        style: 'japanese',
        material: 'tile',
        color: 'brown',
        angle: 30
      };
      parameters = params;
    } else if (cat.includes('sân') || cat.includes('vườn') || cat.includes('garden')) {
      target = 'garden';
      summary = 'Vườn Nhật, có hồ cá và cây cảnh';
      const params: GardenIntentParams = {
        style: 'japanese',
        objects: ['tree', 'pond', 'stone']
      };
      parameters = params;
    } else {
      // Default to asset
      target = 'asset';
      summary = `Vật dụng nội thất (${request.category}), phong cách hiện đại`;
      const params: AssetIntentParams = {
        style: 'modern',
        material: 'fabric',
        color: 'beige',
        assetHint: 'sofa' // simplistic hint
      };
      if (cat.includes('giường') || cat.includes('bed')) params.assetHint = 'bed';
      if (cat.includes('bàn') || cat.includes('table')) params.assetHint = 'table';
      if (cat.includes('ghế') || cat.includes('chair')) params.assetHint = 'chair';
      if (cat.includes('cột') || cat.includes('column')) params.assetHint = 'column';
      if (cat.includes('cây') || cat.includes('tree')) params.assetHint = 'tree';

      parameters = params;
    }

    return {
      version: "1.0",
      requestId: request.id,
      category: request.category,
      target,
      confidence,
      summary,
      parameters
    };
  }
}
