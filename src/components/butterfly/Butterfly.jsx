import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Bounds, Center, Float } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, Component } from "react";

/* -------------------------------------------------------------------------- */
/*  ErrorBoundary                                                             */
/* -------------------------------------------------------------------------- */

class GLBErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn("[Butterfly] GLB load failed:", error?.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/*  Wing detection                                                            */
/* -------------------------------------------------------------------------- */

function classifyWing(node) {
  const name = (node.name || "").toLowerCase();
  if (!name.includes("wing")) return null;
  if (/(^|[._\- ])(l|lt|left)([._\- ]|$)|left/.test(name)) return "left";
  if (/(^|[._\- ])(r|rt|right)([._\- ]|$)|right/.test(name)) return "right";
  return node.position.x < 0 ? "left" : "right";
}

function findWingNodes(scene) {
  const left = [];
  const right = [];
  if (!scene) return { left, right };
  scene.traverse((node) => {
    const side = classifyWing(node);
    if (side === "left") left.push(node);
    else if (side === "right") right.push(node);
  });
  return { left, right };
}

/* -------------------------------------------------------------------------- */
/*  Mesh — pose comes from external poseRef driven by physics                 */
/* -------------------------------------------------------------------------- */

function ButterflyMesh({ url, poseRef }) {
  const headingGroupRef = useRef();
  const baseTiltGroupRef = useRef();
  const perspectiveRef = useRef();
  const { scene } = useGLTF(url, "/draco/");

  const wings = useMemo(() => findWingNodes(scene), [scene]);
  useEffect(() => {
    [...wings.left, ...wings.right].forEach((n) => {
      n.userData.baseRot = n.rotation.clone();
    });
  }, [wings]);

  useFrame((s, delta) => {
    const pose = poseRef?.current;
    if (!pose) return;

    // Smoothly lerp displayed rotation toward the target pose so frame-rate
    // independent and never snaps. Lerp speed varies — fast during flight
    // (sharp banking), slow while resting.
    const lerp = 1 - Math.exp(-delta * (pose.responsive ? 6 : 2));

    if (perspectiveRef.current) {
      const r = perspectiveRef.current.rotation;
      r.x += (pose.pitch - r.x) * lerp;
      r.y += (pose.yaw - r.y) * lerp;
      r.z += (pose.bank - r.z) * lerp;
    }
    if (baseTiltGroupRef.current) {
      const r = baseTiltGroupRef.current.rotation;
      r.x += (pose.baseTilt - r.x) * lerp * 0.6;
    }
    // Heading rotation around the camera axis (screen Z) — keeps the
    // butterfly's painted pixels inside the canvas viewport instead of
    // overflowing the 96×96 wrapper that a CSS rotate() would.
    if (headingGroupRef.current) {
      const headingRad = -((pose.headingDeg ?? 0) * Math.PI) / 180;
      headingGroupRef.current.rotation.z = headingRad;
      const targetScale = pose.scale ?? 1;
      const s = headingGroupRef.current.scale;
      const sLerp = 1 - Math.exp(-delta * 6);
      s.x += (targetScale - s.x) * sLerp;
      s.y = s.x;
      s.z = s.x;
    }

    // Wing flap from the shared flap phase (so it's coupled with body bob)
    if (!wings.left.length && !wings.right.length) return;
    const flapAngle = Math.sin(pose.flapPhase * Math.PI * 2) * pose.flapAmplitude;
    const apply = (n, sign) => {
      const base = n.userData.baseRot;
      if (!base) return;
      n.rotation.set(base.x, base.y, base.z);
      n.rotation.z += sign * flapAngle;
    };
    wings.left.forEach((n) => apply(n, 1));
    wings.right.forEach((n) => apply(n, -1));
  });

  return (
    <Bounds fit clip margin={1.5}>
      <Center>
        <group ref={headingGroupRef}>
          <group ref={baseTiltGroupRef} rotation={[-Math.PI / 2, 0, 0]}>
            <group ref={perspectiveRef}>
              <Float
                speed={1.0}
                rotationIntensity={0.08}
                floatIntensity={0.2}
                floatingRange={[-0.03, 0.03]}
              >
                <primitive object={scene} />
              </Float>
            </group>
          </group>
        </group>
      </Center>
    </Bounds>
  );
}

/* -------------------------------------------------------------------------- */
/*  Butterfly                                                                 */
/* -------------------------------------------------------------------------- */

export default function Butterfly({
  src = "/butterfly.glb",
  size = 96,
  poseRef,
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      <GLBErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 35 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={1.6} />
          <directionalLight
            position={[3, 4, 5]}
            intensity={2.0}
            color="#fff8e7"
          />
          <directionalLight
            position={[-3, 2, -3]}
            intensity={1.0}
            color="#dbeafe"
          />
          <directionalLight
            position={[0, -3, 2]}
            intensity={0.5}
            color="#ffffff"
          />
          <Suspense fallback={null}>
            <ButterflyMesh url={src} poseRef={poseRef} />
          </Suspense>
        </Canvas>
      </GLBErrorBoundary>
    </div>
  );
}

useGLTF.preload?.("/butterfly.glb", "/draco/");
