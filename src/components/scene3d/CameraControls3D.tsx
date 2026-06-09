import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';

export const CameraControls3D: React.FC<{ cx: number; cz: number }> = ({ cx, cz }) => {
  const { cameraMode } = useUIStore();
  const site = useProjectStore(state => state.data.site);
  const { camera, gl, raycaster, pointer } = useThree();
  const controlsRef = useRef<any>(null);

  const initRef = useRef(false);
  const prevPerspectiveRef = useRef<{ pos: THREE.Vector3, target: THREE.Vector3 } | null>(null);

  // Handle Camera Mode change
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    
    if (cameraMode === 'top') {
      if (!initRef.current) initRef.current = true;
      else if (controls.maxPolarAngle > 0.1) {
        prevPerspectiveRef.current = {
          pos: camera.position.clone(),
          target: controls.target.clone()
        };
      }

      camera.up.set(0, 1, 0);
      controls.target.set(cx, 0, cz);
      const topHeight = Math.max(site.width, site.depth) * 1.2 + 10;
      // Offset Z slightly so camera lookAt direction is not parallel to UP vector (0, 1, 0)
      camera.position.set(cx, topHeight, cz + 0.001);
      
      controls.enableRotate = false;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = 0;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
    } else {
      camera.up.set(0, 1, 0);
      if (!initRef.current) {
        camera.position.set(cx * 1.2 + 10, 20, cz * 1.2 + 20);
        controls.target.set(cx, 0, cz);
        initRef.current = true;
      } else if (prevPerspectiveRef.current) {
        camera.position.copy(prevPerspectiveRef.current.pos);
        controls.target.copy(prevPerspectiveRef.current.target);
        prevPerspectiveRef.current = null;
      }
      
      controls.enableRotate = true;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going strictly below ground
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
    }
    camera.lookAt(controls.target);
    controls.update();
  }, [cameraMode, camera]);

  // Handle Safe Custom Zoom to Cursor
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || cameraMode !== 'perspective') return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetVector = new THREE.Vector3();

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement)?.tagName !== 'CANVAS') return;

      raycaster.setFromCamera(pointer, camera);
      const intersect = raycaster.ray.intersectPlane(plane, targetVector);
      
      if (intersect) {
        // Clamp the point within expanded site bounds to prevent target jumping far away
        const clampX = Math.max(-site.width * 0.1, Math.min(site.width * 1.1, intersect.x));
        const clampZ = Math.max(-site.depth * 0.1, Math.min(site.depth * 1.1, intersect.z));
        
        const clampedPoint = new THREE.Vector3(clampX, 0, clampZ);
        
        // Lerp target towards the cursor point safely
        const zoomIn = e.deltaY < 0;
        const alpha = zoomIn ? 0.15 : 0.08;
        
        controls.target.lerp(clampedPoint, alpha);
        controls.update();
      }
    };

    gl.domElement.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      gl.domElement.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl, pointer, raycaster, cameraMode, site.width, site.depth]);

  return <OrbitControls ref={controlsRef} enableDamping makeDefault enableZoom={true} enablePan={true} rotateSpeed={0.6} panSpeed={0.7} zoomSpeed={0.8} />;
};
