import * as THREE from 'three';
import { loadSharedBoltGLB, getOptimalDpr, createDarkStudioEnvironment, setupCNCStudioLights, normalizeBoltModel } from './shared.js';
import { whenNear, onResizeDebounced } from '../visibility.js';
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

  // SPEK PERFORMA: registrasi lifecycle saja di sini — tidak ada GLB, renderer,
  // scene, atau PMREM sebelum canvas tersebut terlihat (whenNear 400 px).
  // Tiap canvas di-init SATU KALI (WeakSet + disconnect di whenNear).
  const initializedCanvases = new WeakSet();
  canvases.forEach((canvas) => {
    whenNear(canvas, () => {
      if (initializedCanvases.has(canvas)) return;
      initializedCanvases.add(canvas);
      initOneCanvas(canvas);
    }, 400);
  });

  function showAnatomiFallback(canvas) {
    const fb = canvas.parentElement.querySelector('.anatomi-fallback');
    if (fb) fb.classList.remove('hidden');
  }

  function initOneCanvas(canvas) {
    loadSharedBoltGLB().then((gltf) => {
      const src = gltf.scene;
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

        // SPEK PERFORMA: render yang tertunda dieksekusi saat canvas terlihat lagi.
        let canvasVisible = true;
        let needsRender = false;
        const requestRender = () => {
          if (canvasVisible) renderer.render(scene, camera);
          else needsRender = true;
        };
        if ('IntersectionObserver' in window) {
          new IntersectionObserver((entries) => {
            canvasVisible = entries[0].isIntersecting;
            if (canvasVisible && needsRender) {
              needsRender = false;
              renderer.render(scene, camera);
            }
          }, { threshold: 0 }).observe(canvas);
        }

        // SPEK PERFORMA: listener window hanya selama drag; render saat drag
        // dikoalesi maksimal 1/frame (layar 120 Hz tidak memicu >60 render/detik).
        let isDragging = false;
        let prevPt = { x: 0, y: 0 };
        let renderQueued = false;
        const queueRender = () => {
          if (renderQueued) return;
          renderQueued = true;
          requestAnimationFrame(() => {
            renderQueued = false;
            requestRender();
          });
        };
        const onDragMove = (e) => {
          if (!isDragging) return;
          const dx = e.clientX - prevPt.x;
          const dy = e.clientY - prevPt.y;
          prevPt = { x: e.clientX, y: e.clientY };
          stageGroup.rotation.y += dx * 0.012;
          stageGroup.rotation.x = THREE.MathUtils.clamp(stageGroup.rotation.x + dy * 0.012, -0.8, 0.8);
          queueRender();
        };
        const onDragEnd = () => {
          isDragging = false;
          window.removeEventListener('pointermove', onDragMove);
          window.removeEventListener('pointerup', onDragEnd);
        };
        canvas.addEventListener('pointerdown', (e) => {
          isDragging = true;
          prevPt = { x: e.clientX, y: e.clientY };
          window.addEventListener('pointermove', onDragMove, { passive: true });
          window.addEventListener('pointerup', onDragEnd);
        });

        // SPEK PERFORMA: resize di-debounce; lewati bila ukuran + DPR sama;
        // resize saat offscreen hanya perbarui ukuran, render ditunda.
        let lastAnatomiSize = { w: 0, h: 0, dpr: 0 };
        window.addEventListener('resize', onResizeDebounced(() => {
          const nw = canvas.clientWidth || 320;
          const nh = canvas.clientHeight || 260;
          const dpr = getOptimalDpr();
          if (nw === lastAnatomiSize.w && nh === lastAnatomiSize.h && dpr === lastAnatomiSize.dpr) return;
          lastAnatomiSize = { w: nw, h: nh, dpr };
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(dpr);
          renderer.setSize(nw, nh);
          requestRender();
        }, 150));
      } catch (err) {
        showAnatomiFallback(canvas);
      }
    }).catch(() => {
      showAnatomiFallback(canvas);
    });
  }
}

