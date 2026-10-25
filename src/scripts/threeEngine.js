import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { partsData } from '../data/products.js';

// 1. Deteksi layar HP untuk membatasi PixelRatio agar GPU HP dingin & stabil 60 FPS
const getOptimalDpr = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 2);

// 2. Cache Singleton untuk GLB Baut & Tekstur Brushed CNC agar hanya dibuat 1 kali di RAM
let cachedBoltGltfPromise = null;
let sharedBrushedTex = null;
const glbLoader = new GLTFLoader();

function loadSharedBoltGLB() {
  if (!cachedBoltGltfPromise) {
    cachedBoltGltfPromise = new Promise((resolve, reject) => {
      glbLoader.load('./aset/baut_hexstar.glb', resolve, undefined, reject);
    });
  }
  return cachedBoltGltfPromise;
}

// Generator tekstur serat bubutan mesin CNC (Anisotropic Brushed Lathe Micro-Grooves)
function getBrushedSteelTexture() {
  if (sharedBrushedTex) return sharedBrushedTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d4d8e0';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y++) {
    const lum = 185 + Math.floor(Math.sin(y * 1.7) * 22 + (Math.random() - 0.5) * 42);
    ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
    ctx.fillRect(0, y, 512, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  sharedBrushedTex = tex;
  return tex;
}

// Environment Studio Gelap Berkontras Tinggi (Chiaroscuro Metallic Softbox)
function createDarkStudioEnvironment(renderer) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x050608);

  const panelGeo = new THREE.PlaneGeometry(1, 1);

  // Softbox Utama Kanan-Atas (Menciptakan kilau perak tajam di sisi kanan baut & puncak ulir)
  const keyPanel = new THREE.Mesh(
    panelGeo,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(6.5, 6.8, 7.2), side: THREE.DoubleSide })
  );
  keyPanel.scale.set(9, 12, 1);
  keyPanel.position.set(6.5, 5.0, 5.5);
  keyPanel.lookAt(0, 0, 0);
  envScene.add(keyPanel);

  // Rim Strip Kiri-Atas (Menegaskan siluet mahkota kepala hex & tepi kiri flange)
  const rimPanel = new THREE.Mesh(
    panelGeo,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.5, 5.0), side: THREE.DoubleSide })
  );
  rimPanel.scale.set(4.5, 11, 1);
  rimPanel.position.set(-6.0, 5.8, -2.0);
  rimPanel.lookAt(0, 0, 0);
  envScene.add(rimPanel);

  // Fill Strip Lembut Kiri-Depan (Menjaga sisi gelap baut tetap bergradasi baja arang)
  const fillPanel = new THREE.Mesh(
    panelGeo,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.0, 1.15), side: THREE.DoubleSide })
  );
  fillPanel.scale.set(6, 9, 1);
  fillPanel.position.set(-7.5, -0.5, 4.0);
  fillPanel.lookAt(0, 0, 0);
  envScene.add(fillPanel);

  // Overhead Crown Strip
  const topPanel = new THREE.Mesh(
    panelGeo,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.4, 3.7), side: THREE.DoubleSide })
  );
  topPanel.scale.set(7, 4, 1);
  topPanel.position.set(0.5, 8.5, 1.0);
  topPanel.lookAt(0, 0, 0);
  envScene.add(topPanel);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(envScene, 0.035).texture;
  pmrem.dispose();
  return envTex;
}

// Pencahayaan Studio Khusus Baut Stainless SUS 304 (Tanpa Efek Kuning di Logam)
export function setupCNCStudioLights(scene) {
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
  keyLight.position.set(4.8, 5.5, 4.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xe2e8f0, 1.55);
  rimLight.position.set(-4.5, 4.8, -2.5);
  scene.add(rimLight);

  const coolFill = new THREE.DirectionalLight(0x94a3b8, 0.55);
  coolFill.position.set(-5.0, -1.5, 3.0);
  scene.add(coolFill);

  const floorGrazingLight = new THREE.PointLight(0xdbeafe, 0.75, 10);
  floorGrazingLight.position.set(0.8, -2.4, 2.2);
  scene.add(floorGrazingLight);

  return { keyLight, rimLight, coolFill, floorGrazingLight };
}

// Pencahayaan Hero Emblem (Tetap memiliki aksen emas untuk medali logo Hero)
export function setupHeroMatchedStudioLights(scene) {
  const topRimLight = new THREE.DirectionalLight(0xffffff, 1.75);
  topRimLight.position.set(0, 5.5, 3.0);
  scene.add(topRimLight);

  const goldKeyLight = new THREE.DirectionalLight(0xffd56b, 1.65);
  goldKeyLight.position.set(4.2, 1.8, 3.8);
  scene.add(goldKeyLight);

  const sweepSpotLight = new THREE.DirectionalLight(0xfff1b8, 1.25);
  sweepSpotLight.position.set(-3.5, 3.2, 3.5);
  scene.add(sweepSpotLight);

  const coolSlateFill = new THREE.DirectionalLight(0x64748b, 0.85);
  coolSlateFill.position.set(-4.0, -2.5, 2.5);
  scene.add(coolSlateFill);

  const bottomGoldBounce = new THREE.PointLight(0xf5b700, 0.95, 12);
  bottomGoldBounce.position.set(0, -3.4, 2.2);
  scene.add(bottomGoldBounce);

  return { topRimLight, goldKeyLight, sweepSpotLight, bottomGoldBounce };
}

function createRealisticStainlessMaterials() {
  const brushedTex = getBrushedSteelTexture();

  // Material Utama Batang, Flange & Ulir (Satin Brushed CNC SUS 304)
  const brushedStainless = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xd8dee8),
    metalness: 0.92,
    roughness: 0.27,
    roughnessMap: brushedTex,
    bumpMap: brushedTex,
    bumpScale: 0.011,
    envMapIntensity: 1.35
  });

  // Material Sisi Segi Enam Kepala Baut (Kontras Gelap-Terang Tegas per Bidang Segi-6)
  const machinedHexMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xcfd6e2),
    metalness: 0.94,
    roughness: 0.22,
    bumpMap: brushedTex,
    bumpScale: 0.006,
    envMapIntensity: 1.4
  });

  // Material Rongga Bintang Torx & Lembah Ulir Dalam (Deep Shadowed Steel)
  const recessMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x12151c),
    metalness: 0.85,
    roughness: 0.48,
    envMapIntensity: 0.45
  });

  return { brushedStainless, machinedHexMat, recessMat };
}

function applyHeroMatchedBoltMaterial(rootMesh) {
  const { brushedStainless } = createRealisticStainlessMaterials();
  rootMesh.traverse((child) => {
    if (child.isMesh) {
      child.material = brushedStainless;
    }
  });
}

function normalizeBoltModel(srcScene, targetSize = 2.55) {
  const wrapper = new THREE.Group();
  const model = srcScene.clone(true);

  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  if (size.z >= size.y && size.z >= size.x) model.rotation.x = -Math.PI / 2;
  else if (size.x >= size.y && size.x >= size.z) model.rotation.z = Math.PI / 2;

  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  applyHeroMatchedBoltMaterial(model);
  wrapper.add(model);
  return wrapper;
}

/* -------------------------------------------------------------------------- */
/* 1. HERO MEDUSA 3D (DENGAN AUTO-PAUSE INTERSECTION OBSERVER)                */
/* -------------------------------------------------------------------------- */
export function initHeroMedusa3D() {
  const heroSection = document.getElementById('hero-medusa');
  const cardLens = document.getElementById('hero-card-lens');
  const canvasEl = document.getElementById('hero-logo-3d-canvas');
  const emblemImg = document.getElementById('hero-3d-logo-img');
  const interactiveStage = document.getElementById('hero-3d-interactive-stage');
  const bgTypography = document.getElementById('hero-elegance-layer');

  if (!heroSection || !cardLens || !canvasEl) return;

  let isHeroVisible = true;
  let targetMouseX = 0, targetMouseY = 0;
  let curMouseX = 0, curMouseY = 0;
  let isDragging = false;
  let startPointerX = 0;
  let manualSpinVel = 0;

  heroSection.addEventListener('pointermove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    const clientX = e.clientX ?? 0;
    const clientY = e.clientY ?? 0;
    targetMouseX = ((clientX - rect.left) / rect.width - 0.5) * 2;
    targetMouseY = ((clientY - rect.top) / rect.height - 0.5) * 2;

    if (isDragging) {
      const deltaX = clientX - startPointerX;
      manualSpinVel = deltaX * 0.004;
      if (emblemGroup) emblemGroup.rotation.z += deltaX * 0.008;
      startPointerX = clientX;
    }
  }, { passive: true });

  heroSection.addEventListener('pointerleave', () => { targetMouseX = 0; targetMouseY = 0; });

  if (interactiveStage) {
    interactiveStage.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startPointerX = e.clientX ?? 0;
    });
    window.addEventListener('pointerup', () => { isDragging = false; });
  }

  let emblemGroup = new THREE.Group();
  let scene, camera, renderer;
  let topRimLight, goldKeyLight, sweepSpotLight;

  try {
    const width = interactiveStage ? interactiveStage.clientWidth : 360;
    const height = interactiveStage ? interactiveStage.clientHeight : 360;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 0, 4.3);

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(getOptimalDpr());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();

    const lights = setupHeroMatchedStudioLights(scene);
    topRimLight = lights.topRimLight;
    goldKeyLight = lights.goldKeyLight;
    sweepSpotLight = lights.sweepSpotLight;

    scene.add(emblemGroup);

    glbLoader.load(
      './aset/hero_3d_emblem.glb',
      (gltf) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.55 / maxDim;

        root.scale.setScalar(scale);
        root.position.sub(center.multiplyScalar(scale));

        root.traverse((child) => {
          if (child.isMesh && child.material) {
            if (child.name.includes('gold')) {
              child.material.color = new THREE.Color(0xdcb036);
              child.material.metalness = 0.93;
              child.material.roughness = 0.20;
            } else if (child.name.includes('base')) {
              child.material.color = new THREE.Color(0x181a20);
              child.material.metalness = 0.82;
              child.material.roughness = 0.40;
            }
          }
        });

        emblemGroup.add(root);
        if (emblemImg) {
          emblemImg.style.opacity = '0';
          setTimeout(() => { emblemImg.style.display = 'none'; }, 350);
        }
      },
      undefined,
      () => {
        if (emblemImg) {
          emblemImg.style.display = 'block';
          emblemImg.style.opacity = '1';
        }
      }
    );

    window.addEventListener('resize', () => {
      if (!interactiveStage) return;
      const w = interactiveStage.clientWidth;
      const h = interactiveStage.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  } catch (err) {
    console.warn('Hero WebGL fallback:', err);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      isHeroVisible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    io.observe(heroSection);
  }

  let animTime = 0;
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!isHeroVisible) return;

    animTime += 0.02;
    curMouseX += (targetMouseX - curMouseX) * 0.08;
    curMouseY += (targetMouseY - curMouseY) * 0.08;

    if (!isDragging && emblemGroup) emblemGroup.rotation.z -= 0.0035;
    if (Math.abs(manualSpinVel) > 0.0001) {
      if (emblemGroup) emblemGroup.rotation.z += manualSpinVel;
      manualSpinVel *= 0.92;
    }

    if (goldKeyLight && topRimLight && sweepSpotLight) {
      const tLight = animTime * 1.35;
      goldKeyLight.position.x = Math.sin(tLight) * 4.6 + 0.5;
      goldKeyLight.position.y = Math.cos(tLight * 0.75) * 3.2;
      topRimLight.position.x = Math.cos(tLight * 0.85) * 3.8;
      sweepSpotLight.position.x = Math.sin(-tLight * 0.95) * 4.0;
    }

    if (emblemGroup) {
      emblemGroup.rotation.x = -curMouseY * 0.16;
      emblemGroup.rotation.y = curMouseX * 0.20;
      emblemGroup.position.y = Math.sin(animTime) * 0.04;
    }

    cardLens.style.transform = `perspective(1200px) rotateX(${(-curMouseY * 3.2).toFixed(2)}deg) rotateY(${(curMouseX * 4.2).toFixed(2)}deg)`;
    if (bgTypography) {
      bgTypography.style.transform = `translate3d(${(-curMouseX * 12).toFixed(1)}px, calc(-50% + ${(-curMouseY * 6).toFixed(1)}px), 0)`;
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
  }
  renderLoop();
}

/* -------------------------------------------------------------------------- */
/* 2. ANATOMI 3D: RENDER-ON-DEMAND (0% GPU SAAT DIAM, 60 FPS SAAT DISENTUH!)  */
/* -------------------------------------------------------------------------- */
export function initAnatomi3D() {
  const section = document.getElementById('anatomi-3d');
  if (!section) return;
  const canvases = section.querySelectorAll('.anatomi-canvas');
  if (!canvases.length) return;

  const POSTURES = {
    crown: { camPos: [0, 0.35, 4.15], rot: [0.68, 0.45, -0.22], scale: 2.35 },
    'side-horizontal': { camPos: [0, 0.0, 4.25], rot: [0.22, 0.15, Math.PI / 2 - 0.12], scale: 2.65 },
    'tilted-iso': { camPos: [0, 0.1, 4.2], rot: [-0.38, 0.6, -0.72], scale: 2.45 },
    'twin-set': { camPos: [0, 0.15, 4.45], rot: [0.28, -0.35, 0.18], scale: 2.25, isTwin: true }
  };

  loadSharedBoltGLB().then((gltf) => {
    const src = gltf.scene;

    canvases.forEach((canvas) => {
      try {
        const w = canvas.clientWidth || 320;
        const h = canvas.clientHeight || 260;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(getOptimalDpr());
        renderer.setSize(w, h);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;

        const scene = new THREE.Scene();
        scene.environment = createDarkStudioEnvironment(renderer);
        setupCNCStudioLights(scene);

        const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
        const cfg = POSTURES[canvas.dataset.view] || POSTURES.crown;
        camera.position.set(cfg.camPos[0], cfg.camPos[1], cfg.camPos[2]);
        camera.lookAt(0, 0, 0);

        const stageGroup = new THREE.Group();
        if (cfg.isTwin) {
          const boltMain = normalizeBoltModel(src, cfg.scale);
          boltMain.position.set(-0.48, 0.08, 0.15);
          boltMain.rotation.set(0.24, 0.4, -0.22);

          const boltSecond = normalizeBoltModel(src, cfg.scale * 0.88);
          boltSecond.position.set(0.55, -0.18, -0.25);
          boltSecond.rotation.set(0.85, -0.35, 0.65);

          stageGroup.add(boltMain);
          stageGroup.add(boltSecond);
        } else {
          const singleBolt = normalizeBoltModel(src, cfg.scale);
          singleBolt.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
          stageGroup.add(singleBolt);
        }
        scene.add(stageGroup);

        renderer.render(scene, camera);
        canvas.style.opacity = '1';

        let isDragging = false;
        let prevPt = { x: 0, y: 0 };
        canvas.addEventListener('pointerdown', (e) => {
          isDragging = true;
          prevPt = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('pointermove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - prevPt.x;
          const dy = e.clientY - prevPt.y;
          prevPt = { x: e.clientX, y: e.clientY };
          stageGroup.rotation.y += dx * 0.012;
          stageGroup.rotation.x = THREE.MathUtils.clamp(stageGroup.rotation.x + dy * 0.012, -0.8, 0.8);
          renderer.render(scene, camera);
        }, { passive: true });
        window.addEventListener('pointerup', () => { isDragging = false; });

        window.addEventListener('resize', () => {
          const nw = canvas.clientWidth || 320;
          const nh = canvas.clientHeight || 260;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
          renderer.render(scene, camera);
        });
      } catch (err) {
        const fb = canvas.parentElement.querySelector('.anatomi-fallback');
        if (fb) fb.classList.remove('hidden');
      }
    });
  }).catch(() => {
    canvases.forEach((canvas) => {
      const fb = canvas.parentElement.querySelector('.anatomi-fallback');
      if (fb) fb.classList.remove('hidden');
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 3. JACKET SHOWCASE 3D (DARK STUDIO CNC + FLOOR SHADOW & REALISTIC METAL)   */
/* -------------------------------------------------------------------------- */
let activeJacketIdx = 0;
let isVerticalLocked = false;
let userZoom = 1.0;

// Buat tekstur lantai studio dengan Contact Shadow pekat + bias kilau lampu lantai
function createStudioFloorPadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 512);

  // 1. Halo kilau lantai studio (Grazing Specular Pool)
  const glowGrad = ctx.createRadialGradient(270, 256, 15, 256, 256, 230);
  glowGrad.addColorStop(0, 'rgba(226, 232, 240, 0.24)');
  glowGrad.addColorStop(0.28, 'rgba(148, 163, 184, 0.08)');
  glowGrad.addColorStop(0.65, 'rgba(15, 23, 42, 0.02)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Bayangan jatuh memanjang ke kiri-depan (Cast Shadow)
  ctx.save();
  ctx.translate(215, 268);
  ctx.scale(1.45, 0.62);
  const castGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 145);
  castGrad.addColorStop(0, 'rgba(0, 0, 0, 0.94)');
  castGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.65)');
  castGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.18)');
  castGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = castGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 145, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Inti Contact Shadow tepat di bawah titik tumpu ujung baut
  const coreGrad = ctx.createRadialGradient(258, 256, 2, 258, 256, 48);
  coreGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
  coreGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.75)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(258, 256, 48, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

export function initJacketShowcase3D() {
  const container = document.getElementById('jacket-3d-canvas');
  if (!container) return;

  // Pertahankan singleton GLB di memori bersama AnatomyMouse3D
  loadSharedBoltGLB().catch(() => {});

  let isJacketVisible = true;
  const jacketSection = document.getElementById('showcase-jacket');
  if (jacketSection && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => { isJacketVisible = entry.isIntersecting; });
    }, { threshold: 0.05 }).observe(jacketSection);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0.35, 7.3);
  camera.lookAt(0, -0.1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(getOptimalDpr());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  container.appendChild(renderer.domElement);

  scene.environment = createDarkStudioEnvironment(renderer);
  setupCNCStudioLights(scene);

  const { brushedStainless, machinedHexMat, recessMat } = createRealisticStainlessMaterials();

  // Lantai Contact Shadow & Specular Pool untuk Baut Utama dan Komponen Preview
  const floorTex = createStudioFloorPadTexture();
  const mainFloorShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 2.5),
    new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false })
  );
  mainFloorShadow.rotation.x = -Math.PI / 2;
  mainFloorShadow.position.set(0.32, -1.78, 0.05);
  scene.add(mainFloorShadow);

  const previewFloorShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.1),
    new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, opacity: 0.85 })
  );
  previewFloorShadow.rotation.x = -Math.PI / 2;
  previewFloorShadow.position.set(2.05, -1.52, -1.1);
  scene.add(previewFloorShadow);

  function createRegularPolygonShape(radius, sides) {
    const shape = new THREE.Shape();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / 6;
      if (i === 0) shape.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      else shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    shape.closePath();
    return shape;
  }

  function createTorxPath(outerRadius, innerRadius, lobes = 6) {
    const path = new THREE.Path();
    const totalPts = lobes * 2;
    for (let i = 0; i < totalPts; i++) {
      const a = (i / totalPts) * Math.PI * 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    path.closePath();
    return path;
  }

  function createCirclePath(radius) {
    const path = new THREE.Path();
    path.absarc(0, 0, radius, 0, Math.PI * 2, false);
    return path;
  }

  function create5StarShape(outerRadius, innerRadius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    return shape;
  }

  function create12SplineShape(outerRadius, innerRadius, holeRadius = 0) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    if (holeRadius > 0) shape.holes.push(createCirclePath(holeRadius));
    return shape;
  }

  // Generator Ulir V-Thread CNC Tajam dalam 1 Draw Call (LatheGeometry)
  function createCNCThreadedShaft(outerR, rootR, topY, bottomY, threadCount) {
    const pts = [];
    const totalH = topY - bottomY;
    const pitch = totalH / threadCount;

    // Chamfer bawah ujung baut
    pts.push(new THREE.Vector2(0, bottomY - 0.14));
    pts.push(new THREE.Vector2(rootR * 0.72, bottomY - 0.14));
    pts.push(new THREE.Vector2(rootR, bottomY));

    for (let i = 0; i < threadCount; i++) {
      const y0 = bottomY + i * pitch;
      pts.push(new THREE.Vector2(rootR, y0 + pitch * 0.12));
      pts.push(new THREE.Vector2(outerR, y0 + pitch * 0.46));
      pts.push(new THREE.Vector2(outerR, y0 + pitch * 0.56));
      pts.push(new THREE.Vector2(rootR, y0 + pitch * 0.90));
    }

    pts.push(new THREE.Vector2(outerR * 0.98, topY));
    const latheGeo = new THREE.LatheGeometry(pts, 64);
    latheGeo.computeVertexNormals();
    return new THREE.Mesh(latheGeo, brushedStainless);
  }

  // KOMPONEN 01: BAUT HEX STARS DUAL-KEY CNC
  function buildHexStarsBolt() {
    const outerWrapper = new THREE.Group();
    const spinGroup = new THREE.Group();
    outerWrapper.userData.spinGroup = spinGroup;

    // 1. Piringan Flange CNC Lebar dengan Bevel Tajam
    const flangeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.68, 0.16, 72), brushedStainless);
    flangeBase.position.y = 0.76;
    spinGroup.add(flangeBase);

    const flangeBevel = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.62, 0.17, 72), brushedStainless);
    flangeBevel.position.y = 0.925;
    spinGroup.add(flangeBevel);

    const underFlangeLip = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 0.82, 0.08, 64), recessMat);
    underFlangeLip.position.y = 0.65;
    spinGroup.add(underFlangeLip);

    // 2. Kepala Segi Enam (Flat-Faceted Non-Indexed agar ke-6 bidang tegas memantulkan gelap-terang)
    const hexPrismGeo = new THREE.CylinderGeometry(1.34, 1.34, 0.72, 6).toNonIndexed();
    hexPrismGeo.rotateY(Math.PI / 6);
    hexPrismGeo.computeVertexNormals();
    const hexPrismMesh = new THREE.Mesh(hexPrismGeo, machinedHexMat);
    hexPrismMesh.position.y = 1.34;
    spinGroup.add(hexPrismMesh);

    // Mahkota Atas Kepala Segi Enam + Rongga Bintang Torx Dalam
    const hexCrownShape = createRegularPolygonShape(1.31, 6);
    hexCrownShape.holes.push(createTorxPath(0.56, 0.36, 6));
    const hexCrownGeo = new THREE.ExtrudeGeometry(hexCrownShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.035,
      bevelSegments: 2
    });
    hexCrownGeo.rotateX(Math.PI / 2);
    const hexCrownMesh = new THREE.Mesh(hexCrownGeo, brushedStainless);
    hexCrownMesh.position.y = 1.84;
    spinGroup.add(hexCrownMesh);

    // Dinding & Dasar Rongga Bintang Torx Gelap (Deep Recessed Shadow)
    const torxWallShape = createRegularPolygonShape(0.68, 6);
    torxWallShape.holes.push(createTorxPath(0.55, 0.35, 6));
    const torxWallGeo = new THREE.ExtrudeGeometry(torxWallShape, { depth: 0.52, bevelEnabled: false });
    torxWallGeo.rotateX(Math.PI / 2);
    const torxWallMesh = new THREE.Mesh(torxWallGeo, recessMat);
    torxWallMesh.position.y = 1.80;
    spinGroup.add(torxWallMesh);

    const socketFloorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 24), recessMat);
    socketFloorMesh.position.y = 1.28;
    spinGroup.add(socketFloorMesh);

    // 3. Leher Batang Halus (Unthreaded Brushed Shoulder)
    const shankMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.96, 64), brushedStainless);
    shankMesh.position.y = 0.20;
    spinGroup.add(shankMesh);

    // Transisi Bevel dari Leher ke Ulir
    const threadTransition = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.64, 0.10, 64), brushedStainless);
    threadTransition.position.y = -0.32;
    spinGroup.add(threadTransition);

    // 4. Batang Ulir V-Thread CNC Presisi + Bayangan Lembah Ulir
    const threadRootCore = new THREE.Mesh(new THREE.CylinderGeometry(0.625, 0.615, 1.72, 48), recessMat);
    threadRootCore.position.y = -1.18;
    spinGroup.add(threadRootCore);

    const threadedShaft = createCNCThreadedShaft(0.76, 0.61, -0.34, -2.02, 18);
    spinGroup.add(threadedShaft);

    outerWrapper.add(spinGroup);
    return outerWrapper;
  }

  // KOMPONEN 02: MUR HEAD NINJA 12-SPLINE (HIGH STARS)
  function buildHighStarsNut() {
    const outerWrapper = new THREE.Group();
    const group = new THREE.Group();
    outerWrapper.userData.spinGroup = group;
    const holeRadius = 0.62;

    const flangeLowerMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.16, 64), brushedStainless);
    flangeLowerMesh.position.y = -0.88;
    group.add(flangeLowerMesh);

    const grooveMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.44, 1.44, 0.07, 64), recessMat);
    grooveMesh.position.y = -0.77;
    group.add(grooveMesh);

    const flangeUpperMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.15, 64), brushedStainless);
    flangeUpperMesh.position.y = -0.66;
    group.add(flangeUpperMesh);

    const flangeChamferMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.56, 0.14, 64), brushedStainless);
    flangeChamferMesh.position.y = -0.52;
    group.add(flangeChamferMesh);

    const bodyGeo = new THREE.ExtrudeGeometry(create12SplineShape(1.26, 1.14, holeRadius), { depth: 1.15, bevelEnabled: false });
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, machinedHexMat);
    bodyMesh.position.y = 0.62;
    group.add(bodyMesh);

    const neckTransitionMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.25, 0.24, 48), brushedStainless);
    neckTransitionMesh.position.y = 0.74;
    group.add(neckTransitionMesh);

    const crownGeo = new THREE.ExtrudeGeometry(create12SplineShape(0.98, 0.89, holeRadius), {
      depth: 0.36, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3
    });
    crownGeo.rotateX(Math.PI / 2);
    const crownMesh = new THREE.Mesh(crownGeo, brushedStainless);
    crownMesh.position.y = 1.15;
    group.add(crownMesh);

    const innerLinerMesh = new THREE.Mesh(new THREE.CylinderGeometry(holeRadius, holeRadius, 2.2, 36, 1, true), recessMat);
    innerLinerMesh.position.y = 0.05;
    group.add(innerLinerMesh);

    for (let i = 0; i < 14; i++) {
      const innerThreadMesh = new THREE.Mesh(new THREE.TorusGeometry(holeRadius - 0.02, 0.038, 14, 40), brushedStainless);
      innerThreadMesh.rotation.x = Math.PI / 2 + 0.04;
      innerThreadMesh.position.y = -0.85 + i * 0.135;
      group.add(innerThreadMesh);
    }

    outerWrapper.add(group);
    return outerWrapper;
  }

  // KOMPONEN 03: BAUT VISOR PAYUNG BINTANG 5 (UMBRELLA STARS)
  function buildVisorStarsBolt() {
    const outerWrapper = new THREE.Group();
    const group = new THREE.Group();
    outerWrapper.userData.spinGroup = group;

    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.10, 64), brushedStainless);
    rimMesh.position.y = 0.76;
    group.add(rimMesh);

    const conicalMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.75, 0.42, 64), brushedStainless);
    conicalMesh.position.y = 1.01;
    group.add(conicalMesh);

    const star5Geo = new THREE.ExtrudeGeometry(create5StarShape(1.48, 0.58), {
      depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3
    });
    star5Geo.rotateX(Math.PI / 2);
    const star5Mesh = new THREE.Mesh(star5Geo, machinedHexMat);
    star5Mesh.position.y = 1.26;
    group.add(star5Mesh);

    const centerButtonMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 48), brushedStainless);
    centerButtonMesh.position.y = 1.28;
    group.add(centerButtonMesh);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const fluteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.95), recessMat);
      fluteMesh.position.set(Math.cos(a) * 0.72, 1.28, Math.sin(a) * 0.72);
      fluteMesh.rotation.y = -a + Math.PI / 2;
      fluteMesh.rotation.x = 0.14;
      group.add(fluteMesh);
    }

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.45, 48), brushedStainless);
    neckMesh.position.y = 0.52;
    group.add(neckMesh);

    const rootCore = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.53, 1.65, 48), recessMat);
    rootCore.position.y = -0.52;
    group.add(rootCore);

    const visorThreads = createCNCThreadedShaft(0.66, 0.52, 0.28, -1.35, 15);
    group.add(visorThreads);

    outerWrapper.add(group);
    return outerWrapper;
  }

  const models = [buildHexStarsBolt(), buildHighStarsNut(), buildVisorStarsBolt()];
  models.forEach((m) => {
    m.rotation.set(0.24, 0.0, 0.22);
    scene.add(m);
  });

  let isDragging = false;
  let prevPt = { x: 0, y: 0 };
  let downPt = { x: 0, y: 0 };
  let pinchStartDist = null;
  let pinchStartZoom = 1.0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevPt = { x: e.clientX, y: e.clientY };
    downPt = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const active = models[activeJacketIdx];
    const spinTarget = active.userData.spinGroup || active;
    const dx = e.clientX - prevPt.x;
    const dy = e.clientY - prevPt.y;
    prevPt = { x: e.clientX, y: e.clientY };

    spinTarget.rotation.y += dx * 0.011;
    if (!isVerticalLocked) {
      active.rotation.x = THREE.MathUtils.clamp(active.rotation.x + dy * 0.01, -0.75, 0.85);
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) < 6 && e.target === renderer.domElement) {
      toggleJacketVerticalLock();
    }
  });

  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      isDragging = false;
      pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStartZoom = userZoom;
    }
  }, { passive: true });

  renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      userZoom = THREE.MathUtils.clamp(pinchStartZoom * (dist / pinchStartDist), 0.65, 1.45);
    }
  }, { passive: false });

  renderer.domElement.addEventListener('touchend', () => { pinchStartDist = null; });

  function animateJacketStage() {
    requestAnimationFrame(animateJacketStage);
    if (!isJacketVisible) return;
    const isDesktop = window.innerWidth >= 1024;
    const baseScale = isDesktop ? 0.78 : 0.64;

    models.forEach((grp, idx) => {
      const rel = (idx - activeJacketIdx + models.length) % models.length;
      const spinTarget = grp.userData.spinGroup || grp;

      if (rel === 0) {
        // KOMPONEN UTAMA DI TENGAH: Miring elegan & berputar pada poros batangnya sendiri
        grp.visible = true;
        const targetScale = baseScale * userZoom;
        grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, targetScale, 0.08));
        grp.position.x = THREE.MathUtils.lerp(grp.position.x, isDesktop ? 0.08 : 0, 0.08);
        grp.position.y = THREE.MathUtils.lerp(grp.position.y, 0.06, 0.08);
        grp.position.z = THREE.MathUtils.lerp(grp.position.z, 0, 0.08);

        if (!isDragging) spinTarget.rotation.y += 0.0085;

        if (isVerticalLocked) {
          grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, 0.08, 0.12);
          grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, 0, 0.12);
        } else if (!isDragging) {
          // Kemiringan persis gambar referensi: Kepala condong kiri-atas, ujung drat menapak lantai kanan-bawah
          grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, 0.24, 0.06);
          grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, 0.22, 0.06);
        }
      } else if (rel === 1) {
        // KOMPONEN PREVIEW DI KANAN BAWAH: Duduk tegak di atas lantai studio
        grp.visible = true;
        const previewScale = baseScale * 0.28;
        grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, previewScale, 0.08));
        grp.position.x = THREE.MathUtils.lerp(grp.position.x, isDesktop ? 2.05 : 1.15, 0.08);
        grp.position.y = THREE.MathUtils.lerp(grp.position.y, isDesktop ? -1.24 : -1.1, 0.08);
        grp.position.z = THREE.MathUtils.lerp(grp.position.z, -1.1, 0.08);
        grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, 0.18, 0.08);
        grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, 0, 0.08);
        spinTarget.rotation.y += 0.006;
      } else {
        // KOMPONEN KE-3: Disembunyikan agar tidak ada baut kecil melayang di langit kiri-atas
        grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, 0.001, 0.12));
        grp.position.x = THREE.MathUtils.lerp(grp.position.x, -2.5, 0.08);
        grp.position.y = THREE.MathUtils.lerp(grp.position.y, 1.5, 0.08);
        grp.position.z = THREE.MathUtils.lerp(grp.position.z, -3.5, 0.08);
        if (grp.scale.x < 0.02) grp.visible = false;
      }
    });

    mainFloorShadow.position.x = isDesktop ? (isVerticalLocked ? 0.08 : 0.34) : (isVerticalLocked ? 0 : 0.24);
    previewFloorShadow.visible = isDesktop;

    renderer.render(scene, camera);
  }

  animateJacketStage();

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

function updateJacketUI() {
  const data = partsData[activeJacketIdx];
  const nextData = partsData[(activeJacketIdx + 1) % partsData.length];
  const parts = data.counter.split('/');

  const counterEl = document.getElementById('jacket-part-counter');
  if (counterEl && parts.length === 2) {
    counterEl.innerHTML = `${parts[0].trim()} <span class="text-slate-500 font-normal">/ ${parts[1].trim()}</span>`;
  }
  document.getElementById('jacket-title').innerHTML = data.titleHtml;
  document.getElementById('jacket-desc').textContent = data.desc;
  document.getElementById('jacket-mat-grade').textContent = data.grade;
  document.getElementById('jacket-head-badge').textContent = data.badge;
  document.getElementById('next-part-label').textContent = nextData.plainTitle;
}

function toggleJacketVerticalLock() {
  isVerticalLocked = !isVerticalLocked;
  const btn = document.getElementById('btn-jacket-lock');
  if (!btn) return;
  if (isVerticalLocked) {
    btn.innerHTML = '<span>SUMBU X/Z TERKUNCI 90°</span><span class="text-industrial-yellow">✓</span>';
    btn.className = 'px-3 py-1.5 rounded-full bg-industrial-yellow/15 border border-industrial-yellow text-industrial-yellow font-mono font-bold text-[11px] uppercase tracking-[0.15em] transition-all flex items-center gap-1.5';
  } else {
    btn.innerHTML = '<span>KUNCI TEGAK VERTIKAL</span><span class="text-slate-400">›</span>';
    btn.className = 'px-2 py-2 text-slate-300 hover:text-industrial-yellow font-mono text-[11px] uppercase tracking-[0.15em] transition-all flex items-center gap-1.5';
  }
}

document.getElementById('btn-jacket-prev')?.addEventListener('click', () => {
  activeJacketIdx = (activeJacketIdx - 1 + partsData.length) % partsData.length;
  updateJacketUI();
});

document.getElementById('btn-jacket-next')?.addEventListener('click', () => {
  activeJacketIdx = (activeJacketIdx + 1) % partsData.length;
  updateJacketUI();
});

document.getElementById('btn-next-preview-label')?.addEventListener('click', () => {
  activeJacketIdx = (activeJacketIdx + 1) % partsData.length;
  updateJacketUI();
});

document.getElementById('btn-jacket-lock')?.addEventListener('click', () => toggleJacketVerticalLock());

document.getElementById('btn-jacket-rfq')?.addEventListener('click', () => {
  window.selectProductForRFQ(partsData[activeJacketIdx].plainTitle);
});

document.querySelectorAll('.thread-circle').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.thread-circle').forEach((b) => {
      b.className = 'thread-circle w-10 h-10 rounded-full bg-white/[0.02] hover:border-white/40 text-slate-400 hover:text-white border border-white/15 font-mono font-bold text-xs flex items-center justify-center transition-all';
    });
    btn.className = 'thread-circle w-10 h-10 rounded-full bg-industrial-yellow/10 text-industrial-yellow border-2 border-industrial-yellow font-mono font-bold text-xs flex items-center justify-center shadow-[0_0_20px_rgba(245,183,0,0.22)] transition-all';
    document.getElementById('thread-selected-info').textContent = btn.dataset.thread;
  });
});

export function initThreeEngine() {
  initHeroMedusa3D();
  initJacketShowcase3D();
  initAnatomi3D();
}
