import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { LogoAsset, Pulse3DSettings } from "../types";

interface PulseStudio3DProps {
  logo: LogoAsset | null;
  settings: Pulse3DSettings;
  primaryColor: string;
  accentColor: string;
  isPlaying: boolean;
  currentTime: number;
  beatIntensity: number;
}

export function PulseStudio3D({
  logo,
  settings,
  primaryColor,
  accentColor,
  isPlaying: _isPlaying,
  currentTime,
  beatIntensity,
}: PulseStudio3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const logoMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#101014");

    const camera = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(1080, 1920);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = "";
    renderer.domElement.className = "pulse-webgl-canvas";
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const pointLight = new THREE.PointLight(new THREE.Color(accentColor), 3, 50);
    pointLight.position.set(0, 2, 8);
    scene.add(pointLight);
    lightRef.current = pointLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Particles field
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const col1 = new THREE.Color(primaryColor);
    const col2 = new THREE.Color(accentColor);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = (Math.random() - 0.5) * 45;
      positions[i + 2] = (Math.random() - 0.5) * 20;

      const mixed = col1.clone().lerp(col2, Math.random());
      colors[i] = mixed.r;
      colors[i + 1] = mixed.g;
      colors[i + 2] = mixed.b;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pMaterial = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    return () => {
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  // Update logo texture/mesh when logo changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !logo) return;

    if (logoMeshRef.current) {
      scene.remove(logoMeshRef.current);
      logoMeshRef.current.geometry.dispose();
    }

    const loader = new THREE.TextureLoader();
    loader.load(logo.src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const aspect = logo.aspectRatio || 1;
      const width = 6.5;
      const height = width / aspect;

      // 3D Card / Extrusion effect
      const geom = new THREE.BoxGeometry(width, height, 0.45);
      const faceMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        roughness: 0.25,
        metalness: 0.4,
      });
      const sideMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(primaryColor),
        roughness: 0.3,
        metalness: 0.7,
      });

      const materials = [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat];
      const mesh = new THREE.Mesh(geom, materials);
      scene.add(mesh);
      logoMeshRef.current = mesh;
    });
  }, [logo, primaryColor]);

  // Update light & ambient colors
  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.color.set(accentColor);
    }
  }, [accentColor]);

  // Animation frame loop
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return;

      const t = currentTime;
      const pulse = 1 + beatIntensity * 0.28 * settings.pulseStrength;

      if (logoMeshRef.current) {
        // Kinetic floating & rotation
        if (settings.cameraMovement) {
          logoMeshRef.current.rotation.y = Math.sin(t * 1.8) * 0.22;
          logoMeshRef.current.rotation.x = Math.cos(t * 1.4) * 0.12;
        } else {
          logoMeshRef.current.rotation.set(0, 0, 0);
        }

        logoMeshRef.current.scale.set(pulse, pulse, pulse);
      }

      if (particlesRef.current && settings.particlesEnabled) {
        particlesRef.current.rotation.y = t * 0.15;
      }

      if (lightRef.current) {
        lightRef.current.intensity = 2 + beatIntensity * 4.5 * settings.lightIntensity;
      }

      renderer.render(scene, camera);
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [currentTime, beatIntensity, settings]);

  return <div ref={containerRef} className="pulse-3d-viewport" />;
}
