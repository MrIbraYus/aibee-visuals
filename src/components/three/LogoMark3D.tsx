"use client";

import { ContactShadows, Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGOMARK_PATH, LOGOMARK_VIEWBOX } from "@/lib/logomark";
import { LazyCanvas } from "./LazyCanvas";
import { StudioLights } from "./StudioLights";

function useLogoGeometry() {
  return useMemo(() => {
    const { width, height } = LOGOMARK_VIEWBOX;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path d="${LOGOMARK_PATH}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((p) => p.toShapes());
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 7,
      bevelEnabled: true,
      bevelThickness: 2.4,
      bevelSize: 1.5,
      bevelSegments: 10,
      curveSegments: 64,
    });
    // SVG space is Y-down and Three.js is Y-up, so the shape comes out
    // flipped vertically — exactly how Figma renders the logomark.
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);
}

function Mark({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useLogoGeometry();

  useFrame(({ pointer, clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.02, dt);
    const scroll = scrollRef.current ?? 0;
    const targetY = -0.35 + pointer.x * 0.45 + (scroll - 0.5) * Math.PI * 0.7 + Math.sin(clock.elapsedTime * 0.4) * 0.08;
    const targetX = 0.18 - pointer.y * 0.3;
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
  });

  return (
    <group ref={group} rotation={[0.18, -0.55, -0.12]}>
      <mesh geometry={geometry} scale={0.072} castShadow>
        <meshPhysicalMaterial
          color="#1554f2"
          roughness={0.16}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.08}
          sheen={0.6}
          sheenColor="#7fb0ff"
          iridescence={0.15}
        />
      </mesh>
    </group>
  );
}

export default function LogoMark3D({
  className,
  scrollRef,
}: {
  className?: string;
  scrollRef: React.RefObject<number>;
}) {
  return (
    <LazyCanvas className={className} camera={{ position: [0, 0, 7.5], fov: 30 }} shadows>
      <StudioLights intensity={1.1} />
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <Mark scrollRef={scrollRef} />
      </Float>
      <ContactShadows position={[0, -1.55, 0]} opacity={0.35} scale={7} blur={2.6} far={3} color="#0b2a7a" />
    </LazyCanvas>
  );
}
