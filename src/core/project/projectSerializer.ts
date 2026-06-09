import { IProject, IValidationIssue } from '../../types';
import { ProjectValidator } from '../validator/ProjectValidator';

export const projectSerializer = {
  serialize: (project: IProject): string => {
    // Strip derived values just in case they slipped in
    const safeProject = JSON.parse(JSON.stringify(project));
    
    if (Array.isArray(safeProject.walls)) {
       safeProject.walls.forEach((w: any) => delete w.length);
    }
    if (Array.isArray(safeProject.areas)) {
       safeProject.areas.forEach((a: any) => delete a.area);
    }

    // Ensure strictly empty arrays for M1
    safeProject.placedAssets = [];

    // Filter out anything not manual from annotations if we had auto ones there
    if (Array.isArray(safeProject.annotations)) {
      safeProject.annotations = safeProject.annotations.filter((a: any) => a.type === 'dimension');
    }

    return JSON.stringify(safeProject, null, 2);
  },

  deserialize: (jsonStr: string): { success: boolean, data?: IProject, issues: IValidationIssue[] } => {
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Migrate rooms to areas
      if (parsed.rooms && !parsed.areas) {
        parsed.areas = parsed.rooms.map((room: any) => {
          const { position, width, depth, ...rest } = room;
          return {
            ...rest,
            layer: 'areas',
            points: [
              { x: position.x, z: position.z },
              { x: position.x + width, z: position.z },
              { x: position.x + width, z: position.z + depth },
              { x: position.x, z: position.z + depth }
            ]
          };
        });
        delete parsed.rooms;
        parsed.version = "1.1.0"; // Upgrade version
      }

      const validation = ProjectValidator.validate(parsed);
      
      if (!validation.isValid) {
        return { success: false, issues: validation.issues };
      }
      
      return { 
        success: true, 
        data: parsed as IProject, 
        issues: validation.issues 
      };
    } catch (e: any) {
      return { 
        success: false, 
        issues: [{ severity: 'fatal', objectType: 'json', objectId: 'global', fieldPath: 'root', message: 'Invalid JSON format: ' + e.message }] 
      };
    }
  }
};
