"use client";

import { useEffect, useRef } from "react";
import type { BufferAttribute, Group, Mesh, PerspectiveCamera, Scene, WebGLRenderer } from "three";

type SceneProps = { onReady: () => void; onFailure: () => void; onKick: () => void };

const CROWD_SOUND = "/sounds/goal-crowd.mp3";

function makeBallMap(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const base = ctx.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, "#f6f4ed");
  base.addColorStop(0.5, "#d9d7ce");
  base.addColorStop(1, "#f3f1e9");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stitched leather panels, repeating across the equirectangular sphere map.
  const radius = 34;
  const stepX = radius * 1.5;
  const stepY = Math.sqrt(3) * radius;
  for (let row = -1; row < 11; row += 1) {
    for (let col = -1; col < 22; col += 1) {
      const cx = col * stepX;
      const cy = row * stepY + (col % 2 ? stepY / 2 : 0);
      const dark = (row * 7 + col * 11) % 9 === 0;
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = (Math.PI / 3) * point;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = dark ? "#17191c" : "rgba(250,249,244,0.85)";
      ctx.fill();
      ctx.strokeStyle = dark ? "#33363a" : "#88877f";
      ctx.lineWidth = dark ? 2.4 : 3.2;
      ctx.stroke();
      if (!dark) {
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  const roughness = texture.clone();
  roughness.colorSpace = THREE.NoColorSpace;
  const bump = roughness.clone();
  return { albedo: texture, roughness, bump };
}

function makeSmokeMap(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(210,225,240,0.24)");
  gradient.addColorStop(0.45, "rgba(170,190,210,0.11)");
  gradient.addColorStop(1, "rgba(145,165,185,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeNet(THREE: typeof import("three")) {
  const points: number[] = [];
  const left = -2.35;
  const right = 2.35;
  const bottom = -1.42;
  const top = 1.2;
  const z = -2.75;
  const columns = 22;
  const rows = 12;
  for (let row = 0; row <= rows; row += 1) {
    const y = bottom + ((top - bottom) * row) / rows;
    points.push(left, y, z, right, y, z);
  }
  for (let col = 0; col <= columns; col += 1) {
    const x = left + ((right - left) * col) / columns;
    points.push(x, bottom, z, x, top, z);
  }
  const positions = new Float32Array(points);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xcbd6de, transparent: true, opacity: 0.36 });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return { lines, base: positions.slice(), position: geometry.getAttribute("position") as BufferAttribute };
}

function disposeScene(THREE: typeof import("three"), scene: Scene) {
  scene.traverse((object) => {
    if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose();
    if ("material" in object) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        if ("map" in material && material.map && "dispose" in material.map) material.map.dispose();
        material.dispose();
      }
    }
  });
}

// Sur téléphone (écran vertical), on élargit le champ de vision pour que le
// but entier reste visible (au moins ~32° à l'horizontale).
function fitFov(aspect: number) {
  const base = Math.tan((39 * Math.PI) / 360);
  const minHalfWidth = Math.tan((32 * Math.PI) / 360);
  return (2 * Math.atan(Math.max(base, minHalfWidth / aspect)) * 180) / Math.PI;
}

/** Écran géant du stade, derrière le but, affichant le logo officiel RexFoot. */
function makeStadiumScreen(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const paint = (logo?: HTMLImageElement) => {
    const glow = ctx.createRadialGradient(512, 288, 40, 512, 288, 560);
    glow.addColorStop(0, "#132233");
    glow.addColorStop(1, "#04070b");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (logo && logo.width && logo.height) {
      const scale = Math.min(460 / logo.width, 460 / logo.height);
      const w = logo.width * scale;
      const h = logo.height * scale;
      ctx.drawImage(logo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
  };
  paint();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    paint(img);
    texture.needsUpdate = true;
  };
  img.src = "/logo-crown.png";

  const group = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 1.52),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  panel.position.z = 0.07;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.92, 1.74, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.6, metalness: 0.4 }),
  );
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.7 });
  for (const x of [-1.1, 1.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), legMaterial);
    leg.position.set(x, -1.6, -0.02);
    group.add(leg);
  }
  group.add(frame, panel);
  return { group, texture };
}

export function CinematicIntroScene({ onReady, onFailure, onKick }: SceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onReady, onFailure, onKick });

  useEffect(() => {
    callbacksRef.current = { onReady, onFailure, onKick };
  }, [onReady, onFailure, onKick]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let active = true;
    let frame = 0;
    let renderer: WebGLRenderer | null = null;
    let scene: Scene | null = null;
    let camera: PerspectiveCamera | null = null;
    let ballRoot: Group | null = null;
    let ballMesh: Mesh | null = null;
    let netPositions: BufferAttribute | null = null;
    let netBase: Float32Array | null = null;
    let spots: Array<import("three").SpotLight> = [];
    let smoke: Array<{ sprite: import("three").Sprite; offset: number }> = [];
    let startedAt: number | null = null;
    let didKick = false;
    let ready = false;
    let autoKickTimer = 0;
    let fadeTimer = 0;
    let audio: HTMLAudioElement | null = null;
    const fadeOutSound = (duration: number) => {
      const sound = audio;
      if (!sound || sound.paused) return;
      const from = sound.volume;
      const t0 = performance.now();
      const step = () => {
        const k = Math.min((performance.now() - t0) / duration, 1);
        sound.volume = from * (1 - k);
        if (k < 1) window.requestAnimationFrame(step);
        else sound.pause();
      };
      step();
    };
    void (async () => {
      try {
        const THREE = await import("three");
        if (!active || !mountRef.current) return;

        renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Le canvas doit être inséré dans la page, sinon rien ne s'affiche et le
        // ballon ne peut pas être touché (l'overlay resterait noir).
        mount.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x03070c);
        scene.fog = new THREE.FogExp2(0x08111b, 0.025);
        const aspect = mount.clientWidth / mount.clientHeight;
        camera = new THREE.PerspectiveCamera(fitFov(aspect), aspect, 0.1, 80);
        camera.position.set(0, 0.25, 8.5);
        camera.lookAt(0, -0.25, -0.6);

        const ambient = new THREE.HemisphereLight(0x8aa9c2, 0x11150f, 1.45);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xfff2d2, 3.6);
        key.position.set(-3.5, 6, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -5;
        key.shadow.camera.right = 5;
        key.shadow.camera.top = 5;
        key.shadow.camera.bottom = -5;
        scene.add(key);

        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(200, 200),
          new THREE.MeshStandardMaterial({ color: 0x14261d, roughness: 0.96, metalness: 0.02 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.48;
        floor.receiveShadow = true;
        scene.add(floor);

        const spotMark = new THREE.Mesh(
          new THREE.CircleGeometry(0.035, 24),
          new THREE.MeshBasicMaterial({ color: 0xd6d9cb }),
        );
        spotMark.rotation.x = -Math.PI / 2;
        spotMark.position.set(0, -1.465, 0.68);
        scene.add(spotMark);

        const postMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e8e6, roughness: 0.34, metalness: 0.14 });
        const addPost = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), postMaterial);
          post.position.set(x, y, z);
          post.castShadow = true;
          scene?.add(post);
        };
        const goalZ = -2.78;
        addPost(-2.38, -0.14, goalZ, 0.09, 2.7, 0.1);
        addPost(2.38, -0.14, goalZ, 0.09, 2.7, 0.1);
        addPost(0, 1.2, goalZ, 4.85, 0.09, 0.1);
        addPost(-2.72, -0.14, -3.3, 0.07, 2.7, 0.08);
        addPost(2.72, -0.14, -3.3, 0.07, 2.7, 0.08);
        addPost(0, 1.2, -3.3, 0.08, 0.08, 1.05);
        const net = makeNet(THREE);
        scene.add(net.lines);
        netBase = net.base;
        netPositions = net.position;

        const crowdPositions: number[] = [];
        const crowdColors: number[] = [];
        const palette = [0x7895a8, 0x52697a, 0xb3b7ac, 0x903d3a, 0x7b866e, 0xc0a96d];
        for (let i = 0; i < 680; i += 1) {
          const row = Math.random();
          crowdPositions.push((Math.random() - 0.5) * 12, -0.45 + row * 3.3, -4.1 - Math.random() * 0.8);
          const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
          crowdColors.push(color.r, color.g, color.b);
        }
        const crowdGeometry = new THREE.BufferGeometry();
        crowdGeometry.setAttribute("position", new THREE.Float32BufferAttribute(crowdPositions, 3));
        crowdGeometry.setAttribute("color", new THREE.Float32BufferAttribute(crowdColors, 3));
        const crowd = new THREE.Points(
          crowdGeometry,
          new THREE.PointsMaterial({ size: 0.055, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false }),
        );
        scene.add(crowd);

        const stadiumScreen = makeStadiumScreen(THREE);
        stadiumScreen.group.position.set(0, 2.45, -3.95);
        scene.add(stadiumScreen.group);

        spots = [-1, 1].map((side) => {
          const light = new THREE.SpotLight(0xd8edff, 22, 18, 0.48, 0.7, 1.5);
          light.position.set(side * 4.4, 5.6, -3.1);
          light.target.position.set(0, -0.5, -1.4);
          scene?.add(light, light.target);
          const beam = new THREE.Mesh(
            new THREE.ConeGeometry(1.55, 5.6, 18, 1, true),
            new THREE.MeshBasicMaterial({ color: 0xa9d3f0, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }),
          );
          beam.position.set(side * 2.5, 2.8, -2.6);
          beam.rotation.z = side * -0.27;
          scene?.add(beam);
          return light;
        });

        const smokeTexture = makeSmokeMap(THREE);
        smoke = Array.from({ length: 5 }, (_, index) => {
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, opacity: 0.72, depthWrite: false }));
          const side = index % 2 ? 1 : -1;
          sprite.position.set(side * (1.8 + index * 0.19), -0.45 + (index % 3) * 0.44, -2.25 - index * 0.16);
          sprite.scale.set(3.1 + (index % 2) * 0.6, 1.05, 1);
          scene?.add(sprite);
          return { sprite, offset: index * 1.7 };
        });

        ballRoot = new THREE.Group();
        const ballTextures = makeBallMap(THREE);
        ballMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.68, 48, 32),
          new THREE.MeshPhysicalMaterial({
            map: ballTextures.albedo,
            roughnessMap: ballTextures.roughness,
            bumpMap: ballTextures.bump,
            bumpScale: 0.018,
            roughness: 0.57,
            metalness: 0.015,
            clearcoat: 0.18,
            clearcoatRoughness: 0.48,
          }),
        );
        ballMesh.castShadow = true;
        ballMesh.receiveShadow = true;
        ballRoot.add(ballMesh);
        scene.add(ballRoot);

        ballRoot.position.set(0, -0.76, 0.68);

        const resize = () => {
          if (!renderer || !camera || !mountRef.current) return;
          const width = mountRef.current.clientWidth;
          const height = mountRef.current.clientHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.fov = fitFov(camera.aspect);
          camera.updateProjectionMatrix();
        };

        // Son : clameur de stade du début de l'intro jusqu'à l'arrivée du site —
        // « Crowd Cheering » (pixabay.com/sound-effects/people-crowd-cheering-379666), Pixabay Content License, extrait de 5 s.
        audio = new Audio(CROWD_SOUND);
        audio.preload = "auto";
        audio.volume = 0.75;
        const startSound = () => {
          // Dans l'app installée, Chrome autorise le son au lancement ; sinon il
          // peut le bloquer jusqu'au premier toucher (l'animation continue).
          if (audio) void audio.play().catch(() => {});
        };

        // Le tir part tout seul ; toucher l'écran le déclenche plus tôt.
        const kick = () => {
          if (didKick || !active) return;
          didKick = true;
          startedAt = performance.now();
          callbacksRef.current.onKick();
          try {
            if (typeof navigator.vibrate === "function") navigator.vibrate(55);
          } catch {
            // Vibration is optional and may be denied by the browser.
          }
          // La clameur part dès l'ouverture (voir startSound) ; un toucher la
          // relance si le téléphone l'avait bloquée.
          if (audio && audio.paused) void audio.play().catch(() => {});
          // Fondu du son pendant le fondu de l'écran, fini quand le site apparaît.
          fadeTimer = window.setTimeout(() => fadeOutSound(800), 2300);
        };
        const onPointerDown = () => {
          if (audio && audio.paused && !didKick) void audio.play().catch(() => {});
          kick();
        };
        renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("resize", resize);

        const animate = (time: number) => {
          if (!active || !renderer || !scene || !camera) return;
          const elapsed = startedAt === null ? 0 : (time - startedAt) / 1000;
          if (ballRoot) {
            if (startedAt === null) {
              ballRoot.rotation.y = Math.sin(time * 0.00035) * 0.08;
              ballRoot.position.y = -0.76 + Math.sin(time * 0.0011) * 0.018;
            } else {
              const progress = Math.min(elapsed / 1.78, 1);
              const eased = progress < 0.28 ? 0.055 * (progress / 0.28) : 0.055 + 0.945 * ((progress - 0.28) / 0.72) ** 2;
              ballRoot.position.set(0, -0.76 + eased * 0.59, 0.68 - eased * 2.48);
              ballRoot.rotation.x = -eased * 4.6;
              ballRoot.rotation.y = 0.1 + eased * 1.8;
              if (elapsed > 1.58 && elapsed < 2.05 && netPositions && netBase) {
                const position = netPositions.array as Float32Array;
                const pulse = Math.sin((elapsed - 1.58) * 24) * Math.exp(-(elapsed - 1.58) * 4.5);
                for (let vertex = 0; vertex < position.length; vertex += 3) {
                  const x = netBase[vertex];
                  const y = netBase[vertex + 1];
                  const strength = Math.exp(-(x * x * 0.8 + (y + 0.15) ** 2) * 0.5);
                  position[vertex + 2] = netBase[vertex + 2] + pulse * 0.2 * strength;
                }
                netPositions.needsUpdate = true;
              }
              const flash = Math.max(0, 1 - Math.abs(elapsed - 1.7) / 0.22);
              for (const light of spots) light.intensity = 22 + flash * 48;
            }
          }
          for (const { sprite, offset } of smoke) {
            sprite.position.x += Math.sin(time * 0.00025 + offset) * 0.0008;
            sprite.position.y += Math.sin(time * 0.0004 + offset) * 0.00035;
          }
          renderer.render(scene, camera);
          if (!ready) {
            ready = true;
            callbacksRef.current.onReady();
            startSound();
            autoKickTimer = window.setTimeout(kick, 1200);
          }
          frame = window.requestAnimationFrame(animate);
        };

        // Keep references for cleanup without relying on global Three.js state.
        mount.dataset.ready = "true";
        mount.addEventListener("rexfoot-dispose", () => {
          renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("resize", resize);
        }, { once: true });
        frame = window.requestAnimationFrame(animate);
      } catch {
        if (active) callbacksRef.current.onFailure();
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(autoKickTimer);
      window.clearTimeout(fadeTimer);
      fadeOutSound(250);
      window.cancelAnimationFrame(frame);
      mount.dispatchEvent(new Event("rexfoot-dispose"));
      if (renderer && scene) {
        // The scene's textures and buffers belong only to this one-shot overlay.
        void import("three").then((THREE) => {
          if (scene) disposeScene(THREE, scene);
        });
        renderer.dispose();
      }
      renderer?.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="rf-cinematic-scene" aria-hidden="true" />;
}
