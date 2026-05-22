import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

interface ControlTowerProps {
  pulseIntensity?: number;
}

export const ControlTower: React.FC<ControlTowerProps> = ({ pulseIntensity = 1 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
      groupRef.current.rotation.x += 0.0001;
    }

    if (sphereRef.current) {
      pulseRef.current += 0.02;
      const scale = 1 + Math.sin(pulseRef.current) * 0.05 * pulseIntensity;
      sphereRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Inner glowing core */}
      <Sphere ref={sphereRef} args={[1.2, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          emissive="#00f0ff"
          emissiveIntensity={0.8}
          color="#00a8cc"
          wireframe={false}
          toneMapped={false}
        />
      </Sphere>

      {/* Outer wireframe shell */}
      <Icosahedron args={[1.4, 4]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#00f0ff"
          wireframe={true}
          linewidth={2}
          transparent
          opacity={0.4}
        />
      </Icosahedron>

      {/* Rotating rings */}
      {[0, 45, 90].map((rotation, i) => (
        <group
          key={i}
          rotation={[
            (rotation * Math.PI) / 180,
            0,
            (rotation * Math.PI) / 180,
          ]}
        >
          <mesh>
            <torusGeometry args={[1.8, 0.08, 16, 100]} />
            <meshStandardMaterial
              emissive={i === 0 ? '#00f0ff' : i === 1 ? '#a855f7' : '#22c55e'}
              emissiveIntensity={0.6}
              color="#1a1a2e"
              wireframe={false}
            />
          </mesh>
        </group>
      ))}

      {/* Pulsing outer glow */}
      <Sphere args={[1.6, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </group>
  );
};
