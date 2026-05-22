import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Box } from '@react-three/drei';
import * as THREE from 'three';
import { AgentData } from '../types';

interface AgentAvatarProps {
  agent: AgentData;
  position: [number, number, number];
  scale?: number;
  onClick?: () => void;
  isFocused?: boolean;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  position,
  scale = 1,
  onClick,
  isFocused = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  // Status colors
  const statusColorMap: Record<string, string> = {
    idle: '#888888',
    thinking: '#fbbf24',
    working: '#22c55e',
    completed: '#10b981',
    error: '#ef4444',
  };

  const statusColor = statusColorMap[agent.status] || '#ffffff';

  useFrame(() => {
    time.current += 0.016;
    if (groupRef.current) {
      // Gentle bob animation
      groupRef.current.position.y = position[1] + Math.sin(time.current) * 0.15;

      // Slight rotation
      if (agent.status === 'working') {
        groupRef.current.rotation.z += 0.01;
      }

      // Glow intensity based on status
      if (bodyRef.current && bodyRef.current.material instanceof THREE.MeshStandardMaterial) {
        const intensity = agent.status === 'working' ? 1.2 : 0.6;
        (bodyRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
          intensity + Math.sin(time.current * 2) * 0.2;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      scale={isFocused ? scale * 1.3 : scale}
      onClick={onClick}
    >
      {/* Main body - cube */}
      <Box args={[0.6, 0.8, 0.6]}>
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={0.7}
          ref={bodyRef}
          toneMapped={false}
        />
      </Box>

      {/* Head - sphere */}
      <Sphere args={[0.35, 16, 16]} position={[0, 0.6, 0]}>
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </Sphere>

      {/* Status indicator - spinning ring */}
      <mesh rotation={[0, 0, time.current]}>
        <torusGeometry args={[0.55, 0.06, 8, 32]} />
        <meshStandardMaterial
          emissive={statusColor}
          emissiveIntensity={1}
          color={statusColor}
          wireframe={false}
        />
      </mesh>

      {/* Focused highlight */}
      {isFocused && (
        <Sphere args={[0.95, 32, 32]}>
          <meshBasicMaterial
            color={agent.color}
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>
      )}

      {/* Progress bar around agent */}
      {agent.progress > 0 && (
        <mesh position={[0, -0.7, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
};
