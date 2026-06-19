import { Vector2 } from '../../types';

/**
 * Translates a point by a given delta.
 */
export function translatePoint(p: Vector2, dx: number, dz: number): Vector2 {
  return { x: p.x + dx, z: p.z + dz };
}

/**
 * Rotates a 2D point around a pivot point by a given angle in degrees.
 * Positive angle is clockwise in our top-down 2D canvas coordinate system (X right, Z down).
 */
export function rotatePoint(p: Vector2, pivot: Vector2, angleDegrees: number): Vector2 {
  const angleRad = angleDegrees * (Math.PI / 180);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Translate point to origin relative to pivot
  const translatedX = p.x - pivot.x;
  const translatedZ = p.z - pivot.z;

  // Rotate
  const rotatedX = translatedX * cosA - translatedZ * sinA;
  const rotatedZ = translatedX * sinA + translatedZ * cosA;

  // Translate back
  return {
    x: rotatedX + pivot.x,
    z: rotatedZ + pivot.z
  };
}

/**
 * Calculates the bounding box of a list of points.
 */
export function getBoundingBox(points: Vector2[]): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  if (points.length === 0) return null;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { minX, maxX, minZ, maxZ };
}

/**
 * Calculates the centroid (center of bounding box) for a list of points.
 */
export function getCentroid(points: Vector2[]): Vector2 | null {
  const bbox = getBoundingBox(points);
  if (!bbox) return null;
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    z: (bbox.minZ + bbox.maxZ) / 2
  };
}
