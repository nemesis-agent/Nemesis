"use client";

import { useEffect, useRef, useState } from "react";
import type { Group, Material, Mesh, Object3D, WebGLRenderer } from "three";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type LoadState = "idle" | "loading" | "ready" | "fallback";

type ModelManifest = {
  variants: {
    primary: {
      desktop: string;
      mobile: string;
      lite: string;
    };
  };
};

const FALLBACK_MANIFEST: ModelManifest = {
  variants: {
    primary: {
      desktop: "/models/nemesis/nemesis-web.glb",
      mobile: "/models/nemesis/nemesis-mobile.glb",
      lite: "/models/nemesis/nemesis-lite.glb",
    },
  },
};

function chooseModelUrl(manifest: ModelManifest): string {
  const width = window.innerWidth;
  const memory = typeof navigator !== "undefined" && "deviceMemory" in navigator
    ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory)
    : 8;
  const connection = typeof navigator !== "undefined" && "connection" in navigator
    ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    : undefined;
  const constrainedNetwork = connection?.saveData || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");

  if (constrainedNetwork || memory <= 4 || width < 720) return manifest.variants.primary.lite;
  if (width >= 1680 && memory >= 8) return manifest.variants.primary.desktop;
  return manifest.variants.primary.mobile;
}

function enhanceMaterials(root: Object3D, T: typeof import("three")) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials as Material[]) {
      if (!material) continue;
      const mat = material as Material & {
        metalness?: number;
        roughness?: number;
        emissive?: import("three").Color;
        emissiveIntensity?: number;
      };
      if (typeof mat.roughness === "number") mat.roughness = Math.min(0.82, mat.roughness + 0.08);
      if (typeof mat.metalness === "number") mat.metalness = Math.max(0.08, mat.metalness);
      if (mat.emissive) {
        mat.emissive = new T.Color(0x120303);
        mat.emissiveIntensity = 0.1;
      }
      material.needsUpdate = true;
    }
  });
}

function frameModel(model: Group, T: typeof import("three"), viewportWidth: number) {
  const box = new T.Box3().setFromObject(model);
  const size = box.getSize(new T.Vector3());
  const center = box.getCenter(new T.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const targetHeight = viewportWidth < 720 ? 3.15 : 4.65;
  const scale = targetHeight / maxAxis;

  model.position.sub(center.multiplyScalar(scale));
  model.scale.setScalar(scale);
  model.position.x += viewportWidth < 720 ? 0 : 1.05;
  model.position.y += viewportWidth < 720 ? -0.58 : -0.32;
  model.rotation.set(-0.04, -0.62, 0.01);
}

export function HeroModelStage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [, setState] = useState<LoadState>("idle");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || reduced) {
      setState("fallback");
      return;
    }

    let disposed = false;
    let raf = 0;
    let renderer: WebGLRenderer | null = null;
    let cleanup = () => {};

    const start = async () => {
      setState("loading");
      try {
        const [T, loaderModule, manifestResponse] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          fetch("/models/nemesis/manifest.json", { cache: "force-cache" }).catch(() => null),
        ]);
        if (disposed || !mountRef.current) return;

        const manifest = manifestResponse?.ok
          ? ((await manifestResponse.json()) as ModelManifest)
          : FALLBACK_MANIFEST;
        const modelUrl = chooseModelUrl(manifest);

        const scene = new T.Scene();
        scene.fog = new T.FogExp2(0x050505, 0.085);
        const camera = new T.PerspectiveCamera(36, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 100);
        camera.position.set(0.1, 0.12, 8.65);

        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.92;
        renderer.domElement.style.opacity = "0.68";
        renderer.domElement.style.filter = "contrast(1.08) saturate(0.82) drop-shadow(0 24px 70px rgba(226,82,79,0.16))";
        renderer.domElement.style.mixBlendMode = "screen";
        mount.appendChild(renderer.domElement);

        const key = new T.DirectionalLight(0xffffff, 2.15);
        key.position.set(2.8, 4.2, 5.8);
        scene.add(key);
        const red = new T.PointLight(0xe2524f, 7.2, 9, 1.8);
        red.position.set(-3.3, 0.8, 2.8);
        scene.add(red);
        const blue = new T.PointLight(0x4a8fd9, 3.8, 8, 2);
        blue.position.set(3.2, -0.6, 3.4);
        scene.add(blue);
        scene.add(new T.AmbientLight(0xffffff, 0.48));

        const loader = new loaderModule.GLTFLoader();
        const gltf = await loader.loadAsync(modelUrl);
        if (disposed || !mountRef.current) return;

        const model = gltf.scene;
        enhanceMaterials(model, T);
        frameModel(model, T, window.innerWidth);
        scene.add(model);
        const baseModelY = model.position.y;
        setState("ready");

        const halo = new T.Mesh(
          new T.TorusGeometry(1.85, 0.006, 8, 128),
          new T.MeshBasicMaterial({ color: 0xe2524f, transparent: true, opacity: 0.24 }),
        );
        halo.rotation.set(Math.PI / 2, 0, 0);
        halo.position.set(0.98, -1.26, -0.24);
        scene.add(halo);

        let pointerX = 0;
        let pointerY = 0;
        const onPointerMove = (event: PointerEvent) => {
          const rect = mount.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        };

        const onResize = () => {
          if (!renderer || !mountRef.current) return;
          const width = mount.clientWidth;
          const height = Math.max(1, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };

        mount.addEventListener("pointermove", onPointerMove);
        window.addEventListener("resize", onResize);

        let t = 0;
        const tick = () => {
          if (!renderer) return;
          raf = window.requestAnimationFrame(tick);
          t += 0.006;
          const drift = Math.sin(t * 1.7) * 0.018;
          model.rotation.y += 0.0011;
          model.rotation.x += ((-pointerY * 0.028 - 0.04) - model.rotation.x) * 0.035;
          model.rotation.z += ((pointerX * 0.018 + 0.01) - model.rotation.z) * 0.035;
          model.position.y = baseModelY + Math.sin(t) * 0.026;
          halo.rotation.z -= 0.004;
          halo.scale.setScalar(1 + drift);
          camera.position.x += (0.1 + pointerX * 0.07 - camera.position.x) * 0.03;
          camera.position.y += (-pointerY * 0.035 + 0.12 - camera.position.y) * 0.03;
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        };
        tick();

        cleanup = () => {
          window.cancelAnimationFrame(raf);
          mount.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("resize", onResize);
          scene.traverse((object) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry?.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials as Material[]) material?.dispose();
          });
          halo.geometry.dispose();
          (halo.material as Material).dispose();
          renderer?.dispose();
          if (renderer?.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
        };
      } catch (error) {
        console.warn("[NEMESIS 3D Hero] model fallback", error);
        setState("fallback");
      }
    };

    let cancelStart = () => {};
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => void start(), { timeout: 800 });
      cancelStart = () => window.cancelIdleCallback(idleId);
    } else {
      const timeoutId = globalThis.setTimeout(() => void start(), 160);
      cancelStart = () => globalThis.clearTimeout(timeoutId);
    }

    return () => {
      disposed = true;
      cancelStart();
      cleanup();
    };
  }, [reduced]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_44%,rgba(226,82,79,0.14),transparent_28%),radial-gradient(circle_at_70%_50%,rgba(74,143,217,0.08),transparent_24%)]" />
      <div ref={mountRef} className="absolute inset-y-[3%] left-[-18%] right-[-18%] opacity-90 sm:left-[2%] sm:right-[-10%] lg:left-[20%] lg:right-[-4%]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.48)_42%,rgba(5,5,5,0.74)_100%),linear-gradient(180deg,rgba(5,5,5,0.16)_0%,rgba(5,5,5,0.42)_58%,rgba(5,5,5,0.9)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_62%_46%,transparent_0%,rgba(5,5,5,0.24)_40%,rgba(5,5,5,0.8)_100%)]" />

    </div>
  );
}
