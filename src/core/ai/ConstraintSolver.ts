import { RoofSegmentParams } from './types';

export class ConstraintSolver {
  static solve(segment: RoofSegmentParams): RoofSegmentParams {
    // Clone the segment so we don't mutate the original AI output directly before setting debug
    const solvedSegment: RoofSegmentParams = JSON.parse(JSON.stringify(segment));
    
    // Ensure relativeFootprint exists
    if (!solvedSegment.relativeFootprint) {
      solvedSegment.relativeFootprint = { centerX: 0, centerZ: 0, widthRatio: 1, depthRatio: 1 };
    }

    // Save the original AI footprint for debugging
    solvedSegment.debug = {
      aiFootprint: JSON.parse(JSON.stringify(solvedSegment.relativeFootprint)),
      constraints: []
    };

    const footprint = solvedSegment.relativeFootprint;
    const constraints = solvedSegment.debug.constraints!;
    
    const role = solvedSegment.role;
    const position = solvedSegment.position;

    // Rule 1: main_roof -> full footprint
    if (role === 'main_roof') {
      footprint.centerX = 0;
      footprint.centerZ = 0;
      footprint.widthRatio = 1;
      footprint.depthRatio = 1;
      constraints.push('full_footprint');
    }

    // Positional Rules: apply based on position, regardless of role (except main_roof)
    if (role !== 'main_roof' && position) {
      if (position.side === 'front') {
        // Touch front (Z = -1)
        footprint.centerZ = -1 + footprint.depthRatio;
        constraints.push('touch_front');
      }

      if (position.horizontal === 'left') {
        // Touch left (X = -1)
        footprint.centerX = -1 + footprint.widthRatio;
        constraints.push('touch_left');
      }
      
      if (position.horizontal === 'right') {
        // Touch right (X = 1)
        footprint.centerX = 1 - footprint.widthRatio;
        constraints.push('touch_right');
      }
      
      if (position.side === 'back') {
        // Touch back (Z = 1)
        footprint.centerZ = 1 - footprint.depthRatio;
        constraints.push('touch_back');
      }
    }

    return solvedSegment;
  }
}
