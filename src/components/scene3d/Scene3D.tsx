import React, { Suspense } from 'react';
import { isPointInPolygon } from '../../core/geometry/math';
import { WORKSPACE_WIDTH, WORKSPACE_DEPTH } from '../../core/config/workspace';
import { Canvas } from '@react-three/fiber';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { SitePlane3D } from './SitePlane3D';
// import { BuildingFloor3D } from './BuildingFloor3D';
import { Wall3D } from './Wall3D';
import { AreaFloor3D } from './AreaFloor3D';
import { OpeningPlaceholder3D } from './OpeningPlaceholder3D';
import { Roof3D } from './Roof3D';
import { CameraControls3D } from './CameraControls3D';
import { useTheme } from '../../theme/tokens';

import * as THREE from 'three';

const RectangularGrid3D: React.FC<{ width: number; depth: number }> = ({ width, depth }) => {
  const theme = useTheme();
  
  // Create geometry for major and minor lines
  const majorPoints: THREE.Vector3[] = [];
  const minorPoints: THREE.Vector3[] = [];
  
  // Assume major step is 1m, minor step is 0.5m
  const majorStep = 1;
  const minorStep = 0.5;

  for (let x = 0; x <= width + 0.001; x += minorStep) {
    const isMajor = Math.abs(x % majorStep) < 0.001;
    const pts = isMajor ? majorPoints : minorPoints;
    pts.push(new THREE.Vector3(x, 0, 0));
    pts.push(new THREE.Vector3(x, 0, depth));
  }

  for (let z = 0; z <= depth + 0.001; z += minorStep) {
    const isMajor = Math.abs(z % majorStep) < 0.001;
    const pts = isMajor ? majorPoints : minorPoints;
    pts.push(new THREE.Vector3(0, 0, z));
    pts.push(new THREE.Vector3(width, 0, z));
  }

  const majorGeo = new THREE.BufferGeometry().setFromPoints(majorPoints);
  const minorGeo = new THREE.BufferGeometry().setFromPoints(minorPoints);

  return (
    <group position={[0, 0.01, 0]}>
      <lineSegments geometry={majorGeo}>
        <lineBasicMaterial color={theme.textPrimary} transparent opacity={0.25} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={minorGeo}>
        <lineBasicMaterial color={theme.textPrimary} transparent opacity={0.08} depthWrite={false} />
      </lineSegments>
    </group>
  );
};

export const Scene3D: React.FC = () => {
  const project = useProjectStore(state => state.data);
  const { show3DSite, show3DRooms, show3DWalls, show3DGrid, show3DOpenings } = useUIStore();

  const cx = project.site.width / 2 || 0;
  const cz = project.site.depth / 2 || 0;
  const theme = useTheme();
  const effectiveBaseHeight = 0;

  return (
    <div style={{ width: '100%', height: '100%', background: theme.scene3dBg }}>
      <Canvas shadows>
        <CameraControls3D cx={cx} cz={cz} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#ffffff', '#444444', 0.4]} />
        <directionalLight 
          position={[10, 18, 12]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048} 
          shadow-camera-far={100}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        <Suspense fallback={null}>
          {show3DGrid && <RectangularGrid3D width={WORKSPACE_WIDTH} depth={WORKSPACE_DEPTH} />}
          {show3DSite && <SitePlane3D site={project.site} />}
          {/* <BuildingFloor3D building={project.building} /> */}
          
          {show3DWalls && project.walls.map(wall => {
            const wallOpenings = (project.openings || []).filter(o => o.wallId === wall.id);
            // Determine if wall is inside an area with elevation
            let wallBaseHeight = effectiveBaseHeight;
            const midX = (wall.start.x + wall.end.x) / 2;
            const midZ = (wall.start.z + wall.end.z) / 2;
            project.areas.forEach(area => {
              if (area.elevation && area.elevation > 0 && isPointInPolygon({x: midX, z: midZ}, area.points)) {
                wallBaseHeight = Math.max(wallBaseHeight, effectiveBaseHeight + area.elevation);
              }
            });
            return <Wall3D key={wall.id} wall={wall} allWalls={project.walls} baseHeight={wallBaseHeight} openings={wallOpenings} />;
          })}

          {show3DRooms && project.areas.map((area, index) => {
            let areaBaseHeight = effectiveBaseHeight;
            if (area.points && area.points.length > 0) {
              const midX = area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length;
              const midZ = area.points.reduce((sum, p) => sum + p.z, 0) / area.points.length;
              project.areas.forEach(otherArea => {
                if (otherArea.id !== area.id && otherArea.elevation && otherArea.elevation > 0 && isPointInPolygon({x: midX, z: midZ}, otherArea.points)) {
                  areaBaseHeight = Math.max(areaBaseHeight, effectiveBaseHeight + otherArea.elevation);
                }
              });
            }
            return <AreaFloor3D key={area.id} area={area} baseHeight={areaBaseHeight} index={index} />;
          })}

          {show3DOpenings && (project.openings || []).map(opening => {
            const wall = project.walls.find(w => w.id === opening.wallId);
            if (!wall) return null;
            let wallBaseHeight = effectiveBaseHeight;
            const midX = (wall.start.x + wall.end.x) / 2;
            const midZ = (wall.start.z + wall.end.z) / 2;
            project.areas.forEach(area => {
              if (area.elevation && area.elevation > 0 && isPointInPolygon({x: midX, z: midZ}, area.points)) {
                wallBaseHeight = Math.max(wallBaseHeight, effectiveBaseHeight + area.elevation);
              }
            });
            return <OpeningPlaceholder3D key={opening.id} opening={opening} wall={wall} baseHeight={wallBaseHeight} />;
          })}

          {(project.roofs || []).map(roof => {
            if (!roof.visible) return null;
            const building = project.buildings.find(b => b.id === roof.buildingId);
            if (!building) return null;
            return <Roof3D key={roof.id} roof={roof} building={building} />;
          })}
        </Suspense>
      </Canvas>
    </div>
  );
};
