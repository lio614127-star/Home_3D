import { IProject, IValidationResult, IValidationIssue } from '../../types';

export class ProjectValidator {
  static validate(project: any): IValidationResult {
    const issues: IValidationIssue[] = [];

    const isInvalidNumber = (val: any) => typeof val !== 'number' || isNaN(val);

    try {
      if (!project.version || (project.version !== "1.0.0" && project.version !== "1.1.0")) {
        issues.push({ severity: 'fatal', objectType: 'project', objectId: 'project', fieldPath: 'version', message: 'validation.invalidVersion' });
      }

      if (!project.site) {
        issues.push({ severity: 'fatal', objectType: 'site', objectId: 'site', fieldPath: 'site', message: 'validation.missingSite' });
      } else {
        if (isInvalidNumber(project.site.width) || project.site.width <= 0) {
          issues.push({ severity: 'fatal', objectType: 'site', objectId: project.site.id || 'site', fieldPath: 'site.width', message: 'validation.siteWidthInvalid' });
        }
        if (isInvalidNumber(project.site.depth) || project.site.depth <= 0) {
          issues.push({ severity: 'fatal', objectType: 'site', objectId: project.site.id || 'site', fieldPath: 'site.depth', message: 'validation.siteDepthInvalid' });
        }
      }

      if (!project.building) {
        issues.push({ severity: 'fatal', objectType: 'building', objectId: 'building', fieldPath: 'building', message: 'validation.missingBuilding' });
      } else {
        if (isInvalidNumber(project.building.width) || project.building.width <= 0) {
          issues.push({ severity: 'fatal', objectType: 'building', objectId: project.building.id, fieldPath: 'building.width', message: 'validation.buildingWidthInvalid' });
        }
        if (isInvalidNumber(project.building.depth) || project.building.depth <= 0) {
          issues.push({ severity: 'fatal', objectType: 'building', objectId: project.building.id, fieldPath: 'building.depth', message: 'validation.buildingDepthInvalid' });
        }
        if (project.building.layer !== 'walls') {
          issues.push({ severity: 'fatal', objectType: 'building', objectId: project.building.id, fieldPath: 'building.layer', message: 'validation.buildingLayerInvalid' });
        }
        if (project.building.anchor !== 'front_left_corner') {
          issues.push({ severity: 'fatal', objectType: 'building', objectId: project.building.id, fieldPath: 'building.anchor', message: 'validation.buildingAnchorInvalid' });
        }
      }

      if (Array.isArray(project.walls)) {
        project.walls.forEach((wall: any, index: number) => {
          if (!wall.start || !wall.end) {
            issues.push({ severity: 'fatal', objectType: 'wall', objectId: wall.id || `wall_${index}`, fieldPath: `walls[${index}]`, message: 'validation.wallMissingStartEnd' });
            return;
          }
          if (isInvalidNumber(wall.start.x) || isInvalidNumber(wall.start.z) || isInvalidNumber(wall.end.x) || isInvalidNumber(wall.end.z)) {
            issues.push({ severity: 'fatal', objectType: 'wall', objectId: wall.id || `wall_${index}`, fieldPath: `walls[${index}]`, message: 'validation.wallCoordsInvalid' });
            return;
          }
          if (wall.start.x === wall.end.x && wall.start.z === wall.end.z) {
            issues.push({ severity: 'fatal', objectType: 'wall', objectId: wall.id || `wall_${index}`, fieldPath: `walls[${index}]`, message: 'validation.wallStartEndSame' });
          }
          if (isInvalidNumber(wall.thickness) || wall.thickness <= 0) issues.push({ severity: 'fatal', objectType: 'wall', objectId: wall.id, fieldPath: 'thickness', message: 'validation.wallThicknessInvalid' });
          if (isInvalidNumber(wall.height) || wall.height <= 0) issues.push({ severity: 'fatal', objectType: 'wall', objectId: wall.id, fieldPath: 'height', message: 'validation.wallHeightInvalid' });
          
          if (wall.length !== undefined) {
             issues.push({ severity: 'fatal', objectType: 'wall', objectId: wall.id, fieldPath: 'length', message: 'validation.wallHasLength' });
          }

          if (project.site) {
             const eps = 0.05; // 5cm tolerance for boundary
             const minX = Math.min(wall.start.x, wall.end.x);
             const maxX = Math.max(wall.start.x, wall.end.x);
             const minZ = Math.min(wall.start.z, wall.end.z);
             const maxZ = Math.max(wall.start.z, wall.end.z);
             
             const siteOriginX = project.site.origin?.x || 0;
             const siteOriginZ = project.site.origin?.z || 0;
             
             if (minX < siteOriginX - eps || minZ < siteOriginZ - eps || maxX > siteOriginX + project.site.width + eps || maxZ > siteOriginZ + project.site.depth + eps) {
                // console.log("WALL OUT OF BOUNDS:", wall.id, {minX, minZ, maxX, maxZ, siteOriginX, siteOriginZ, width: project.site.width, depth: project.site.depth});
                // Disable strict boundary checks as they interfere with drafting
                // issues.push({ severity: 'warning', objectType: 'wall', objectId: wall.id, fieldPath: `walls[${index}]`, message: 'validation.wallOutOfBounds' });
             }
          }
        });
      }

      if (Array.isArray(project.areas)) {
        project.areas.forEach((area: any, index: number) => {
          if (!area.points || !Array.isArray(area.points) || area.points.length < 3) {
            issues.push({ severity: 'fatal', objectType: 'area', objectId: area.id || `area_${index}`, fieldPath: `areas[${index}]`, message: 'validation.areaPointsInvalid' });
          } else {
             area.points.forEach((p: any) => {
                if (isInvalidNumber(p.x) || isInvalidNumber(p.z)) {
                   issues.push({ severity: 'fatal', objectType: 'area', objectId: area.id || `area_${index}`, fieldPath: `areas[${index}].points`, message: 'validation.areaPointsInvalid' });
                }
             });
          }
          if (area.area !== undefined) {
             issues.push({ severity: 'fatal', objectType: 'area', objectId: area.id, fieldPath: 'area', message: 'validation.roomHasArea' }); // Reuse same message
          }

          if (project.site && Array.isArray(area.points)) {
            const eps = 0.05;
            const siteOriginX = project.site.origin?.x || 0;
            const siteOriginZ = project.site.origin?.z || 0;
            const outOfBounds = area.points.some((p: any) => p.x < siteOriginX - eps || p.z < siteOriginZ - eps || p.x > siteOriginX + project.site.width + eps || p.z > siteOriginZ + project.site.depth + eps);
            if (outOfBounds) {
                // console.log("AREA OUT OF BOUNDS:", area.id, {points: area.points, siteOriginX, siteOriginZ, width: project.site.width, depth: project.site.depth});
                // Disable strict boundary checks as they interfere with drafting
                // issues.push({ severity: 'warning', objectType: 'area', objectId: area.id, fieldPath: `areas[${index}]`, message: 'validation.roomOutOfBounds' });
            }
          }
        });
      }

      // Validate openings
      if (Array.isArray(project.openings)) {
        project.openings.forEach((opening: any) => {
          const wall = project.walls.find((w: any) => w.id === opening.wallId);
          if (!wall) {
            issues.push({ severity: 'fatal', objectType: 'opening', objectId: opening.id, fieldPath: 'wallId', message: 'validation.openingWallMissing' });
          } else {
            const wallLen = Math.sqrt(Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2));
            if (opening.offsetFromStart < 0) {
              issues.push({ severity: 'fatal', objectType: 'opening', objectId: opening.id, fieldPath: 'offsetFromStart', message: 'validation.openingOffsetInvalid' });
            }
            if (opening.width <= 0) {
              issues.push({ severity: 'fatal', objectType: 'opening', objectId: opening.id, fieldPath: 'width', message: 'validation.openingWidthInvalid' });
            }
            if (opening.height <= 0) {
              issues.push({ severity: 'fatal', objectType: 'opening', objectId: opening.id, fieldPath: 'height', message: 'validation.openingHeightInvalid' });
            }
            if (opening.offsetFromStart + opening.width > wallLen + 0.001) { // 0.001 for float error
              issues.push({ severity: 'fatal', objectType: 'opening', objectId: opening.id, fieldPath: 'offsetFromStart', message: 'validation.openingOutsideWall' });
            }
          }
        });
      }

      // Validate annotations
      if (Array.isArray(project.annotations)) {
        project.annotations.forEach((annotation: any) => {
          if (annotation.type === 'dimension') {
            if (!annotation.start || !annotation.end) {
              issues.push({ severity: 'fatal', objectType: 'dimension', objectId: annotation.id, fieldPath: 'start/end', message: 'validation.dimMissingStartEnd' });
              return;
            }
            if (isInvalidNumber(annotation.start.x) || isInvalidNumber(annotation.start.z) || isInvalidNumber(annotation.end.x) || isInvalidNumber(annotation.end.z)) {
              issues.push({ severity: 'fatal', objectType: 'dimension', objectId: annotation.id, fieldPath: 'start/end', message: 'validation.dimCoordsInvalid' });
              return;
            }
            if (Math.abs(annotation.start.x - annotation.end.x) < 0.01 && Math.abs(annotation.start.z - annotation.end.z) < 0.01) {
              issues.push({ severity: 'fatal', objectType: 'dimension', objectId: annotation.id, fieldPath: 'start/end', message: 'validation.dimStartEndSame' });
            }
            if (isInvalidNumber(annotation.offsetDistance)) {
              issues.push({ severity: 'fatal', objectType: 'dimension', objectId: annotation.id, fieldPath: 'offsetDistance', message: 'validation.dimOffsetInvalid' });
            }
          }
        });
      }

    } catch (e: any) {
      issues.push({ severity: 'fatal', objectType: 'json', objectId: 'global', fieldPath: 'root', message: `validation.fatalException:${e.message}` });
    }

    const isValid = !issues.some(issue => issue.severity === 'fatal');
    return { isValid, issues };
  }
}
