"use client";

import { Float, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Service } from "@/content/site";
import { LazyCanvas } from "./LazyCanvas";
import { StudioLights } from "./StudioLights";

type Props = { icon: Service["icon"]; activeRef: React.RefObject<boolean> };

function Glossy({ color, emissive }: { color: string; emissive?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      emissive={emissive ?? color}
      emissiveIntensity={0.12}
      roughness={0.22}
      metalness={0.05}
      clearcoat={1}
      clearcoatRoughness={0.1}
    />
  );
}

function Asterisk() {
  return (
    <group rotation={[0.35, 0.4, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
          <capsuleGeometry args={[0.23, 1.25, 12, 32]} />
          <Glossy color={i % 2 ? "#3fcf2a" : "#8be21b"} />
        </mesh>
      ))}
    </group>
  );
}

function Layers() {
  return (
    <group rotation={[0.55, Math.PI / 4, 0]}>
      {[-0.42, 0, 0.42].map((y, i) => (
        <RoundedBox key={i} args={[1.35, 0.24, 1.35]} radius={0.09} smoothness={6} position={[0, y, 0]}>
          <Glossy color={["#0b3fd1", "#1261f5", "#3d82ff"][i]} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Flower() {
  return (
    <group rotation={[0.5, -0.2, 0]}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0]} scale={[0.52, 0.52, 0.34]}>
            <sphereGeometry args={[1, 40, 40]} />
            <Glossy color="#ff3d8b" />
          </mesh>
        );
      })}
      <mesh scale={[0.42, 0.42, 0.42]} position={[0, 0, 0.12]}>
        <sphereGeometry args={[1, 40, 40]} />
        <Glossy color="#ff7ab0" />
      </mesh>
    </group>
  );
}

function Cone() {
  return (
    <group rotation={[0.2, 0, -0.9]}>
      <mesh>
        <coneGeometry args={[0.72, 1.6, 64]} />
        <Glossy color="#13c25a" emissive="#00b94f" />
      </mesh>
    </group>
  );
}

const SHAPES: Record<Service["icon"], () => ReactNode> = {
  asterisk: Asterisk,
  layers: Layers,
  flower: Flower,
  cone: Cone,
};

function Spinner({ icon, activeRef }: Props) {
  const ref = useRef<THREE.Group>(null);
  const speed = useRef(0.4);
  const Shape = SHAPES[icon];

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = activeRef.current ? 3.2 : 0.4;
    speed.current += (target - speed.current) * Math.min(1, dt * 4);
    g.rotation.y += speed.current * dt;
    const s = activeRef.current ? 1.12 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, Math.min(1, dt * 6)));
  });

  return (
    <group ref={ref}>
      <Shape />
    </group>
  );
}

export default function ServiceIcon3D({ icon, activeRef, className }: Props & { className?: string }) {
  return (
    <LazyCanvas className={className} camera={{ position: [0, 0, 5], fov: 32 }} dpr={[1, 1.5]}>
      <StudioLights intensity={1.1} />
      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
        <Spinner icon={icon} activeRef={activeRef} />
      </Float>
    </LazyCanvas>
  );
}
