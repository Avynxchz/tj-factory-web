import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    /* -------------------------------------------------------------------------- */
    /* HELPER PENGHEMAT GPU (TUGAS 2) — DPR adaptif + cache GLB & RoomEnvironment  */
    /* -------------------------------------------------------------------------- */
    // DPR adaptif: HP dibatasi 1.25 (tetap tajam, jauh lebih ringan), desktop sampai 2
    const getOptimalDpr = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 2);

    // Singleton Promise: baut_hexstar.glb diunduh & di-parse SEKALI, dipakai bersama
    // jacket showcase + anatomi (tiap pemakai meng-clone scene-nya sendiri via normalizeBoltModel)
    let sharedBoltGLBPromise = null;
    function loadSharedBoltGLB() {
      if (!sharedBoltGLBPromise) {
        sharedBoltGLBPromise = new Promise((resolve, reject) => {
          new GLTFLoader().load('./aset/baut_hexstar.glb', (gltf) => resolve(gltf.scene), undefined, reject);
        });
      }
      return sharedBoltGLBPromise;
    }

    // Singleton scene RoomEnvironment: scene-nya renderer-agnostic (cuma data mesh),
    // jadi aman dipakai ulang oleh tiap PMREMGenerator. Catatan: TEKSTUR hasil PMREM
    // tidak bisa dishare antar konteks WebGL (tiap renderer punya konteks sendiri),
    // jadi tiap renderer tetap generate env-nya sendiri — tapi generatornya wajib
    // di-dispose setelah pakai agar tidak menyumbat memori GPU.
    let sharedRoomScene = null;
    function getSharedRoomEnvironment() {
      if (!sharedRoomScene) sharedRoomScene = new RoomEnvironment();
      return sharedRoomScene;
    }

    /* 1. STAGE 1: MEDUSA HERO — 3D SPINNING TJ FACTORY EMBLEM & LIGHTING         */
    /* -------------------------------------------------------------------------- */
    function initHeroMedusa3D() {
      const heroSection = document.getElementById('hero-medusa');
      const cardLens = document.getElementById('hero-card-lens');
      const canvasEl = document.getElementById('hero-logo-3d-canvas');
      const emblemImg = document.getElementById('hero-3d-logo-img');
      const interactiveStage = document.getElementById('hero-3d-interactive-stage');
      const bgTypography = document.getElementById('hero-elegance-layer');

      if (!heroSection || !cardLens || !canvasEl) return;

      // Viewport Governor: hentikan kerja render saat hero tidak terlihat di layar
      let isHeroVisible = true;
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => { isHeroVisible = entry.isIntersecting; });
      }, { threshold: 0.05 }).observe(heroSection);

      let targetMouseX = 0, targetMouseY = 0;
      let curMouseX = 0, curMouseY = 0;
      let isDragging = false;
      let startPointerX = 0;
      let manualSpinVel = 0;

      function handlePointerMove(e) {
        const rect = heroSection.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
        const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
        targetMouseX = ((clientX - rect.left) / rect.width - 0.5) * 2;
        targetMouseY = ((clientY - rect.top) / rect.height - 0.5) * 2;

        if (isDragging) {
          const deltaX = clientX - startPointerX;
          manualSpinVel = deltaX * 0.004;
          if (emblemGroup) {
            emblemGroup.rotation.z += deltaX * 0.008;
          }
          startPointerX = clientX;
        }
      }

      function handlePointerLeave() {
        targetMouseX = 0;
        targetMouseY = 0;
      }

      heroSection.addEventListener('pointermove', handlePointerMove);
      heroSection.addEventListener('pointerleave', handlePointerLeave);

      if (interactiveStage) {
        interactiveStage.addEventListener('pointerdown', (e) => {
          isDragging = true;
          startPointerX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
          interactiveStage.style.cursor = 'grabbing';
        });

        window.addEventListener('pointerup', () => {
          if (isDragging) {
            isDragging = false;
            interactiveStage.style.cursor = 'grab';
          }
        });
      }

      let emblemGroup = new THREE.Group();
      let scene, camera, renderer;
      let topRimLight, goldKeyLight, sweepSpotLight, fillLight, bottomGlow;

      try {
        const width = interactiveStage ? interactiveStage.clientWidth : 400;
        const height = interactiveStage ? interactiveStage.clientHeight : 400;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
        camera.position.set(0, 0, 4.3);

        renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(getOptimalDpr());
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(getSharedRoomEnvironment(), 0.03).texture;
        pmrem.dispose();

        topRimLight = new THREE.DirectionalLight(0xffffff, 1.5);
        topRimLight.position.set(0, 5, 2.5);
        scene.add(topRimLight);

        goldKeyLight = new THREE.DirectionalLight(0xffd56b, 1.7);
        goldKeyLight.position.set(4, 0, 3.5);
        scene.add(goldKeyLight);

        sweepSpotLight = new THREE.DirectionalLight(0xfff1b8, 1.2);
        sweepSpotLight.position.set(-3, 3, 3.2);
        scene.add(sweepSpotLight);

        fillLight = new THREE.DirectionalLight(0x4a5568, 0.5);
        fillLight.position.set(-4, -2, 2);
        scene.add(fillLight);

        bottomGlow = new THREE.PointLight(0xf5b700, 0.9, 10);
        bottomGlow.position.set(0, -3.2, 2);
        scene.add(bottomGlow);

        scene.add(emblemGroup);

        const loader = new GLTFLoader();
        loader.load(
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
                child.castShadow = true;
                child.receiveShadow = true;
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
        console.warn('WebGL fallback to 3D CSS:', err);
      }

      let animTime = 0;
      let cssRotZ = 0;

      function renderLoop() {
        requestAnimationFrame(renderLoop);
        if (!isHeroVisible) return;
        animTime += 0.02;

        curMouseX += (targetMouseX - curMouseX) * 0.08;
        curMouseY += (targetMouseY - curMouseY) * 0.08;

        if (!isDragging) {
          if (emblemGroup) {
            emblemGroup.rotation.z -= 0.0035;
          }
          cssRotZ -= 0.2;
        }

        if (Math.abs(manualSpinVel) > 0.0001) {
          if (emblemGroup) emblemGroup.rotation.z += manualSpinVel;
          manualSpinVel *= 0.92;
        }

        if (goldKeyLight && topRimLight && sweepSpotLight) {
          const tLight = animTime * 1.35;
          goldKeyLight.position.x = Math.sin(tLight) * 4.6 + 0.5;
          goldKeyLight.position.y = Math.cos(tLight * 0.75) * 3.2;
          goldKeyLight.position.z = Math.cos(tLight * 1.1) * 1.2 + 3.6;

          topRimLight.position.x = Math.cos(tLight * 0.85) * 3.8;
          topRimLight.position.y = Math.sin(tLight * 0.5) * 1.2 + 4.5;

          sweepSpotLight.position.x = Math.sin(-tLight * 0.95) * 4.0;
          sweepSpotLight.position.y = Math.cos(-tLight * 0.95) * 3.0;
        }

        if (emblemGroup) {
          emblemGroup.rotation.x = -curMouseY * 0.16;
          emblemGroup.rotation.y = curMouseX * 0.20;
          emblemGroup.position.y = Math.sin(animTime) * 0.04;
        }

        if (emblemImg && emblemImg.style.display !== 'none' && emblemImg.style.opacity !== '0') {
          const floatY = Math.sin(animTime) * 4;
          emblemImg.style.transform = `perspective(1000px) translateY(${floatY.toFixed(1)}px) rotateZ(${cssRotZ.toFixed(1)}deg) rotateX(${(-curMouseY * 8).toFixed(1)}deg) rotateY(${(curMouseX * 10).toFixed(1)}deg)`;
        }

        const cardTiltX = -curMouseY * 3.2;
        const cardTiltY = curMouseX * 4.2;
        cardLens.style.transform = `perspective(1200px) rotateX(${cardTiltX.toFixed(2)}deg) rotateY(${cardTiltY.toFixed(2)}deg)`;

        if (bgTypography) {
          const bgX = -curMouseX * 12;
          const bgY = -curMouseY * 6;
          bgTypography.style.transform = `translate3d(${bgX.toFixed(1)}px, calc(-50% + ${bgY.toFixed(1)}px), 0)`;
        }

        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      }

      renderLoop();
    }

    /* -------------------------------------------------------------------------- */
    /* HELPER MATERIAL & PENCAHAYAAN STUDIO EMAS-STAINLESS (IDENTIK HERO LOGO)    */
    /* -------------------------------------------------------------------------- */
    function setupHeroMatchedStudioLights(scene) {
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

    function applyHeroMatchedBoltMaterial(rootMesh) {
      const satinStainless = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xeef2f7),
        metalness: 0.88,
        roughness: 0.20,
        envMapIntensity: 1.18
      });

      rootMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = satinStainless;
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
    /* 2. STAGE 2: JACKET MASTERY 3D SHOWCASE (FLY-IN DARI KANAN BAWAH KE TENGAH) */
    /* -------------------------------------------------------------------------- */
    const partsData = [
      {
        counter: '01 / 03',
        titleHtml: 'Baut Hex Stars <br /><span class="text-industrial-yellow">Dual-Key CNC</span>',
        plainTitle: 'Baut Hex Stars Dual-Key',
        desc: 'Desain kepala baut 2 kunci khas TJ FACTORY yang menggabungkan segi enam luar (Kunci Ring/Sok) dengan rongga bintang Torx di tengah serta flange CNC menyatu.',
        grade: 'STAINLESS SUS 304',
        badge: 'MODEL 2 KUNCI // HEX + TORX'
      },
      {
        counter: '02 / 03',
        titleHtml: 'Mur Head Ninja <br /><span class="text-industrial-yellow">12-Spline High Stars</span>',
        plainTitle: 'Mur Head Ninja 12-Spline',
        desc: 'Mur silinder head tinggi (HIGH STARS) dengan mahkota 12-point spline bertingkat dan lubang ulir drat tembus presisi untuk ketahanan torsi tinggi pada Ninja R/RR.',
        grade: 'STAINLESS SOLID BAR',
        badge: 'HIGH STARS CROWN // NINJA R/RR'
      },
      {
        counter: '03 / 03',
        titleHtml: 'Baut Visor Payung <br /><span class="text-industrial-yellow">Umbrella Stars CNC</span>',
        plainTitle: 'Baut Visor Payung Bintang 5',
        desc: 'Kepala baut model payung lebar profil rendah (Umbrella Stars) dengan pahatan motif bintang 5 timbul untuk menjepit mika visor Ninja RR Old & bodi secara merata.',
        grade: 'STAINLESS 304 BUBUT',
        badge: 'UMBRELLA 5-STAR // M6 DRAT 10'
      }
    ];

    let activeJacketIdx = 0;
    let isVerticalLocked = false;
    let userZoom = 1.0;

    function initJacketShowcase3D() {
      const container = document.getElementById('jacket-3d-canvas');
      if (!container) return;

      // Viewport Governor: hentikan kerja animasi saat showcase tidak terlihat di layar
      let isJacketVisible = true;
      const jacketSection = document.getElementById('showcase-jacket');
      if (jacketSection) {
        new IntersectionObserver((entries) => {
          entries.forEach((entry) => { isJacketVisible = entry.isIntersecting; });
        }, { threshold: 0.05 }).observe(jacketSection);
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 0.3, 7.5);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(getOptimalDpr());
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      container.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(getSharedRoomEnvironment(), 0.03).texture;
      pmrem.dispose();

      setupHeroMatchedStudioLights(scene);

      const stainlessMat = new THREE.MeshStandardMaterial({
        color: 0xeef2f7,
        metalness: 0.88,
        roughness: 0.20,
        envMapIntensity: 1.18
      });

      const recessMat = new THREE.MeshStandardMaterial({
        color: 0x1b222c,
        metalness: 0.82,
        roughness: 0.35
      });

      function createRegularPolygonShape(radius, sides) {
        const shape = new THREE.Shape();
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
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

      function buildHexStarsBolt() {
        const group = new THREE.Group();
        const flangeMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.16, 64), stainlessMat);
        flangeMesh.position.y = 0.86;
        group.add(flangeMesh);

        const flangeChamferMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.36, 0.08, 64), stainlessMat);
        flangeChamferMesh.position.y = 0.98;
        group.add(flangeChamferMesh);

        const hexBaseGeo = new THREE.ExtrudeGeometry(createRegularPolygonShape(1.12, 6), { depth: 0.24, bevelEnabled: false });
        hexBaseGeo.rotateX(Math.PI / 2);
        const hexBaseMesh = new THREE.Mesh(hexBaseGeo, stainlessMat);
        hexBaseMesh.position.y = 1.22;
        group.add(hexBaseMesh);

        const hexTopShape = createRegularPolygonShape(1.12, 6);
        hexTopShape.holes.push(createTorxPath(0.48, 0.32, 6));
        const hexTopGeo = new THREE.ExtrudeGeometry(hexTopShape, {
          depth: 0.52, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 4
        });
        hexTopGeo.rotateX(Math.PI / 2);
        const hexTopMesh = new THREE.Mesh(hexTopGeo, stainlessMat);
        hexTopMesh.position.y = 1.74;
        group.add(hexTopMesh);

        const socketFloorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 24), recessMat);
        socketFloorMesh.position.y = 1.24;
        group.add(socketFloorMesh);

        const shankMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 1.35, 48), stainlessMat);
        shankMesh.position.y = 0.15;
        group.add(shankMesh);

        const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.43, 2.0, 48), stainlessMat);
        coreMesh.position.y = -1.25;
        group.add(coreMesh);

        for (let i = 0; i < 17; i++) {
          const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.495, 0.046, 16, 48), stainlessMat);
          ringMesh.rotation.x = Math.PI / 2 + 0.055;
          ringMesh.position.y = -0.38 - i * 0.105;
          group.add(ringMesh);
        }

        const tipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.32, 0.18, 48), stainlessMat);
        tipMesh.position.y = -2.25;
        group.add(tipMesh);
        return group;
      }

      function buildHighStarsNut() {
        const group = new THREE.Group();
        const holeRadius = 0.62;

        const flangeLowerMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.54, 1.54, 0.14, 64), stainlessMat);
        flangeLowerMesh.position.y = -0.88;
        group.add(flangeLowerMesh);

        const grooveMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.44, 1.44, 0.06, 64), recessMat);
        grooveMesh.position.y = -0.78;
        group.add(grooveMesh);

        const flangeUpperMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.54, 1.54, 0.14, 64), stainlessMat);
        flangeUpperMesh.position.y = -0.68;
        group.add(flangeUpperMesh);

        const flangeChamferMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.54, 0.12, 64), stainlessMat);
        flangeChamferMesh.position.y = -0.55;
        group.add(flangeChamferMesh);

        const bodyGeo = new THREE.ExtrudeGeometry(create12SplineShape(1.26, 1.15, holeRadius), { depth: 1.15, bevelEnabled: false });
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeo, stainlessMat);
        bodyMesh.position.y = 0.62;
        group.add(bodyMesh);

        const neckTransitionMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.25, 0.24, 48), stainlessMat);
        neckTransitionMesh.position.y = 0.74;
        group.add(neckTransitionMesh);

        const crownGeo = new THREE.ExtrudeGeometry(create12SplineShape(0.98, 0.90, holeRadius), {
          depth: 0.36, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3
        });
        crownGeo.rotateX(Math.PI / 2);
        const crownMesh = new THREE.Mesh(crownGeo, stainlessMat);
        crownMesh.position.y = 1.15;
        group.add(crownMesh);

        const innerLinerMesh = new THREE.Mesh(new THREE.CylinderGeometry(holeRadius, holeRadius, 2.2, 36, 1, true), recessMat);
        innerLinerMesh.position.y = 0.05;
        group.add(innerLinerMesh);

        for (let i = 0; i < 14; i++) {
          const innerThreadMesh = new THREE.Mesh(new THREE.TorusGeometry(holeRadius - 0.02, 0.038, 14, 40), stainlessMat);
          innerThreadMesh.rotation.x = Math.PI / 2 + 0.04;
          innerThreadMesh.position.y = -0.85 + i * 0.135;
          group.add(innerThreadMesh);
        }
        return group;
      }

      function buildVisorStarsBolt() {
        const group = new THREE.Group();
        const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.09, 64), stainlessMat);
        rimMesh.position.y = 0.76;
        group.add(rimMesh);

        const conicalMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.75, 0.42, 64), stainlessMat);
        conicalMesh.position.y = 1.01;
        group.add(conicalMesh);

        const star5Geo = new THREE.ExtrudeGeometry(create5StarShape(1.48, 0.58), {
          depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3
        });
        star5Geo.rotateX(Math.PI / 2);
        const star5Mesh = new THREE.Mesh(star5Geo, stainlessMat);
        star5Mesh.position.y = 1.26;
        group.add(star5Mesh);

        const centerButtonMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 48), stainlessMat);
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

        const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.26, 48), stainlessMat);
        neckMesh.position.y = 0.59;
        group.add(neckMesh);

        const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.43, 1.45, 48), stainlessMat);
        coreMesh.position.y = -0.25;
        group.add(coreMesh);

        for (let i = 0; i < 13; i++) {
          const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.495, 0.044, 14, 48), stainlessMat);
          ringMesh.rotation.x = Math.PI / 2 + 0.055;
          ringMesh.position.y = 0.42 - i * 0.105;
          group.add(ringMesh);
        }

        const tipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.32, 0.16, 48), stainlessMat);
        tipMesh.position.y = -1.02;
        group.add(tipMesh);
        return group;
      }

      const models = [buildHexStarsBolt(), buildHighStarsNut(), buildVisorStarsBolt()];
      models.forEach((m) => {
        m.rotation.set(0.32, 0.5, -0.15);
        scene.add(m);
      });

      // Jika file ./aset/baut_hexstar.glb tersedia, gunakan untuk komponen 01 agar konsisten
      // (GLB dishare dengan anatomi via loadSharedBoltGLB — diunduh & di-parse sekali saja)
      loadSharedBoltGLB().then((boltScene) => {
        const realBolt = normalizeBoltModel(boltScene, 4.2);
        realBolt.rotation.copy(models[0].rotation);
        realBolt.position.copy(models[0].position);
        realBolt.scale.copy(models[0].scale);
        scene.remove(models[0]);
        models[0] = realBolt;
        scene.add(realBolt);
      }).catch(() => {});

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
        const dx = e.clientX - prevPt.x;
        const dy = e.clientY - prevPt.y;
        prevPt = { x: e.clientX, y: e.clientY };

        active.rotation.y += dx * 0.01;
        if (!isVerticalLocked) {
          active.rotation.x = THREE.MathUtils.clamp(active.rotation.x + dy * 0.01, -1.0, 1.0);
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
          userZoom = THREE.MathUtils.clamp(pinchStartZoom * (dist / pinchStartDist), 0.6, 1.5);
        }
      }, { passive: false });

      renderer.domElement.addEventListener('touchend', () => { pinchStartDist = null; });

      function animateJacketStage() {
        requestAnimationFrame(animateJacketStage);
        if (!isJacketVisible) return;
        const isDesktop = window.innerWidth >= 1024;
        const baseScale = isDesktop ? 0.68 : 0.56;

        models.forEach((grp, idx) => {
          const rel = (idx - activeJacketIdx + models.length) % models.length;

          if (rel === 0) {
            const targetScale = baseScale * userZoom;
            grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, targetScale, 0.08));
            grp.position.x = THREE.MathUtils.lerp(grp.position.x, isDesktop ? 0.15 : 0, 0.08);
            grp.position.y = THREE.MathUtils.lerp(grp.position.y, 0.05, 0.08);
            grp.position.z = THREE.MathUtils.lerp(grp.position.z, 0, 0.08);

            if (!isDragging) grp.rotation.y += 0.012;

            if (isVerticalLocked) {
              grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, 0, 0.12);
              grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, 0, 0.12);
            } else if (!isDragging) {
              grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, 0.30, 0.05);
              grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, -0.14, 0.05);
            }
          } else if (rel === 1) {
            const previewScale = baseScale * 0.28;
            grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, previewScale, 0.08));
            grp.position.x = THREE.MathUtils.lerp(grp.position.x, isDesktop ? 2.65 : 1.25, 0.08);
            grp.position.y = THREE.MathUtils.lerp(grp.position.y, isDesktop ? -1.15 : 1.15, 0.08);
            grp.position.z = THREE.MathUtils.lerp(grp.position.z, -1.2, 0.08);
            grp.rotation.y += 0.008;
          } else {
            const exitScale = baseScale * 0.18;
            grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, exitScale, 0.08));
            grp.position.x = THREE.MathUtils.lerp(grp.position.x, -2.8, 0.07);
            grp.position.y = THREE.MathUtils.lerp(grp.position.y, 2.6, 0.07);
            grp.position.z = THREE.MathUtils.lerp(grp.position.z, -3.5, 0.07);
          }
        });

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

      document.getElementById('jacket-part-counter').textContent = data.counter;
      document.getElementById('jacket-title').innerHTML = data.titleHtml;
      document.getElementById('jacket-desc').textContent = data.desc;
      document.getElementById('jacket-mat-grade').textContent = data.grade;
      document.getElementById('jacket-head-badge').textContent = data.badge;
      document.getElementById('next-part-label').textContent = nextData.plainTitle;
    }

    function toggleJacketVerticalLock() {
      isVerticalLocked = !isVerticalLocked;
      const btn = document.getElementById('btn-jacket-lock');
      if (isVerticalLocked) {
        btn.textContent = '[Sumbu X/Z Terkunci Tegak 90°]';
        btn.className = 'px-4 py-3 rounded-full bg-industrial-yellow text-carbon-950 font-mono font-bold text-[11px] uppercase tracking-wider transition-all';
      } else {
        btn.textContent = '[Kunci Tegak Vertikal]';
        btn.className = 'px-4 py-3 rounded-full bg-carbon-900/85 hover:border-industrial-yellow text-slate-200 border border-carbon-700 font-mono text-[11px] uppercase tracking-wider transition-all';
      }
    }

    document.getElementById('btn-jacket-prev').addEventListener('click', () => {
      activeJacketIdx = (activeJacketIdx - 1 + partsData.length) % partsData.length;
      updateJacketUI();
    });

    document.getElementById('btn-jacket-next').addEventListener('click', () => {
      activeJacketIdx = (activeJacketIdx + 1) % partsData.length;
      updateJacketUI();
    });

    document.getElementById('btn-next-preview-label')?.addEventListener('click', () => {
      activeJacketIdx = (activeJacketIdx + 1) % partsData.length;
      updateJacketUI();
    });

    document.getElementById('btn-jacket-lock').addEventListener('click', () => toggleJacketVerticalLock());

    document.getElementById('btn-jacket-rfq').addEventListener('click', () => {
      window.selectProductForRFQ(partsData[activeJacketIdx].plainTitle);
    });

    document.querySelectorAll('.thread-circle').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.thread-circle').forEach(b => {
          b.className = 'thread-circle w-11 h-11 rounded-full bg-carbon-900/90 hover:border-white text-slate-200 border border-carbon-600 font-mono font-bold text-xs flex items-center justify-center transition-all';
        });
        btn.className = 'thread-circle w-11 h-11 rounded-full bg-white text-carbon-950 font-mono font-bold text-xs flex items-center justify-center shadow-lg transition-all';
        document.getElementById('thread-selected-info').textContent = btn.dataset.thread;
      });
    });

    /* -------------------------------------------------------------------------- */
function initAnatomi3D() {
      const section = document.getElementById('anatomi-3d');
      if (!section) return;
      const canvases = section.querySelectorAll('.anatomi-canvas');
      if (!canvases.length) return;

      // 4 Postur Berbeda agar Baut Simetris Terlihat Dinamis & Tidak Terpotong Kotak (Persis 4 Postur Mouse Logitech G)
      const POSTURES = {
        // 01: Menghadap Depan-Atas (Menonjolkan Mahkota Segi-6, Soket Bintang 6-Titik & Flange secara utuh)
        crown: {
          camPos: [0, 0.35, 4.15],
          rot: [0.68, 0.45, -0.22],
          scale: 2.35
        },
        // 02: Tidur Horizontal Kiri-ke-Kanan (Persis Mouse ke-2 yang Tampak Samping Mendatar!)
        'side-horizontal': {
          camPos: [0, 0.0, 4.25],
          rot: [0.22, 0.15, Math.PI / 2 - 0.12],
          scale: 2.65
        },
        // 03: Miring Diagonal 45 Derajat (Persis Mouse ke-3 yang Miring Isometrik Dinamis!)
        'tilted-iso': {
          camPos: [0, 0.1, 4.2],
          rot: [-0.38, 0.6, -0.72],
          scale: 2.45
        },
        // 04: Komposisi Ganda / Twin Set (Persis Mouse ke-4 yang Menampilkan 2 Bagian Sekaligus!)
        'twin-set': {
          camPos: [0, 0.15, 4.45],
          rot: [0.28, -0.35, 0.18],
          scale: 2.25,
          isTwin: true
        }
      };

      const viewers = [];

      // Langsung muat sejak halaman dibuka agar tidak ada jeda / gambar lain yang muncul saat refresh!
      // GLB dishare dengan jacket showcase via loadSharedBoltGLB — diunduh & di-parse sekali saja.
      loadSharedBoltGLB().then((src) => {
          let sharedEnvTex = null;

          canvases.forEach((canvas, idx) => {
            try {
              const w = canvas.clientWidth || 320;
              const h = canvas.clientHeight || 260;
              const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
              });
              renderer.setPixelRatio(getOptimalDpr());
              renderer.setSize(w, h);
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              renderer.toneMappingExposure = 1.06;

              if (!sharedEnvTex) {
                const pmrem = new THREE.PMREMGenerator(renderer);
                sharedEnvTex = pmrem.fromScene(getSharedRoomEnvironment(), 0.03).texture;
                pmrem.dispose();
              }

              const scene = new THREE.Scene();
              scene.environment = sharedEnvTex;

              // Gunakan Pencahayaan Studio Emas-Putih-Slate yang Sama Persis dengan Hero Logo TJ FACTORY!
              const lights = setupHeroMatchedStudioLights(scene);

              const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
              const cfg = POSTURES[canvas.dataset.view] || POSTURES.crown;
              camera.position.set(cfg.camPos[0], cfg.camPos[1], cfg.camPos[2]);
              camera.lookAt(0, 0, 0);

              const stageGroup = new THREE.Group();

              if (cfg.isTwin) {
                // Baris 04: Buat Komposisi 2 Baut Berdampingan (1 Berdiri Miring, 1 Menghadap Kamera)
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

              // Interaksi Drag per Baut supaya Pengunjung Bisa Memutar Tiap Baut di Anatomi
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
                stageGroup.rotation.y += dx * 0.01;
                stageGroup.rotation.x = THREE.MathUtils.clamp(stageGroup.rotation.x + dy * 0.01, -0.8, 0.8);
              });
              window.addEventListener('pointerup', () => { isDragging = false; });

              canvas.style.opacity = '1';

              viewers.push({
                renderer,
                scene,
                camera,
                canvas,
                stageGroup,
                lights,
                phaseOffset: idx * 1.4,
                isDraggingRef: () => isDragging
              });
            } catch (err) {
              const fb = canvas.parentElement.querySelector('.anatomi-fallback');
              if (fb) fb.classList.remove('hidden');
            }
          });
        })
        .catch(() => {
          // Hanya tampilkan gambar fallback jika file .glb benar-benar gagal dimuat
          canvases.forEach((canvas) => {
            const fb = canvas.parentElement.querySelector('.anatomi-fallback');
            if (fb) fb.classList.remove('hidden');
          });
        });

      // Animasi Studio Halus (Sama seperti kilau hidup pada Hero Logo TJ FACTORY)
      let t = 0;
      // Viewport Governor: 4 loop kanvas hanya berjalan saat seksi anatomi terlihat di layar
      let isAnatomiVisible = true;
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => { isAnatomiVisible = entry.isIntersecting; });
      }, { threshold: 0.05 }).observe(section);
      function animateAnatomiLoop() {
        requestAnimationFrame(animateAnatomiLoop);
        if (!isAnatomiVisible) return;
        t += 0.018;

        viewers.forEach((vw) => {
          const localT = t + vw.phaseOffset;
          if (!vw.isDraggingRef()) {
            vw.stageGroup.rotation.y = Math.sin(localT * 0.65) * 0.22;
            vw.stageGroup.position.y = Math.sin(localT * 0.9) * 0.04;
          }
          // Sapuan lembut lampu emas agar permukaan ulir & kepala baut berkilau mewah
          vw.lights.goldKeyLight.position.x = Math.sin(localT) * 4.2 + 0.5;
          vw.lights.sweepSpotLight.position.x = Math.cos(localT * 0.8) * -3.5;

          vw.renderer.render(vw.scene, vw.camera);
        });
      }
      animateAnatomiLoop();

      window.addEventListener('resize', () => {
        viewers.forEach((vw) => {
          const w = vw.canvas.clientWidth || 320;
          const h = vw.canvas.clientHeight || 260;
          vw.camera.aspect = w / h;
          vw.camera.updateProjectionMatrix();
          vw.renderer.setSize(w, h);
        });
      });
    }

export function initThreeEngine() {
  initHeroMedusa3D();
  initJacketShowcase3D();
  initAnatomi3D();
}
