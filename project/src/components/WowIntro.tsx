import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, PerspectiveCamera, Sparkles, Float, Sky, Points, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

const FEATURES = [
  "Gestion des parcelles haute précision",
  "Analyses satellite NDVI & NDWI en temps réel",
  "Optimisation des rendements par l'IA",
  "Traçabilité complète de la graine à la récolte",
  "Intelligence Artificielle au service du climat",
  "Agriculture de précision 4.0"
];

// --- High-End Digital Simulation ---

const NeuralField = ({ progress }: { progress: number }) => {
  const count = 4000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = -2 + Math.sin(pos[i * 3] * 0.2) * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#10b981"
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4 * progress}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

const NeuralOrchard = ({ progress }: { progress: number }) => {
  const treeCount = 60;
  const treePositions = useMemo(() => {
    const temp = [];
    for (let i = 0; i < treeCount; i++) {
      temp.push([
        (Math.random() - 0.5) * 20,
        -1.5,
        (Math.random() - 0.5) * 20
      ]);
    }
    return temp;
  }, []);

  return (
    <group>
      {treePositions.map((pos, i) => (
        <group key={i} position={pos as any}>
          {/* Trunk - simple line for tech look */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.01, 0.02, 1, 4]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.3 * progress} />
          </mesh>
          {/* Data Foliage - Sparkle cloud */}
          <Sparkles 
            count={20} 
            scale={0.8} 
            size={2} 
            speed={0.2} 
            color="#34d399" 
            opacity={0.5 * progress}
            position={[0, 1.2, 0]}
          />
        </group>
      ))}
    </group>
  );
};

const OrbitalNode = () => {
  const mesh = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.z += 0.01;
      mesh.current.rotation.y += 0.005;
      const t = state.clock.getElapsedTime();
      mesh.current.position.y = 12 + Math.sin(t) * 0.5;
    }
  });

  return (
    <group ref={mesh} position={[5, 12, -8]}>
      {/* Central Core */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#10b981" emissiveIntensity={5} />
      </mesh>
      {/* Orbital Rings */}
      {[1, 1.3, 1.6].map((radius, i) => (
        <mesh key={i} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
          <torusGeometry args={[radius, 0.01, 16, 100]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Downlink Beam */}
      <mesh position={[0, -10, 0]}>
        <cylinderGeometry args={[0.05, 10, 20, 32, 1, true]} />
        <meshStandardMaterial 
          color="#10b981" 
          transparent 
          opacity={0.1} 
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

// --- Main Intro Component ---

export const WowIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [simProgress, setSimProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return;

    // 1. Text Layout
    const font = '900 24px system-ui, -apple-system, sans-serif';
    const prepared = FEATURES.map(f => prepareWithSegments(f, font));
    const containerWidth = textRef.current.clientWidth || 450;
    const layouts = prepared.map(p => layoutWithLines(p, containerWidth, 34));

    textRef.current.innerHTML = '';
    const lineElements: HTMLElement[] = [];

    layouts.forEach((l) => {
      const group = document.createElement('div');
      group.className = 'mb-8 opacity-0 transform translate-x-4 transition-all duration-1000 ease-out';
      l.lines?.forEach(line => {
        const d = document.createElement('div');
        d.textContent = line.text;
        d.style.font = font;
        d.className = 'text-emerald-400 font-sans tracking-tight leading-none uppercase italic';
        group.appendChild(d);
      });
      textRef.current?.appendChild(group);
      lineElements.push(group);
    });

    // 2. Animation Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 1.5,
          delay: 2,
          onComplete: () => {
            setIsDone(true);
            onComplete();
          }
        });
      }
    });

    tl.to(containerRef.current, { opacity: 1, duration: 1.5 });

    const p = { val: 0 };
    tl.to(p, {
      val: 1,
      duration: 6,
      ease: 'expo.inOut',
      onUpdate: () => setSimProgress(p.val)
    }, 0.5);

    tl.to(lineElements, {
      opacity: 1,
      x: 0,
      stagger: 0.5,
      duration: 1.2,
      ease: 'power4.out'
    }, 1.5);

    return () => { tl.kill(); };
  }, [onComplete]);

  if (isDone) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center overflow-hidden"
      style={{ opacity: 0 }}
    >
      {/* 3D Neural Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: false, stencil: false, depth: true }} dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 4, 15]} fov={35} />
          <color attach="background" args={['#020617']} />
          
          <Suspense fallback={null}>
            <NeuralField progress={simProgress} />
            <NeuralOrchard progress={simProgress} />
            <OrbitalNode />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            
            <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
              <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
              <Noise opacity={0.05} />
              <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
          </Suspense>
          
          <CameraRig />
        </Canvas>
      </div>

      {/* Ultra-Modern Branding Overlay */}
      <div className="relative z-10 w-full max-w-7xl px-20 flex flex-col md:flex-row items-center justify-between gap-16 pointer-events-none">
        {/* AgroGina Brand */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-[2px] bg-emerald-500" />
            <div className="text-emerald-500 text-[10px] font-mono tracking-[0.5em] uppercase">
              Neural Network V4
            </div>
          </div>
          <h1 className="text-8xl font-black text-white tracking-tighter mb-4 leading-none">
            AGRO<span className="text-emerald-500">GINA</span>
          </h1>
          <p className="text-emerald-500/60 text-xl font-light tracking-[0.2em] max-w-md uppercase">
            Agriculture <span className="text-white">Redefined</span>
          </p>
          
          <div className="mt-16 flex flex-col gap-2">
            {[ "Satellite Mesh: Active", "Field Topography: Scanned", "Neural Yield: Optimized" ].map((t, i) => (
              <div key={i} className="flex items-center gap-4 text-white font-mono text-[10px] uppercase tracking-[0.3em]">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Feature List reveal */}
        <div ref={textRef} className="w-full md:w-[450px]" />
      </div>

      {/* Glitchy Border HUD */}
      <div className="absolute inset-10 border border-emerald-500/10 pointer-events-none" />
      <div className="absolute top-10 left-10 w-4 h-4 border-t-2 border-l-2 border-emerald-500" />
      <div className="absolute top-10 right-10 w-4 h-4 border-t-2 border-r-2 border-emerald-500" />
      <div className="absolute bottom-10 left-10 w-4 h-4 border-b-2 border-l-2 border-emerald-500" />
      <div className="absolute bottom-10 right-10 w-4 h-4 border-b-2 border-r-2 border-emerald-500" />
    </div>
  );
};

function CameraRig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 3, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 4 + state.mouse.y * 2, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}
