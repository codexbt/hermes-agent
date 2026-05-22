import React, { useMemo, useRef } from 'react';
import { Points, PointMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  count?: number;
  color?: string;
  size?: number;
  position?: [number, number, number];
  effectType?: 'code' | 'check' | 'error' | 'sparkle' | 'activity';
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count = 100,
  color = '#00f0ff',
  size = 2,
  position = [0, 0, 0],
  effectType = 'activity',
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const velocityRef = useRef<Float32Array | null>(null);

  // Generate particles
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      if (effectType === 'check') {
        // Falling down with curves
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = Math.random();
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        velocities[i * 3] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 1] = -Math.random() * 0.03;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      } else if (effectType === 'code') {
        // Exploding outward
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        velocities[i * 3] = Math.cos(angle) * 0.05;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
        velocities[i * 3 + 2] = Math.sin(angle) * 0.05;
      } else {
        // Random sparkles
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        velocities[i * 3] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      }
    }

    velocityRef.current = velocities;
    return positions;
  }, [count, effectType]);

  useFrame(() => {
    if (pointsRef.current && velocityRef.current) {
      const positions = pointsRef.current.geometry.attributes.position
        .array as Float32Array;

      for (let i = 0; i < count; i++) {
        positions[i * 3] += velocityRef.current[i * 3];
        positions[i * 3 + 1] += velocityRef.current[i * 3 + 1];
        positions[i * 3 + 2] += velocityRef.current[i * 3 + 2];
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <Points ref={pointsRef} positions={particles}>
        <PointMaterial
          size={size}
          sizeAttenuation={true}
          color={color}
          sizeDecay={1}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
};
