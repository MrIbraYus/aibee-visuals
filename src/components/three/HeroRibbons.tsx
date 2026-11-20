"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createRibbonGeometry } from "./ribbon";
import { StudioLights } from "./StudioLights";
import { LazyCanvas } from "./LazyCanvas";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function Ribbons() {
  const { viewport } = useThree();
  const lime = useRef<THREE.Group>(null);
  const swirl = useRef<THREE.Group>(null);

  const limeGeo = useMemo(
    () =>
      createRibbonGeometry([v(-2.6, -1.9, -0.6), v(-1.2, -1.05, 0.5), v(0.05, -0.55, 0.1), v(0.75, 0.25, -0.5), v(0.15, 1.0, -0.2), v(-0.9, 1.25, 0.3)], {
        width: 0.72,
        twist: Math.PI * 1.8,
        taper: 0.55,
      }),
    [],
  );

  const swirlGeo = useMemo(
    () =>
      createRibbonGeometry(
        [v(2.4, -1.6, -0.4), v(1.1, -0.9, 0.5), v(0.2, -0.2, 0.2), v(0.15, 0.75, -0.3), v(0.9, 1.2, 0.2), v(1.55, 0.6, 0.6), v(1.05, -0.05, 0.1), v(0.2, 0.25, -0.4), v(-0.8, 0.9, 0)],
        { width: 0.75, twist: Math.PI * 2.2, taper: 0.7 },
      ),
    [],
  );

  const s = viewport.height / 6.2;

  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime;
    const k = Math.min(1, dt * 2);
    if (lime.current) {
      lime.current.rotation.z = THREE.MathUtils.lerp(lime.current.rotation.z, -0.12 + Math.sin(t * 0.35) * 0.06 + pointer.x * 0.05, k);
      lime.current.rotation.y = THREE.MathUtils.lerp(lime.current.rotation.y, pointer.x * 0.25, k);
      lime.current.position.y = -viewport.height * 0.2 + Math.sin(t * 0.6) * 0.06;
    }
    if (swirl.current) {
      swirl.current.rotation.z = THREE.MathUtils.lerp(swirl.current.rotation.z, 0.2 + Math.sin(t * 0.3) * 0.08 - pointer.y * 0.05, k);
      swirl.current.rotation.y = THREE.MathUtils.lerp(swirl.current.rotation.y, -0.35 + pointer.x * 0.25, k);
      swirl.current.position.y = viewport.height * 0.08 + Math.cos(t * 0.5) * 0.06;
    }
  });

  return (
    <>
      <StudioLights />
      <group ref={lime} position={[-viewport.width / 2 + 0.25 * s, -viewport.height * 0.2, 0]} scale={s}>
        <mesh geometry={limeGeo}>
          <meshPhysicalMaterial
            color="#b7f500"
            emissive="#4f7a00"
            emissiveIntensity={0.25}
            roughness={0.28}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <group ref={swirl} visible={viewport.aspect > 1} position={[viewport.width / 2 - 0.7 * s, viewport.height * 0.08, -0.5]} scale={s * 0.8}>
        <mesh geometry={swirlGeo}>
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.2}
            metalness={0.85}
            clearcoat={1}
            clearcoatRoughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}

export default function HeroRibbons({ className }: { className?: string }) {
  return (
    <LazyCanvas eager className={className} camera={{ position: [0, 0, 10], fov: 32 }}>
      <Ribbons />
    </LazyCanvas>
  );
}
