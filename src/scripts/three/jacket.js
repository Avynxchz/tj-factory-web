import * as THREE from 'three';
import { partsData } from '../../data/products.js';
import { createDarkStudioEnvironment, setupCNCStudioLights, createRealisticStainlessMaterials, getOptimalDpr } from './shared.js';
import { gateLoop, onResizeDebounced } from '../visibility.js';
// Guard double-init jacket (CLEAN-08) — dipindah ke modul jacket (dulu di shared).
let jacketInitialized = false;
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
  if (jacketInitialized) return;
  jacketInitialized = true;

  // CRIT-01: bungkus seluruh init jacket — throw (mis. WebGL gagal) tidak boleh
  // menghentikan initAnatomi3D() yang dipanggil sesudahnya di index.astro.
  // (Badan fungsi sengaja tidak di-indent ulang agar diff tetap bedah.)
  try {

  // SPEK PERFORMA: preload GLB jacket DIHAPUS — jacket tidak memakai GLB itu;
  // baris lama menarik GLB anatomi lebih awal dan membatalkan lazy-load.

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
  }, { passive: true });

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

  function tickJacket() {
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

  // SPEK PERFORMA: loop hanya hidup saat canvas terlihat + tab aktif; keluar
  // viewport = cancel RAF total, kembali = resume tanpa reinit. RISIKO RESIDUAL:
  // animasi settle (lerp scale/posisi awal) kini baru berjalan saat canvas
  // terlihat — bila margin whenNear 600 px ternyata kurang, settle bisa terlihat
  // user; perlu cek visual di HP owner (tanpa warm-up tick tambahan).
  gateLoop(container, tickJacket, 0);

  // SPEK PERFORMA: resize di-debounce; lewati bila ukuran + DPR tidak berubah.
  let lastJacketSize = { w: 0, h: 0, dpr: 0 };
  window.addEventListener('resize', onResizeDebounced(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = getOptimalDpr();
    if (w === lastJacketSize.w && h === lastJacketSize.h && dpr === lastJacketSize.dpr) return;
    lastJacketSize = { w, h, dpr };
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
  }, 150));
  } catch (err) {
    // Fallback nyata (bukan catch kosong): sembunyikan panggung, tampilkan pesan statis.
    console.warn('Jacket 3D gagal dimuat, menampilkan fallback statis:', err);
    const fb = document.getElementById('jacket-3d-fallback');
    if (fb) { fb.classList.remove('hidden'); fb.classList.add('flex'); }
    container.classList.add('hidden');
  }
}
function updateJacketUI() {
  const data = partsData[activeJacketIdx];
  if (!data) return;
  const nextData = partsData[(activeJacketIdx + 1) % partsData.length];
  const parts = data.counter.split('/');

  const counterEl = document.getElementById('jacket-part-counter');
  if (counterEl && parts.length === 2) {
    counterEl.innerHTML = `${parts[0].trim()} <span class="text-slate-500 font-normal">/ ${parts[1].trim()}</span>`;
  }
  const titleEl = document.getElementById('jacket-title');
  if (titleEl) titleEl.innerHTML = data.titleHtml;
  const descEl = document.getElementById('jacket-desc');
  if (descEl) descEl.textContent = data.desc;
  const gradeEl = document.getElementById('jacket-mat-grade');
  if (gradeEl) gradeEl.textContent = data.grade;
  const badgeEl = document.getElementById('jacket-head-badge');
  if (badgeEl) badgeEl.textContent = data.badge;
  const nextEl = document.getElementById('next-part-label');
  if (nextEl && nextData) nextEl.textContent = nextData.plainTitle;
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

