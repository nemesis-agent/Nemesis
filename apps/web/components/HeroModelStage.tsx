"use client";

import { useEffect, useRef, useState } from "react";
import type { Group, Material, Mesh, Object3D, WebGLRenderer } from "three";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type LoadState = "idle" | "loading" | "ready" | "fallback";

type ModelVariantSet = {
  desktop: string;
  mobile: string;
  lite: string;
};

type ModelManifest = {
  variants: {
    primary: ModelVariantSet;
    banner?: ModelVariantSet;
  };
};

const FALLBACK_MANIFEST: ModelManifest = {
  variants: {
    primary: {
      desktop: "/models/nemesis/nemesis-web.glb",
      mobile: "/models/nemesis/nemesis-mobile.glb",
      lite: "/models/nemesis/nemesis-lite.glb",
    },
    banner: {
      desktop: "/models/nemesis/nemesis-banner-3d-web.glb",
      mobile: "/models/nemesis/nemesis-banner-3d-mobile.glb",
      lite: "/models/nemesis/nemesis-banner-3d-lite.glb",
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

  const heroVariant = manifest.variants.banner ?? manifest.variants.primary;

  if (constrainedNetwork || memory <= 4 || width < 720) return heroVariant.lite;
  if (width >= 1680 && memory >= 8) return heroVariant.desktop;
  return heroVariant.mobile;
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
        color?: import("three").Color;
        metalness?: number;
        roughness?: number;
        emissive?: import("three").Color;
        emissiveIntensity?: number;
      };
      if (mat.color) mat.color.lerp(new T.Color(0xffc1bd), 0.18);
      if (typeof mat.roughness === "number") mat.roughness = Math.min(0.66, mat.roughness);
      if (typeof mat.metalness === "number") mat.metalness = Math.max(0.24, mat.metalness);
      if (mat.emissive) {
        mat.emissive = new T.Color(0x2f0708);
        mat.emissiveIntensity = 0.24;
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
  const targetHeight = viewportWidth < 720 ? 3.25 : 5.15;
  const scale = targetHeight / maxAxis;

  model.position.sub(center.multiplyScalar(scale));
  model.scale.setScalar(scale);
  model.position.x += viewportWidth < 720 ? 0 : 0.02;
  model.position.y += viewportWidth < 720 ? -0.52 : -0.48;
  model.rotation.set(-0.035, -1.78, 0.008);
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
        scene.fog = new T.FogExp2(0x050505, 0.055);
        const camera = new T.PerspectiveCamera(36, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 100);
        camera.position.set(0, 0.08, 8.2);

        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.24;
        renderer.domElement.style.opacity = "0.94";
        renderer.domElement.style.filter = "contrast(1.28) saturate(1.62) drop-shadow(0 34px 96px rgba(226,82,79,0.32))";
        mount.appendChild(renderer.domElement);

        const key = new T.DirectionalLight(0xffffff, 2.85);
        key.position.set(2.8, 4.2, 5.8);
        scene.add(key);
        const rim = new T.DirectionalLight(0xe2524f, 3.2);
        rim.position.set(-4.2, 1.7, 3.8);
        scene.add(rim);
        const red = new T.PointLight(0xe2524f, 13.2, 11, 1.8);
        red.position.set(-3.3, 0.8, 3.2);
        scene.add(red);
        const blue = new T.PointLight(0x4a8fd9, 9.6, 10, 2);
        blue.position.set(3.2, -0.6, 3.4);
        scene.add(blue);
        scene.add(new T.AmbientLight(0xffffff, 0.58));

        const loader = new loaderModule.GLTFLoader();
        const gltf = await loader.loadAsync(modelUrl);
        if (disposed || !mountRef.current) return;

        const model = gltf.scene;
        enhanceMaterials(model, T);
        frameModel(model, T, window.innerWidth);
        scene.add(model);
        const baseModelX = model.position.x;
        const baseModelY = model.position.y;
        const baseRotationX = model.rotation.x;
        const baseRotationY = model.rotation.y;
        const baseRotationZ = model.rotation.z;
        setState("ready");

        const haloMaterial = new T.MeshBasicMaterial({ color: 0xe2524f, transparent: true, opacity: 0.28 });
        const halo = new T.Mesh(
          new T.TorusGeometry(1.85, 0.006, 8, 128),
          haloMaterial,
        );
        halo.rotation.set(Math.PI / 2, 0, 0);
        halo.position.set(0, -1.08, -0.24);
        scene.add(halo);

        let pointerX = 0;
        let pointerY = 0;
        const onPointerMove = (event: PointerEvent) => {
          pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
          pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
        };

        const onResize = () => {
          if (!renderer || !mountRef.current) return;
          const width = mount.clientWidth;
          const height = Math.max(1, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("resize", onResize);

        let t = 0;
        const tick = () => {
          if (!renderer) return;
          raf = window.requestAnimationFrame(tick);
          t += 0.006;
          const pulse = Math.sin(t * 1.9);
          const sweep = Math.sin(t * 1.2);
          model.rotation.x += ((baseRotationX - pointerY * 0.13) - model.rotation.x) * 0.065;
          model.rotation.y += ((baseRotationY + pointerX * 0.16) - model.rotation.y) * 0.065;
          model.rotation.z += ((baseRotationZ + pointerX * 0.045) - model.rotation.z) * 0.065;
          model.position.x += ((baseModelX + pointerX * 0.16) - model.position.x) * 0.055;
          model.position.y = baseModelY + pulse * 0.028 + pointerY * -0.075;
          haloMaterial.opacity = 0.24 + Math.max(0, pulse) * 0.1;
          halo.scale.setScalar(1 + pulse * 0.012);
          red.intensity = 12.4 + sweep * 2.1;
          blue.intensity = 8.8 - sweep * 1.5;
          rim.intensity = 2.8 + Math.max(0, sweep) * 0.9;
          red.position.x = -3.3 + pointerX * 0.72;
          blue.position.x = 3.2 + pointerX * 0.56;
          camera.position.x += (pointerX * 0.34 - camera.position.x) * 0.06;
          camera.position.y += (-pointerY * 0.18 + 0.08 - camera.position.y) * 0.06;
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        };
        tick();

        cleanup = () => {
          window.cancelAnimationFrame(raf);
          window.removeEventListener("pointermove", onPointerMove);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(226,82,79,0.22),transparent_34%),radial-gradient(circle_at_58%_46%,rgba(74,143,217,0.14),transparent_30%)]" />
      <div ref={mountRef} className="absolute inset-x-[-16%] inset-y-[-2%] opacity-95 sm:inset-x-[-8%] lg:inset-x-[0%]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.20)_0%,rgba(5,5,5,0.28)_48%,rgba(5,5,5,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,5,0.18)_46%,rgba(5,5,5,0.82)_100%)]" />

    </div>
  );
}
