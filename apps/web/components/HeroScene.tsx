"use client";

import type { BufferAttribute } from "three";
import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const N = 55;
const AGENT_SET = new Set([2, 8, 15, 23, 31, 39]);
const LINK_D = 2.3;
const DAMPING = 0.86;

interface Nd {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  ox: number; oy: number; oz: number; // rest position
  phase: number;
  isAgent: boolean;
  sig: number; // signal level 0-1
}
interface Lk { a: number; b: number; }

export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    const el = ref.current;
    let raf: number;
    let done = () => {};

    import("three").then((T) => {
      if (!ref.current) return;
      const w = el.clientWidth, h = el.clientHeight;
      const scene = new T.Scene();
      const cam = new T.PerspectiveCamera(58, w / h, 0.1, 100);
      cam.position.z = 10;
      const rdr = new T.WebGLRenderer({ antialias: true, alpha: true });
      rdr.setSize(w, h);
      rdr.setPixelRatio(Math.min(devicePixelRatio, 2));
      el.appendChild(rdr.domElement);

      // ── nodes ──────────────────────────────────────────────────────
      const nodes: Nd[] = Array.from({ length: N }, (_, i) => {
        const θ = Math.random() * Math.PI * 2;
        const φ = Math.acos(2 * Math.random() - 1);
        const r = 1.8 + Math.random() * 2.4;
        const x = r * Math.sin(φ) * Math.cos(θ);
        const y = r * Math.sin(φ) * Math.sin(θ) * 0.65;
        const z = r * Math.cos(φ) * 0.4;
        return { x, y, z, vx: 0, vy: 0, vz: 0, ox: x, oy: y, oz: z,
          phase: Math.random() * Math.PI * 2,
          isAgent: AGENT_SET.has(i), sig: 0 };
      });

      // ── links ───────────────────────────────────────────────────────
      const links: Lk[] = [];
      for (let i = 0; i < N; i++)
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i]!.x - nodes[j]!.x;
          const dy = nodes[i]!.y - nodes[j]!.y;
          const dz = nodes[i]!.z - nodes[j]!.z;
          if (Math.sqrt(dx*dx + dy*dy + dz*dz) < LINK_D)
            links.push({ a: i, b: j });
        }

      // ── geometry: points ────────────────────────────────────────────
      const ptPos = new Float32Array(N * 3);
      const ptCol = new Float32Array(N * 3);
      const ptGeo = new T.BufferGeometry();
      ptGeo.setAttribute("position", new T.BufferAttribute(ptPos, 3));
      ptGeo.setAttribute("color",    new T.BufferAttribute(ptCol, 3));
      const ptMat = new T.PointsMaterial({ size: 0.07, vertexColors: true,
        transparent: true, opacity: 0.9, sizeAttenuation: true });
      scene.add(new T.Points(ptGeo, ptMat));

      // agent nodes — larger, separate draw
      const agPtPos = new Float32Array(AGENT_SET.size * 3);
      const agPtCol = new Float32Array(AGENT_SET.size * 3);
      const agGeo = new T.BufferGeometry();
      agGeo.setAttribute("position", new T.BufferAttribute(agPtPos, 3));
      agGeo.setAttribute("color",    new T.BufferAttribute(agPtCol, 3));
      const agMat = new T.PointsMaterial({ size: 0.18, vertexColors: true,
        transparent: true, opacity: 1, sizeAttenuation: true });
      scene.add(new T.Points(agGeo, agMat));

      // ── geometry: lines ─────────────────────────────────────────────
      const lnPos = new Float32Array(links.length * 6);
      const lnCol = new Float32Array(links.length * 6);
      const lnGeo = new T.BufferGeometry();
      lnGeo.setAttribute("position", new T.BufferAttribute(lnPos, 3));
      lnGeo.setAttribute("color",    new T.BufferAttribute(lnCol, 3));
      const lnMat = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 });
      scene.add(new T.LineSegments(lnGeo, lnMat));

      // ── mouse ───────────────────────────────────────────────────────
      let mx = 0, my = 0, gRotX = 0, gRotY = 0;
      const grp = new T.Group(); scene.add(grp);
      const onMM = (e: MouseEvent) => {
        mx = (e.clientX / innerWidth  - 0.5) * 2;
        my = (e.clientY / innerHeight - 0.5) * 2;
      };
      addEventListener("mousemove", onMM);

      // ── signal scheduler ────────────────────────────────────────────
      const agArr = [...AGENT_SET];
      let lastSig = 0;

      // ── tick ────────────────────────────────────────────────────────
      let t = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        t += 0.005;

        // group tilt
        gRotY += (mx * 0.32 - gRotY) * 0.05;
        gRotX += (my * 0.18 - gRotX) * 0.05;

        // trigger signal every ~3.5s
        if (t - lastSig > 3.5) {
          const ai = agArr[Math.floor(Math.random() * agArr.length)]!;
          nodes[ai]!.sig = 1.0;
          lastSig = t;
        }

        // propagate signal
        for (const lk of links) {
          const na = nodes[lk.a]!, nb = nodes[lk.b]!;
          if (na.sig > 0.05) nb.sig = Math.max(nb.sig, na.sig * 0.72);
          if (nb.sig > 0.05) na.sig = Math.max(na.sig, nb.sig * 0.72);
        }

        // physics
        for (let i = 0; i < N; i++) {
          const ni = nodes[i]!;
          // repulsion between all nodes
          for (let j = i + 1; j < N; j++) {
            const nj = nodes[j]!;
            const dx = ni.x - nj.x, dy = ni.y - nj.y, dz = ni.z - nj.z;
            const d2 = dx*dx + dy*dy + dz*dz + 0.01;
            const f = 0.018 / d2;
            ni.vx += dx*f; ni.vy += dy*f; ni.vz += dz*f;
            nj.vx -= dx*f; nj.vy -= dy*f; nj.vz -= dz*f;
          }
          // spring to rest
          ni.vx += (ni.ox - ni.x) * 0.004;
          ni.vy += (ni.oy - ni.y) * 0.004;
          ni.vz += (ni.oz - ni.z) * 0.003;
          // gentle breathing
          ni.vx += Math.sin(t * 0.4 + ni.phase) * 0.0005;
          ni.vy += Math.cos(t * 0.35 + ni.phase * 1.3) * 0.0005;
          // mouse repulsion (project mouse to world-ish)
          const mpx = mx * 5, mpy = -my * 3;
          const mdx = ni.x - mpx, mdy = ni.y - mpy;
          const md2 = mdx*mdx + mdy*mdy;
          if (md2 < 8) {
            const mf = 0.06 / (md2 + 0.1);
            ni.vx += mdx * mf; ni.vy += mdy * mf;
          }
          ni.vx *= DAMPING; ni.vy *= DAMPING; ni.vz *= DAMPING;
          ni.x += ni.vx; ni.y += ni.vy; ni.z += ni.vz;
          ni.sig = Math.max(0, ni.sig - 0.018);
        }

        // spring link forces
        for (const lk of links) {
          const na = nodes[lk.a]!, nb = nodes[lk.b]!;
          const dx = nb.x - na.x, dy = nb.y - na.y, dz = nb.z - na.z;
          const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const f = (d - LINK_D * 0.5) * 0.001;
          na.vx += dx/d*f; na.vy += dy/d*f; na.vz += dz/d*f;
          nb.vx -= dx/d*f; nb.vy -= dy/d*f; nb.vz -= dz/d*f;
        }

        // update point buffers
        let ai2 = 0;
        for (let i = 0; i < N; i++) {
          const n = nodes[i]!;
          ptPos[i*3]=n.x; ptPos[i*3+1]=n.y; ptPos[i*3+2]=n.z+gRotX*0.5;
          const sig = n.sig;
          if (n.isAgent) {
            const r = i % 2 === 0 ? 0.88 : 0.29;
            const g = sig > 0.1 ? 0.77 : 0.00;
            const b = i % 2 === 0 ? 0.31 : 0.85;
            ptCol[i*3]=r+sig*0.3; ptCol[i*3+1]=g+sig*0.4; ptCol[i*3+2]=b;
            agPtPos[ai2*3]=n.x; agPtPos[ai2*3+1]=n.y; agPtPos[ai2*3+2]=n.z;
            agPtCol[ai2*3]=r+sig*0.4; agPtCol[ai2*3+1]=g+sig*0.5; agPtCol[ai2*3+2]=b;
            ai2++;
          } else {
            const base = 0.16 + sig * 0.6;
            ptCol[i*3]=base; ptCol[i*3+1]=base+sig*0.4; ptCol[i*3+2]=base;
          }
        }
        (ptGeo.attributes.position as BufferAttribute).needsUpdate = true;
        (ptGeo.attributes.color    as BufferAttribute).needsUpdate = true;
        (agGeo.attributes.position as BufferAttribute).needsUpdate = true;
        (agGeo.attributes.color    as BufferAttribute).needsUpdate = true;

        // update line buffers
        for (let k = 0; k < links.length; k++) {
          const { a, b } = links[k]!;
          const na = nodes[a]!, nb = nodes[b]!;
          lnPos[k*6]=na.x; lnPos[k*6+1]=na.y; lnPos[k*6+2]=na.z;
          lnPos[k*6+3]=nb.x; lnPos[k*6+4]=nb.y; lnPos[k*6+5]=nb.z;
          const sig = Math.max(na.sig, nb.sig);
          const base = 0.14 + sig * 0.5;
          const gr = sig * 0.6;
          lnCol[k*6]=base; lnCol[k*6+1]=gr;   lnCol[k*6+2]=sig*0.3;
          lnCol[k*6+3]=base; lnCol[k*6+4]=gr; lnCol[k*6+5]=sig*0.3;
        }
        (lnGeo.attributes.position as BufferAttribute).needsUpdate = true;
        (lnGeo.attributes.color    as BufferAttribute).needsUpdate = true;

        // apply group rotation from mouse
        cam.position.x += (mx * 1.5 - cam.position.x) * 0.03;
        cam.position.y += (-my * 1.0 - cam.position.y) * 0.03;
        cam.lookAt(scene.position);

        rdr.render(scene, cam);
      };
      tick();

      const onResize = () => {
        const nw = el.clientWidth, nh = el.clientHeight;
        cam.aspect = nw / nh; cam.updateProjectionMatrix();
        rdr.setSize(nw, nh);
      };
      addEventListener("resize", onResize);

      done = () => {
        cancelAnimationFrame(raf);
        removeEventListener("mousemove", onMM);
        removeEventListener("resize", onResize);
        rdr.dispose();
        if (el.contains(rdr.domElement)) el.removeChild(rdr.domElement);
      };
    });

    return () => done();
  }, [reduced]);

  return <div ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}
