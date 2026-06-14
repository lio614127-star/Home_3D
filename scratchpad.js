
function lineIntersection(p1, p2, p3, p4) {
  const denominator = (p1.x - p2.x) * (p3.z - p4.z) - (p1.z - p2.z) * (p3.x - p4.x);
  if (Math.abs(denominator) < 0.0001) return null;
  const t = ((p1.x - p3.x) * (p3.z - p4.z) - (p1.z - p3.z) * (p3.x - p4.x)) / denominator;
  return {
    x: p1.x + t * (p2.x - p1.x),
    z: p1.z + t * (p2.z - p1.z)
  };
}

function testJoint(dirAx, dirAz, dirBx, dirBz) {
  const t = 0.1;
  // Wall A comes from -dirA to 0,0
  // Wall B goes from 0,0 to dirB
  
  // A's lines
  const nxA = -dirAz;
  const nzA = dirAx;
  const lLeft = { s: {x: nxA*t, z: nzA*t}, e: {x: nxA*t + dirAx, z: nzA*t + dirAz} };
  const lRight = { s: {x: -nxA*t, z: -nzA*t}, e: {x: -nxA*t + dirAx, z: -nzA*t + dirAz} };

  // B's lines
  const nxB = -dirBz;
  const nzB = dirBx;
  const oLeft = { s: {x: nxB*t, z: nzB*t}, e: {x: nxB*t + dirBx, z: nzB*t + dirBz} };
  const oRight = { s: {x: -nxB*t, z: -nzB*t}, e: {x: -nxB*t + dirBx, z: -nzB*t + dirBz} };

  const iLL = lineIntersection(lLeft.s, lLeft.e, oLeft.s, oLeft.e);
  const iLR = lineIntersection(lLeft.s, lLeft.e, oRight.s, oRight.e);
  const iRL = lineIntersection(lRight.s, lRight.e, oLeft.s, oLeft.e);
  const iRR = lineIntersection(lRight.s, lRight.e, oRight.s, oRight.e);

  // vA points AWAY from joint. Wall A ends at joint. So vA = -dirA.
  const vAx = -dirAx;
  const vAz = -dirAz;
  // vB points AWAY from joint. Wall B starts at joint. So vB = dirB.
  const vBx = dirBx;
  const vBz = dirBz;

  const bisectorX = vAx + vBx;
  const bisectorZ = vAz + vBz;

  const dotLL_RR = iLL && iRR ? Math.abs((iLL.x - iRR.x) * bisectorX + (iLL.z - iRR.z) * bisectorZ) : 0;
  const dotLR_RL = iLR && iRL ? Math.abs((iLR.x - iRL.x) * bisectorX + (iLR.z - iRL.z) * bisectorZ) : 0;

  console.log(`Testing A:(${dirAx},${dirAz}) B:(${dirBx},${dirBz})`);
  console.log('bisector', bisectorX, bisectorZ);
  console.log('iLL', iLL);
  console.log('iRR', iRR);
  console.log('iLR', iLR);
  console.log('iRL', iRL);
  console.log('dotLL_RR', dotLL_RR);
  console.log('dotLR_RL', dotLR_RL);
  
  if (dotLL_RR > dotLR_RL) {
    console.log('Picked LL/RR pair');
  } else {
    console.log('Picked LR/RL pair');
  }
}

testJoint(0, 1, 1, 0); // A goes North, B goes East. Left turn.
testJoint(0, 1, -1, 0); // A goes North, B goes West. Right turn.
