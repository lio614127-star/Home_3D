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

export function createHipRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, angleDeg: number, ridgeDir: 'auto'|'horizontal'|'vertical' = 'auto', thickness: number = 0.15): THREE.BufferGeometry {
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
  
  const pushTriangle = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, invert: boolean = false) => {
    if (invert) {
      vertices.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
    } else {
      vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    }
    uvs.push(0, 0, 1, 0, 0.5, 1);
  };
  
  const pushQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3, invert: boolean = false) => {
    pushTriangle(p1, p2, p4, invert);
    pushTriangle(p2, p3, p4, invert);
  };
  
  const v0 = new THREE.Vector3(minX, 0, minZ);
  const v1 = new THREE.Vector3(maxX, 0, minZ);
  const v2 = new THREE.Vector3(maxX, 0, maxZ);
  const v3 = new THREE.Vector3(minX, 0, maxZ);

  const b0 = new THREE.Vector3(minX, -thickness, minZ);
  const b1 = new THREE.Vector3(maxX, -thickness, minZ);
  const b2 = new THREE.Vector3(maxX, -thickness, maxZ);
  const b3 = new THREE.Vector3(minX, -thickness, maxZ);
  
  const inset = Math.min(W/2, D/2); // Prevents vertex crossing when forced orientation
  
  if (isHorizontal) {
    const H = Math.max(inset * Math.tan(angleRad), 0.2);
    const v4 = new THREE.Vector3(minX + inset, H, (minZ + maxZ)/2);
    const v5 = new THREE.Vector3(maxX - inset, H, (minZ + maxZ)/2);
    const b4 = new THREE.Vector3(v4.x, H - thickness, v4.z);
    const b5 = new THREE.Vector3(v5.x, H - thickness, v5.z);
    
    // Top surfaces
    pushQuad(v0, v1, v5, v4);
    if (v4.x < v5.x) {
      pushTriangle(v1, v2, v5);
      pushTriangle(v3, v0, v4);
    } else {
      pushTriangle(v1, v2, v5);
      pushTriangle(v3, v0, v4);
    }
    pushQuad(v2, v3, v4, v5);

    // Bottom surfaces (inverted)
    pushQuad(b0, b1, b5, b4, true);
    pushTriangle(b1, b2, b5, true);
    pushQuad(b2, b3, b4, b5, true);
    pushTriangle(b3, b0, b4, true);
  } else {
    const H = Math.max(inset * Math.tan(angleRad), 0.2);
    const v4 = new THREE.Vector3((minX + maxX)/2, H, minZ + inset);
    const v5 = new THREE.Vector3((minX + maxX)/2, H, maxZ - inset);
    const b4 = new THREE.Vector3(v4.x, H - thickness, v4.z);
    const b5 = new THREE.Vector3(v5.x, H - thickness, v5.z);
    
    // Top surfaces
    pushTriangle(v0, v1, v4);
    pushQuad(v1, v2, v5, v4);
    pushTriangle(v2, v3, v5);
    pushQuad(v3, v0, v4, v5);

    // Bottom surfaces (inverted)
    pushTriangle(b0, b1, b4, true);
    pushQuad(b1, b2, b5, b4, true);
    pushTriangle(b2, b3, b5, true);
    pushQuad(b3, b0, b4, b5, true);
  }
  
  // Fascia (vertical connecting edges)
  pushQuad(b0, b1, v1, v0);
  pushQuad(b1, b2, v2, v1);
  pushQuad(b2, b3, v3, v2);
  pushQuad(b3, b0, v0, v3);
  
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

export function createGableRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, angleDeg: number, ridgeDir: 'auto'|'horizontal'|'vertical' = 'auto', thickness: number = 0.15): THREE.BufferGeometry {
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
  
  const pushTriangle = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, invert: boolean = false) => {
    if (invert) vertices.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
    else vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    uvs.push(0, 0, 1, 0, 0.5, 1);
  };
  
  const pushQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3, invert: boolean = false) => {
    pushTriangle(p1, p2, p4, invert);
    pushTriangle(p2, p3, p4, invert);
  };
  
  const v0 = new THREE.Vector3(minX, 0, minZ);
  const v1 = new THREE.Vector3(maxX, 0, minZ);
  const v2 = new THREE.Vector3(maxX, 0, maxZ);
  const v3 = new THREE.Vector3(minX, 0, maxZ);

  const b0 = new THREE.Vector3(minX, -thickness, minZ);
  const b1 = new THREE.Vector3(maxX, -thickness, minZ);
  const b2 = new THREE.Vector3(maxX, -thickness, maxZ);
  const b3 = new THREE.Vector3(minX, -thickness, maxZ);
  
  if (isHorizontal) {
    const H = Math.max((D / 2) * Math.tan(angleRad), 0.2);
    const v4 = new THREE.Vector3(minX, H, (minZ + maxZ)/2);
    const v5 = new THREE.Vector3(maxX, H, (minZ + maxZ)/2);
    const b4 = new THREE.Vector3(v4.x, H - thickness, v4.z);
    const b5 = new THREE.Vector3(v5.x, H - thickness, v5.z);
    
    pushQuad(v0, v1, v5, v4); // Front slope
    pushQuad(v2, v3, v4, v5); // Back slope
    pushQuad(b0, b1, b5, b4, true); // Front bottom
    pushQuad(b2, b3, b4, b5, true); // Back bottom
    
    // Gable ends (solid triangles)
    pushTriangle(v1, v2, v5);
    pushTriangle(b1, b2, b5, true);
    pushTriangle(v3, v0, v4);
    pushTriangle(b3, b0, b4, true);

    // Fascia
    pushQuad(b0, b1, v1, v0);
    pushQuad(b2, b3, v3, v2);
  } else {
    const H = Math.max((W / 2) * Math.tan(angleRad), 0.2);
    const v4 = new THREE.Vector3((minX + maxX)/2, H, minZ);
    const v5 = new THREE.Vector3((minX + maxX)/2, H, maxZ);
    const b4 = new THREE.Vector3(v4.x, H - thickness, v4.z);
    const b5 = new THREE.Vector3(v5.x, H - thickness, v5.z);
    
    pushQuad(v1, v2, v5, v4); // Right slope
    pushQuad(v3, v0, v4, v5); // Left slope
    pushQuad(b1, b2, b5, b4, true); 
    pushQuad(b3, b0, b4, b5, true);
    
    // Gable ends
    pushTriangle(v0, v1, v4);
    pushTriangle(b0, b1, b4, true);
    pushTriangle(v2, v3, v5);
    pushTriangle(b2, b3, b5, true);

    // Fascia
    pushQuad(b1, b2, v2, v1);
    pushQuad(b3, b0, v0, v3);
  }
  
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
    if (dx*dx + dz*dz > maxLen) { maxLen = dx*dx + dz*dz; dominantAngle = Math.atan2(dz, dx); }
  }
  const rects = decomposeOrthogonalPolygon(roofFootprint);
  if (rects.length === 0) return null;
  const geometries = rects.map(r => createHipRoofGeometry(r, angleDeg, ridgeDir, 0.15));
  if (geometries.length === 0) return null;
  const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
  merged.rotateY(-dominantAngle);
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
    if (dx*dx + dz*dz > maxLen) { maxLen = dx*dx + dz*dz; dominantAngle = Math.atan2(dz, dx); }
  }
  const rects = decomposeOrthogonalPolygon(roofFootprint);
  if (rects.length === 0) return null;
  const geometries = rects.map(r => createGableRoofGeometry(r, angleDeg, ridgeDir, 0.15));
  if (geometries.length === 0) return null;
  const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
  merged.rotateY(-dominantAngle);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function createFlatRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, thickness: number = 0.15): THREE.BufferGeometry {
  const { minX, maxX, minZ, maxZ } = rect;
  const W = maxX - minX;
  const D = maxZ - minZ;
  const boxGeom = new THREE.BoxGeometry(W, thickness, D);
  boxGeom.translate((minX + maxX)/2, thickness/2, (minZ + maxZ)/2); // shift up so baseY is 0
  return boxGeom;
}

export function createShedRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, angleDeg: number, ridgeDir: 'horizontal'|'vertical', slopeDirection: 'front'|'back'|'left'|'right', thickness: number = 0.15): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const angleRad = angleDeg * Math.PI / 180;
  const { minX, maxX, minZ, maxZ } = rect;
  
  let H = 0;
  const t0 = new THREE.Vector3(minX, 0, maxZ);
  const t1 = new THREE.Vector3(maxX, 0, maxZ);
  const t2 = new THREE.Vector3(maxX, 0, minZ);
  const t3 = new THREE.Vector3(minX, 0, minZ);

  if (ridgeDir === 'horizontal') {
    H = (maxZ - minZ) * Math.tan(angleRad);
    H = Math.max(H, 0.35); // Enforce minimum visual height
    if (slopeDirection === 'front') { t3.y = t2.y = H; } else { t0.y = t1.y = H; }
  } else {
    H = (maxX - minX) * Math.tan(angleRad);
    H = Math.max(H, 0.35); // Enforce minimum visual height
    if (slopeDirection === 'left') { t1.y = t2.y = H; } else { t0.y = t3.y = H; }
  }

  const b0 = new THREE.Vector3(t0.x, t0.y - thickness, t0.z);
  const b1 = new THREE.Vector3(t1.x, t1.y - thickness, t1.z);
  const b2 = new THREE.Vector3(t2.x, t2.y - thickness, t2.z);
  const b3 = new THREE.Vector3(t3.x, t3.y - thickness, t3.z);

  const pushQuad = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, invert: boolean = false) => {
    if (invert) {
      vertices.push(p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p1.x, p1.y, p1.z);
      vertices.push(p0.x, p0.y, p0.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
    } else {
      vertices.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      vertices.push(p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    }
    uvs.push(0,0, 1,0, 1,1, 0,0, 1,1, 0,1);
  };
  
  pushQuad(t0, t1, t2, t3); // Top
  pushQuad(b0, b1, b2, b3, true); // Bottom
  
  // Fascia
  pushQuad(b0, b1, t1, t0); // front
  pushQuad(b1, b2, t2, t1); // right
  pushQuad(b2, b3, t3, t2); // back
  pushQuad(b3, b0, t0, t3); // left

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

export function createPyramidRoofGeometry(rect: {minX: number, maxX: number, minZ: number, maxZ: number}, angleDeg: number, thickness: number = 0.15): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const angleRad = angleDeg * Math.PI / 180;
  const { minX, maxX, minZ, maxZ } = rect;
  
  let H = (Math.min(maxX - minX, maxZ - minZ) / 2) * Math.tan(angleRad);
  H = Math.max(H, 0.55); // Enforce minimum visual height for pyramid roofs
  
  const v0 = new THREE.Vector3(minX, 0, maxZ);
  const v1 = new THREE.Vector3(maxX, 0, maxZ);
  const v2 = new THREE.Vector3(maxX, 0, minZ);
  const v3 = new THREE.Vector3(minX, 0, minZ);
  const peak = new THREE.Vector3((minX + maxX)/2, H, (minZ + maxZ)/2);
  
  const b0 = new THREE.Vector3(minX, -thickness, maxZ);
  const b1 = new THREE.Vector3(maxX, -thickness, maxZ);
  const b2 = new THREE.Vector3(maxX, -thickness, minZ);
  const b3 = new THREE.Vector3(minX, -thickness, minZ);
  const bPeak = new THREE.Vector3(peak.x, peak.y - thickness, peak.z);

  const pushTriangle = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, invert: boolean = false) => {
    if (invert) vertices.push(p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p1.x, p1.y, p1.z);
    else vertices.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    uvs.push(0,0, 1,0, 0.5,1);
  };
  
  const pushQuad = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    vertices.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    vertices.push(p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    uvs.push(0,0, 1,0, 1,1, 0,0, 1,1, 0,1);
  };

  // Top
  pushTriangle(v0, v1, peak); pushTriangle(v1, v2, peak);
  pushTriangle(v2, v3, peak); pushTriangle(v3, v0, peak);
  
  // Bottom
  pushTriangle(b0, b1, bPeak, true); pushTriangle(b1, b2, bPeak, true);
  pushTriangle(b2, b3, bPeak, true); pushTriangle(b3, b0, bPeak, true);
  
  // Fascia
  pushQuad(b0, b1, v1, v0); pushQuad(b1, b2, v2, v1);
  pushQuad(b2, b3, v3, v2); pushQuad(b3, b0, v0, v3);

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}
