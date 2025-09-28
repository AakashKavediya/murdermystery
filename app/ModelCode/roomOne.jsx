"use client"

import React, { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// Website screen component - placed separately but positioned relative to model
function WebsiteScreen() {
  const [scale, setScale] = useState(0.26);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleScaleClick = () => {
    if (isZoomed) {
      setScale(0.26);
    } else {
      setScale(1);
    }
    setIsZoomed(!isZoomed);
  };

  return (
    <Html
      transform
      position={[-0.74, 2.7, -1.8]} // Exact position to match the monitor in the model
      rotation={[0, 0, 0]}
      scale={scale}
      distanceFactor={1}
      occlude={false}
      zIndexRange={[100, 101]} // Ensure it renders on top
      style={{
        pointerEvents: 'auto',
        transform: 'translate3d(0,0,0)' // Force hardware acceleration
      }}
    >
      <div style={{ position: 'relative', width: '1020px', height: '600px' }}>
        {/* Toggle Scale Button */}
        <button
          onClick={handleScaleClick}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            background: isZoomed ? 'rgba(255, 0, 0, 0.7)' : 'rgba(255, 0, 0, 0.9)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = isZoomed ? 'rgba(255, 0, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = isZoomed ? 'rgba(255, 0, 0, 0.7)' : 'rgba(255, 0, 0, 0.9)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          {isZoomed ? 'Normal' : 'Zoom'}
        </button>
        
        <iframe
          src="https://v0-windows-os-simulation.vercel.app/"
          style={{
            width: "1020px",
            height: "600px",
            border: "none",
            borderRadius: "20px",
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto'
          }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </Html>
  );
}

const LoadModel = ({ position = [0, 2, 0], rotation = [0, 0, 0] }) => {
  const ModelRef = useRef();
  const { scene } = useGLTF("/model/DoneRoomOneWithCar.glb")

  // Center the model and ensure proper positioning
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  return (
    <group position={position} rotation={rotation} scale={0.1}>
      <primitive ref={ModelRef} object={scene} />
    </group>
  );
}

// Camera coordinates display component
function CameraCoordinates({ position }) {
  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg font-mono text-sm z-10">
      <div>Camera Position:</div>
      <div>X: {position[0].toFixed(2)}</div>
      <div>Y: {position[1].toFixed(2)}</div>
      <div>Z: {position[2].toFixed(2)}</div>
    </div>
  );
}

const FirstPersonControls = ({ onPositionUpdate }) => {
  const { camera, gl } = useThree();
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  
  // Define the square boundary coordinates
  const boundary = {
    minX: -1.65,
    maxX: 1.52,
    minZ: -1.58,
    maxZ: 1.97,
    y: 3.00 // Fixed Y position
  };
  
  // Camera state (first person position) - starting at [0, 3, 0]
  const [cameraPosition, setCameraPosition] = useState([0, 3, 0]);
  
  // Mouse look controls
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Movement parameters
  const moveSpeed = 0.04;
  const damping = 0.8;
  const mouseSensitivity = 0.002;

  // Refs for useFrame
  const cameraPosRef = useRef(new THREE.Vector3(0, 3, 0));

  // Function to clamp position within boundaries
  const clampPosition = useCallback((position) => {
    const clampedPosition = position.clone();
    
    // Clamp X coordinate
    clampedPosition.x = THREE.MathUtils.clamp(
      clampedPosition.x, 
      boundary.minX, 
      boundary.maxX
    );
    
    // Clamp Z coordinate
    clampedPosition.z = THREE.MathUtils.clamp(
      clampedPosition.z, 
      boundary.minZ, 
      boundary.maxZ
    );
    
    // Keep Y fixed at 3.00
    clampedPosition.y = boundary.y;
    
    return clampedPosition;
  }, [boundary]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        moveState.current.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        moveState.current.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        moveState.current.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        moveState.current.right = true;
        break;
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        moveState.current.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        moveState.current.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        moveState.current.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        moveState.current.right = false;
        break;
    }
  }, []);

  // Mouse look controls - ONLY X-AXIS
  const handleMouseMove = useCallback((e) => {
    if (!isPointerLocked) return;

    const deltaX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;

    // Update camera rotation based on mouse movement - ONLY Y rotation (horizontal)
    camera.rotation.y -= deltaX * mouseSensitivity;

    // Lock the X rotation (vertical look) to prevent up/down movement
    camera.rotation.x = 0; // Always keep horizontal view
    camera.rotation.z = 0; // Prevent any roll

  }, [camera, isPointerLocked, mouseSensitivity]);

  const handlePointerLock = useCallback(() => {
    gl.domElement.requestPointerLock();
    setIsPointerLocked(true);
  }, [gl]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gl.domElement.addEventListener('click', handlePointerLock);
    
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === gl.domElement);
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('click', handlePointerLock);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleKeyDown, handleKeyUp, handlePointerLock, handleMouseMove, gl]);

  useFrame(() => {
    // Reset velocity
    velocity.current.set(0, 0, 0);

    // Calculate movement direction based on camera orientation
    direction.current.set(0, 0, 0);

    if (moveState.current.forward) direction.current.z -= 1;
    if (moveState.current.backward) direction.current.z += 1;
    if (moveState.current.left) direction.current.x -= 1;
    if (moveState.current.right) direction.current.x += 1;

    // Normalize direction if moving diagonally
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Apply camera rotation to movement direction
    const cameraEuler = new THREE.Euler(0, camera.rotation.y, 0, 'XYZ');
    direction.current.applyEuler(cameraEuler);

    // Apply movement speed
    velocity.current.addScaledVector(direction.current, moveSpeed);

    // Apply damping for smoother movement
    velocity.current.multiplyScalar(damping);

    // Update camera position temporarily
    const tempPosition = cameraPosRef.current.clone().add(velocity.current);
    
    // Clamp the position to stay within boundaries
    const clampedPosition = clampPosition(tempPosition);
    
    // Apply the clamped position
    cameraPosRef.current.copy(clampedPosition);
    camera.position.copy(clampedPosition);

    // Update state
    const newPosition = [clampedPosition.x, clampedPosition.y, clampedPosition.z];
    setCameraPosition(newPosition);
    
    // Notify parent component of position update
    if (onPositionUpdate) {
      onPositionUpdate(newPosition);
    }
  });

  return null; // No character to render in first-person view
}

const RoomModel = () => {
  const [cameraPosition, setCameraPosition] = useState([0, 3, 0]);

  const handleCameraPositionUpdate = useCallback((newPosition) => {
    setCameraPosition(newPosition);
  }, []);

  return (
    <div className="h-screen w-screen bg-orange-500 relative">
      {/* Camera coordinates display */}
      <CameraCoordinates position={cameraPosition} />
      
      <Canvas
        gl={{
          antialias: true,
          alpha: true
        }}
        camera={{ position: [0, 3, 0], fov: 75 }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 3, 0]} // New initial position at center
          fov={75}
          near={0.1}
          far={1000}
        />
        
        {/* Lighting setup */}
        <ambientLight intensity={0.09} />
        <directionalLight 
          position={[2, 5, 1]} 
          intensity={0.1}
          color="#8da6ce"
          castShadow
        />
        <pointLight
          position={[0, 3, 0]}
          intensity={0.2}
          color="#ffecd6"
          distance={10}
          decay={2}
        />
        <spotLight
          color={"#ff00a6ff"}
          intensity={5}
          position={[1, -1, 0]}
          distance={3}
          decay={2}
          castShadow
        />
        
        <fog 
          attach="fog" 
          args={['#1a2332', 5, 15]}
        />
        
        <Suspense fallback={null}>
          {/* Load the room model */}
          <LoadModel position={[0, 2, 0]} rotation={[0, 0, 0]} />
          
          {/* Website screen - positioned independently but in the same space */}
          <WebsiteScreen />
          
          {/* Controls */}
          <FirstPersonControls onPositionUpdate={handleCameraPositionUpdate} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default RoomModel;