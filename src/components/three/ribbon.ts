import * as THREE from "three";

export type RibbonOptions = {
  width?: number;
  /** Total twist along the ribbon, in radians. */
  twist?: number;
  segments?: number;
  /** 0 = constant width, 1 = fully tapered ends. */
  taper?: number;
  closed?: boolean;
};

/**
 * Builds a satin ribbon surface that follows a smooth curve through
 * `points`, twisting as it travels (used for the hero and CTA swirls).
 */
export function createRibbonGeometry(points: THREE.Vector3[], opts: RibbonOptions = {}) {
  const { width = 0.6, twist = Math.PI, segments = 260, taper = 0.6, closed = false } = opts;
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal", 0.5);
  const frames = curve.computeFrenetFrames(segments, closed);

  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const a = twist * t;
    dir.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
    const shape = closed ? 1 : 1 - taper + taper * Math.sin(Math.PI * t);
    const hw = (width / 2) * shape;

    positions.set([p.x + dir.x * hw, p.y + dir.y * hw, p.z + dir.z * hw], i * 6);
    positions.set([p.x - dir.x * hw, p.y - dir.y * hw, p.z - dir.z * hw], i * 6 + 3);
    uvs.set([t, 0, t, 1], i * 4);

    if (i < segments) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
