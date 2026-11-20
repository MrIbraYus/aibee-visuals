"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createRibbonGeometry } from "./ribbon";
import { LazyCanvas } from "./LazyCanvas";
import { StudioLights } from "./StudioLights";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function Swirl({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () =>
      createRibbonGeometry(
        [v(2.2, -2.4, 0), v(0.6, -1.6, 0.8), v(-0.6, -0.4, 0.2), v(-0.2, 0.8, -0.6), v(1.0, 1.1, 0.2), v(1.3, 0.1, 0.9), v(0.4, -0.2, 0.3), v(-0.4, 0.9, -0.2), v(0.2, 2.2, 0.2), v(1.6, 2.8, -0.4)],
        { width: 1.05, twist: Math.PI * 2.6, taper: 0.35, segments: 320 },
      ),
    [],
  );

  useFrame(({ clock, pointer }, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = Math.min(1, dt * 2.5);
    const s = scrollRef.current ?? 0;
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -0.25 + s * 0.9 + Math.sin(clock.elapsedTime * 0.3) * 0.05, k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, -0.5 + pointer.x * 0.35 + s * 0.8, k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.15 - pointer.y * 0.2, k);
  });

  return (
    <group ref={ref}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#1261f5"
          emissive="#0a2a9a"
          emissiveIntensity={0.35}
          roughness={0.16}
          metalness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.06}
          iridescence={0.35}
          iridescenceIOR={1.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function Swirl3D({ className, scrollRef }: { className?: string; scrollRef: React.RefObject<number> }) {
  return (
    <LazyCanvas className={className} camera={{ position: [0, 0, 9], fov: 34 }}>
      <StudioLights intensity={1.2} />
      <Swirl scrollRef={scrollRef} />
    </LazyCanvas>
  );
}
