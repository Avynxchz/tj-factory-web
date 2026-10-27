import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 1. Deteksi layar HP untuk membatasi PixelRatio agar GPU HP dingin & stabil 60 FPS
export const getOptimalDpr = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 2);

// 2. Cache Singleton untuk GLB Baut & Tekstur Brushed CNC agar hanya dibuat 1 kali di RAM
let cachedBoltGltfPromise = null;
let sharedBrushedTex = null;
// Cache material stainless (CLEAN-12)
let cachedStainlessMaterials = null;
export const glbLoader = new GLTFLoader();

export function loadSharedBoltGLB() {
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
export function createDarkStudioEnvironment(renderer) {
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
  // SPEK PERFORMA: geometri & material scene env hanya dipakai untuk memanggang
  // tekstur — dispose setelah fromScene agar tidak menahan memori per renderer.
  envScene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
    mats.forEach((m) => m.dispose());
  });
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

export function createRealisticStainlessMaterials() {
  if (cachedStainlessMaterials) return cachedStainlessMaterials;
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

  cachedStainlessMaterials = { brushedStainless, machinedHexMat, recessMat };
  return cachedStainlessMaterials;
}

function applyHeroMatchedBoltMaterial(rootMesh) {
  const { brushedStainless } = createRealisticStainlessMaterials();
  rootMesh.traverse((child) => {
    if (child.isMesh) {
      child.material = brushedStainless;
    }
  });
}

export function normalizeBoltModel(srcScene, targetSize = 2.55) {
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

