import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { ControlTower } from './ControlTower';
import { AgentAvatar } from './AgentAvatar';
import { HolographicPanel } from './HolographicPanel';
import { ParticleSystem } from './ParticleSystem';
import { AgentData } from '../types';
import { useStore } from '../hooks/useStore';

interface Scene3DProps {
  agents: AgentData[];
  activitiesLog: string[];
}

export const Scene3D: React.FC<Scene3DProps> = ({ agents, activitiesLog }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<any>(null);
  const { focusedAgent, setFocusedAgent, particleEffects } = useStore();

  // Position agents in a circle around the control tower
  const agentPositions = agents.reduce<Record<string, [number, number, number]>>(
    (acc, agent, i) => {
      const angle = (i / agents.length) * Math.PI * 2;
      const radius = 4;
      acc[agent.name] = [
        Math.cos(angle) * radius,
        Math.sin(i * 0.3),
        Math.sin(angle) * radius,
      ];
      return acc;
    },
    {}
  );

  // Animate camera to follow focused agent
  useFrame(() => {
    if (focusedAgent && agentPositions[focusedAgent] && controlsRef.current) {
      const [x, y, z] = agentPositions[focusedAgent];
      controlsRef.current.target.lerp(new THREE.Vector3(x, y, z), 0.1);
    }
  });

  // Get particle effects for agents
  const agentEffects = (agentName: string) => {
    return particleEffects.filter((e) => e.agentName === agentName);
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#00f0ff" />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color="#a855f7" />
      <pointLight position={[0, 0, 0]} intensity={0.6} color="#22c55e" />

      {/* Environment */}
      <Environment preset="night" />

      {/* Camera */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 5, 8]}
        fov={60}
      />

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        args={[cameraRef.current as THREE.PerspectiveCamera]}
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        enableZoom
        enablePan
      />

      {/* Central Control Tower */}
      <ControlTower pulseIntensity={agents.some((a) => a.status === 'working') ? 2 : 1} />

      {/* Agent Avatars */}
      {agents.map((agent) => (
        <group key={agent.name}>
          <AgentAvatar
            agent={agent}
            position={agentPositions[agent.name] || [0, 0, 0]}
            scale={1}
            onClick={() => setFocusedAgent(focusedAgent === agent.name ? null : agent.name)}
            isFocused={focusedAgent === agent.name}
          />

          {/* Particle effects for this agent */}
          {agentEffects(agent.name).map((effect) => (
            <ParticleSystem
              key={effect.id}
              position={agentPositions[agent.name] || [0, 0, 0]}
              color={agent.color}
              count={50}
              effectType={effect.type as any}
            />
          ))}
        </group>
      ))}

      {/* Holographic info panels */}
      <HolographicPanel
        position={[-5, 3, 0]}
        rotation={[0, 0.5, 0]}
        title="SWARM STATUS"
        content={
          agents
            .slice(0, 4)
            .map((a) => `${a.name}: ${a.status}`)
            .join('\n')
        }
        color="#00f0ff"
        width={3}
        height={2.5}
      />

      <HolographicPanel
        position={[5, 3, 0]}
        rotation={[0, -0.5, 0]}
        title="ACTIVITY LOG"
        content={activitiesLog.slice(-5).join('\n')}
        color="#a855f7"
        width={3}
        height={2.5}
      />

      {/* Task details panel */}
      {focusedAgent && (
        <HolographicPanel
          position={[0, -4, 0]}
          rotation={[0, 0, 0]}
          title={focusedAgent.toUpperCase()}
          content={
            agents.find((a) => a.name === focusedAgent)?.current_task ||
            'No task'
          }
          color={agents.find((a) => a.name === focusedAgent)?.color || '#ffffff'}
          width={4}
          height={2}
        />
      )}
    </>
  );
};
