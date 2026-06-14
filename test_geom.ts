import { getWallCenterline, getWallRenderLine } from './src/core/geometry/math.ts';

const allWalls = [
  { id: 'w1', start: {x: 0, z: 0}, end: {x: 10, z: 0}, thickness: 0.2, justification: 'left', visible: true },
  { id: 'w2', start: {x: 10, z: 0}, end: {x: 10, z: 10}, thickness: 0.2, justification: 'left', visible: true },
  { id: 'w3', start: {x: 10, z: 10}, end: {x: 0, z: 10}, thickness: 0.2, justification: 'left', visible: true },
  { id: 'w4', start: {x: 0, z: 10}, end: {x: 0, z: 0}, thickness: 0.2, justification: 'left', visible: true },
];

console.log("W1 (0,0)->(10,0):", getWallRenderLine(allWalls[0] as any, allWalls as any));
console.log("W2 (10,0)->(10,10):", getWallRenderLine(allWalls[1] as any, allWalls as any));
console.log("W3 (10,10)->(0,10):", getWallRenderLine(allWalls[2] as any, allWalls as any));
console.log("W4 (0,10)->(0,0):", getWallRenderLine(allWalls[3] as any, allWalls as any));

// Test snapped T-junction at inner face
const tWalls = [
  { id: 'w1', start: {x: 0, z: 10}, end: {x: 0, z: 0}, thickness: 0.2, justification: 'left', visible: true },
  // W2 snapped to inner face of W1
  { id: 'w2', start: {x: 0.2, z: 0}, end: {x: 10, z: 0}, thickness: 0.2, justification: 'left', visible: true },
];

console.log("\nTW1:", getWallRenderLine(tWalls[0] as any, tWalls as any));
console.log("TW2:", getWallRenderLine(tWalls[1] as any, tWalls as any));
