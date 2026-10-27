import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { glbLoader, getOptimalDpr, setupHeroMatchedStudioLights } from './shared.js';
import { gateLoop, onResizeDebounced } from '../visibility.js';
/* -------------------------------------------------------------------------- */
/* 1. HERO MEDUSA 3D (DENGAN AUTO-PAUSE INTERSECTION OBSERVER)                */
/* -------------------------------------------------------------------------- */
export async function initHeroMedusa3D() {
  const heroSection = document.getElementById('hero-medusa');
  const cardLens = document.getElementById('hero-card-lens');
  const canvasEl = document.getElementById('hero-logo-3d-canvas');
  const emblemImg = document.getElementById('hero-3d-logo-img');
  const interactiveStage = document.getElementById('hero-3d-interactive-stage');
  const bgTypography = document.getElementById('hero-elegance-layer');

  if (!heroSection || !cardLens || !canvasEl) return;

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

  // FASE 1 (TBT): yield ke main thread di antara tahap init sinkron agar long
  // task terpecah; rAF + setTimeout memberi kesempatan paint/input berjalan.
  const yieldToMain = () => new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });

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

    await yieldToMain();

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();

    await yieldToMain();

    const lights = setupHeroMatchedStudioLights(scene);
    topRimLight = lights.topRimLight;
    goldKeyLight = lights.goldKeyLight;
    sweepSpotLight = lights.sweepSpotLight;

    scene.add(emblemGroup);

    await yieldToMain();

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

    // SPEK PERFORMA: resize di-debounce; lewati bila ukuran + DPR tidak berubah
    // (setSize mereset drawing buffer walau ukuran sama).
    let lastHeroSize = { w: 0, h: 0, dpr: 0 };
    window.addEventListener('resize', onResizeDebounced(() => {
      if (!interactiveStage) return;
      const w = interactiveStage.clientWidth;
      const h = interactiveStage.clientHeight;
      const dpr = getOptimalDpr();
      if (w === lastHeroSize.w && h === lastHeroSize.h && dpr === lastHeroSize.dpr) return;
      lastHeroSize = { w, h, dpr };
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h);
    }, 150));

    // WARN-06: bila konteks WebGL hilang (tekanan memori HP), tampilkan kembali
    // emblem statis agar stage tidak kosong permanen.
    canvasEl.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (emblemImg) {
        emblemImg.style.display = 'block';
        emblemImg.style.opacity = '1';
      }
    });

    // Kompilasi shader/material sebelum render pertama (tickHero). Bila gagal,
    // render pertama tetap jalan dan mengkompilasi on-demand seperti sebelumnya.
    if (renderer && scene && camera) {
      try { await renderer.compileAsync(scene, camera); } catch (compileErr) { console.warn('Hero compileAsync gagal, lanjut render biasa:', compileErr); }
    }
  } catch (err) {
    console.warn('Hero WebGL fallback:', err);
  }

  let animTime = 0;
  let lastCardTransform = '';
  let lastBgTransform = '';
  function tickHero() {
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

    // Tulis transform hanya bila string-nya berubah (hemat style recalc tiap frame).
    const cardTransform = `perspective(1200px) rotateX(${(-curMouseY * 3.2).toFixed(2)}deg) rotateY(${(curMouseX * 4.2).toFixed(2)}deg)`;
    if (cardTransform !== lastCardTransform) {
      cardLens.style.transform = cardTransform;
      lastCardTransform = cardTransform;
    }
    if (bgTypography) {
      const bgTransform = `translate3d(${(-curMouseX * 12).toFixed(1)}px, calc(-50% + ${(-curMouseY * 6).toFixed(1)}px), 0)`;
      if (bgTransform !== lastBgTransform) {
        bgTypography.style.transform = bgTransform;
        lastBgTransform = bgTransform;
      }
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
  }
  // SPEK PERFORMA: loop hanya hidup saat hero terlihat + tab aktif. Saat keluar
  // viewport / tab hidden, RAF di-cancel total (bukan early return); saat kembali,
  // SATU loop dilanjutkan dari state terakhir tanpa re-create renderer/model/PMREM.
  // Bila WebGL gagal (renderer tidak terbentuk), loop tidak dijalankan sama sekali
  // dan gambar emblem statis tetap menjadi fallback.
  try {
    if (renderer && scene && camera) gateLoop(heroSection, tickHero, 0);
  } catch (err) {
    console.warn('Hero gateLoop gagal:', err);
  }
}

