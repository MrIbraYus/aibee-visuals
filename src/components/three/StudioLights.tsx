"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Procedural studio environment (no HDR download): a few soft boxes that
 * give glossy materials believable reflections.
 */
export function StudioLights({ intensity = 1, warm = false }: { intensity?: number; warm?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35 * intensity} />
      <directionalLight position={[3, 5, 4]} intensity={1.6 * intensity} />
      <directionalLight position={[-4, -2, 2]} intensity={0.5 * intensity} color={warm ? "#ffd9b3" : "#b9ccff"} />
      <Environment resolution={256} frames={1}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
          <Lightformer form="ring" color={warm ? "#ffb26b" : "#7aa2ff"} intensity={6} onUpdate={(self) => self.lookAt(0, 0, 0)} position={[10, 10, 0]} scale={10} />
        </group>
      </Environment>
    </>
  );
}
