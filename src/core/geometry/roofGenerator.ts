import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { isPointInPolygon, getPolygonArea } from './math';

export function decomposeOrthogonalPolygon(points: {x: number, z: number}[]): {minX: number, maxX: number, minZ: number, maxZ: number}[] {
  if (points.length < 3) return [];
  
  // 1. Find dominant angle (longest edge) to align to local axes
  let maxLen = -1;
  let dominantAngle = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = dx*dx + dz*dz;
    if (len > maxLen) {
      maxLen = len;
      dominantAngle = Math.atan2(dz, dx);
    }
  }
  
  // 2. Rotate points by -dominantAngle
  const cos = Math.cos(-dominantAngle);
  const sin = Math.sin(-dominantAngle);
  const rotatedPoints = points.map(p => ({
    x: p.x * cos - p.z * sin,
    z: p.x * sin + p.z * cos
  }));
  
  // 3. Collect unique X and Z
  const xs = Array.from(new Set(rotatedPoints.map(p => Math.round(p.x * 1000) / 1000))).sort((a,b) => a-b);
  const zs = Array.from(new Set(rotatedPoints.map(p => Math.round(p.z * 1000) / 1000))).sort((a,b) => a-b);
  
  // 4. Generate candidate rectangles
  const candidates: {minX: number, maxX: number, minZ: number, maxZ: number}[] = [];
  for(let i=0; i<xs.length; i++) {
    for(let j=i+1; j<xs.length; j++) {
      for(let k=0; k<zs.length; k++) {
        for(let l=k+1; l<zs.length; l++) {
          candidates.push({minX: xs[i], maxX: xs[j], minZ: zs[k], maxZ: zs[l]});
        }
      }
    }
  }
  
  // Prepare polygon for clipping
  // Ensure the rotated polygon is closed and properly formatted
  const polyRing = rotatedPoints.map(p => [p.x, p.z] as polygonClipping.Pair);
  if (polyRing.length > 0 && 
     (Math.abs(polyRing[0][0] - polyRing[polyRing.length-1][0]) > 0.001 || 
      Math.abs(polyRing[0][1] - polyRing[polyRing.length-1][1]) > 0.001)) {
    polyRing.push([...polyRing[0]] as polygonClipping.Pair);
  }
  
  // 5. Filter valid rectangles (fully inside)
  const validRects = candidates.filter(r => {
    // Check center first for performance
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    if (!isPointInPolygon({x: cx, z: cz}, rotatedPoints)) return false;
    
    // Check intersection area
    const rectRing: polygonClipping.Ring = [
      [r.minX, r.minZ],
      [r.maxX, r.minZ],
      [r.maxX, r.maxZ],
      [r.minX, r.maxZ],
      [r.minX, r.minZ]
    ];
    try {
      const inter = polygonClipping.intersection([rectRing], [polyRing]);
      let interArea = 0;
      for (const poly of inter) {
        const outer = poly[0];
        const pts = outer.map(p => ({x: p[0], z: p[1]}));
        if (pts.length > 1) pts.pop();
        interArea += getPolygonArea(pts);
      }
      const rectArea = (r.maxX - r.minX) * (r.maxZ - r.minZ);
      return Math.abs(interArea - rectArea) < 0.01;
    } catch {
      return false;
    }
  });
  
  // 6. Keep only maximal rectangles
  const maximalRects = validRects.filter((r1, i) => {
    for (let j = 0; j < validRects.length; j++) {
      if (i === j) continue;
      const r2 = validRects[j];
      if (r1.minX >= r2.minX - 0.001 && r1.maxX <= r2.maxX + 0.001 && 
          r1.minZ >= r2.minZ - 0.001 && r1.maxZ <= r2.maxZ + 0.001) {
        // r1 is completely inside r2
        return false;
      }
    }
    return true;
  });
  
  // 7. Note: We don't rotate the rects back to world coordinates directly as rectangles,
  // because rotated rectangles are polygons, not axis-aligned rects.
  // Instead, the generator can work in local coordinates and we apply the rotation to the final BufferGeometry!
  
  return maximalRects;
}

function createHipRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, angleDeg: number, ridgeDir: 'auto'|'horizontal'|'vertical' = 'auto'): THREE.BufferGeometry {
  const { minX, maxX, minZ, maxZ } = rect;
  
  const W = maxX - minX;
  const D = maxZ - minZ;
  const angleRad = angleDeg * Math.PI / 180;
  
  let isHorizontal = W >= D;
  if (ridgeDir === 'horizontal') isHorizontal = true;
  if (ridgeDir === 'vertical') isHorizontal = false;
  
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  
  const pushTriangle = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    uvs.push(0, 0, 1, 0, 0.5, 1);
  };
  
  const pushQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3) => {
    pushTriangle(p1, p2, p4);
    pushTriangle(p2, p3, p4);
  };
  
  const v0 = new THREE.Vector3(minX, 0, minZ);
  const v1 = new THREE.Vector3(maxX, 0, minZ);
  const v2 = new THREE.Vector3(maxX, 0, maxZ);
  const v3 = new THREE.Vector3(minX, 0, maxZ);
  
  if (isHorizontal) { // Horizontal ridge
    const H = (D / 2) * Math.tan(angleRad);
    const v4 = new THREE.Vector3(minX + D/2, H, (minZ + maxZ)/2);
    const v5 = new THREE.Vector3(maxX - D/2, H, (minZ + maxZ)/2);
    
    pushQuad(v0, v1, v5, v4); // Front
    pushTriangle(v1, v2, v5); // Right
    pushQuad(v2, v3, v4, v5); // Back
    pushTriangle(v3, v0, v4); // Left
  } else { // Vertical ridge
    const H = (W / 2) * Math.tan(angleRad);
    const v4 = new THREE.Vector3((minX + maxX)/2, H, minZ + W/2);
    const v5 = new THREE.Vector3((minX + maxX)/2, H, maxZ - W/2);
    
    pushTriangle(v0, v1, v4); // Front
    pushQuad(v1, v2, v5, v4); // Right
    pushTriangle(v2, v3, v5); // Back
    pushQuad(v3, v0, v4, v5); // Left
  }
  
  // Add bottom face (Soffit) so the roof is not a hollow shell
  // Looking from bottom (-Y), CCW is v0 -> v3 -> v2 -> v1
  pushQuad(v0, v3, v2, v1);
  
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

function createGableRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, angleDeg: number, ridgeDir: 'auto'|'horizontal'|'vertical' = 'auto'): THREE.BufferGeometry {
  const { minX, maxX, minZ, maxZ } = rect;
  
  const W = maxX - minX;
  const D = maxZ - minZ;
  const angleRad = angleDeg * Math.PI / 180;
  
  let isHorizontal = W >= D;
  if (ridgeDir === 'horizontal') isHorizontal = true;
  if (ridgeDir === 'vertical') isHorizontal = false;
  
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  
  const pushTriangle = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    uvs.push(0, 0, 1, 0, 0.5, 1);
  };
  
  const pushQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3) => {
    pushTriangle(p1, p2, p4);
    pushTriangle(p2, p3, p4);
  };
  
  const v0 = new THREE.Vector3(minX, 0, minZ);
  const v1 = new THREE.Vector3(maxX, 0, minZ);
  const v2 = new THREE.Vector3(maxX, 0, maxZ);
  const v3 = new THREE.Vector3(minX, 0, maxZ);
  
  if (isHorizontal) { // Horizontal ridge
    const H = (D / 2) * Math.tan(angleRad);
    const v4 = new THREE.Vector3(minX, H, (minZ + maxZ)/2);
    const v5 = new THREE.Vector3(maxX, H, (minZ + maxZ)/2);
    
    pushQuad(v0, v1, v5, v4); // Front slope
    pushTriangle(v1, v2, v5); // Right gable end
    pushQuad(v2, v3, v4, v5); // Back slope
    pushTriangle(v3, v0, v4); // Left gable end
  } else { // Vertical ridge
    const H = (W / 2) * Math.tan(angleRad);
    const v4 = new THREE.Vector3((minX + maxX)/2, H, minZ);
    const v5 = new THREE.Vector3((minX + maxX)/2, H, maxZ);
    
    pushTriangle(v0, v1, v4); // Front gable end
    pushQuad(v1, v2, v5, v4); // Right slope
    pushTriangle(v2, v3, v5); // Back gable end
    pushQuad(v3, v0, v4, v5); // Left slope
  }
  
  // Add bottom face (Soffit) so the roof is not a hollow shell
  // Looking from bottom (-Y), CCW is v0 -> v3 -> v2 -> v1
  pushQuad(v0, v3, v2, v1);
  
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function generateJapaneseRoofV1(roofFootprint: {x: number, z: number}[], angleDeg: number, ridgeDir: 'auto'|'horizontal'|'vertical' = 'auto'): THREE.BufferGeometry | null {
  if (roofFootprint.length < 3) return null;
  
  let dominantAngle = 0;
  let maxLen = -1;
  for (let i = 0; i < roofFootprint.length; i++) {
    const p1 = roofFootprint[i];
    const p2 = roofFootprint[(i + 1) % roofFootprint.length];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = dx*dx + dz*dz;
    if (len > maxLen) {
      maxLen = len;
      dominantAngle = Math.atan2(dz, dx);
    }
  }
  
  const rects = decomposeOrthogonalPolygon(roofFootprint);
  if (rects.length === 0) return null;
  
  const geometries = rects.map(r => createHipRoofGeometry(r, angleDeg, ridgeDir));
  if (geometries.length === 0) return null;
  
  const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
  merged.rotateY(-dominantAngle); // Rotate back to world coordinates
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function generateThaiRoofV1(roofFootprint: {x: number, z: number}[], angleDeg: number, ridgeDir: 'auto'|'horizontal'|'vertical' = 'auto'): THREE.BufferGeometry | null {
  if (roofFootprint.length < 3) return null;
  
  let dominantAngle = 0;
  let maxLen = -1;
  for (let i = 0; i < roofFootprint.length; i++) {
    const p1 = roofFootprint[i];
    const p2 = roofFootprint[(i + 1) % roofFootprint.length];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = dx*dx + dz*dz;
    if (len > maxLen) {
      maxLen = len;
      dominantAngle = Math.atan2(dz, dx);
    }
  }
  
  const rects = decomposeOrthogonalPolygon(roofFootprint);
  if (rects.length === 0) return null;
  
  const geometries = rects.map(r => createGableRoofGeometry(r, angleDeg, ridgeDir));
  if (geometries.length === 0) return null;
  
  const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
  merged.rotateY(-dominantAngle); // Rotate back to world coordinates
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
