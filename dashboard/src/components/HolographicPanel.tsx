import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';

interface HolographicPanelProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  content: string;
  color?: string;
  width?: number;
  height?: number;
}

export const HolographicPanel: React.FC<HolographicPanelProps> = ({
  position,
  rotation = [0, 0, 0],
  title,
  content,
  color = '#00f0ff',
  width = 3,
  height = 2,
}: HolographicPanelProps) => {

  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  useFrame(() => {
    time.current += 0.016;
    if (groupRef.current) {
      // Subtle floating animation
      groupRef.current.position.y = position[1] + Math.sin(time.current * 0.5) * 0.05;

      // Slight tilt when hovering (we'll add pointer events later)
      groupRef.current.rotation.z = Math.sin(time.current * 0.3) * 0.02;
    }
  });

  const lines = content.split('\n');
  const fontSize = 0.12;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Panel background */}
      <Box args={[width, height, 0.1]}>
        <meshStandardMaterial
          color="#0a0e27"
          emissive="#001a33"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </Box>

      {/* Border glow */}
      <Box args={[width + 0.1, height + 0.1, 0.05]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </Box>

      {/* Title */}
      <Text
        position={[0, height * 0.4, 0.1]}
        fontSize={fontSize * 1.5}
        maxWidth={width - 0.2}
        textAlign="center"
        color={color}
        font="/fonts/inter-regular.woff"
      >
        {title}
      </Text>

      {/* Content - multiline */}
      {lines.slice(0, 8).map((line: string, i: number) => (
        <Text
          key={i}
          position={[0, height * 0.3 - i * fontSize * 1.2, 0.1]}
          fontSize={fontSize}
          maxWidth={width - 0.3}
          textAlign="left"
          color={color}
          opacity={0.8}
          font="/fonts/inter-regular.woff"
        >
          {line.slice(0, 30)}
        </Text>
      ))}
    </group>
  );
};
