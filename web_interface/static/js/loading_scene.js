// web_interface/static/js/loading_scene.js

(function () {
    const container = document.getElementById('three-loading-canvas');
    if (!container) return;

    // 1. SCENE SETUP & FIERY TWILIGHT ATMOSPHERE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0605); // Deep charred night sky
    scene.fog = new THREE.FogExp2(0x140805, 0.012); // Dense reddish-brown smoke fog

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
   
    // STATIC SHOT: Locked elevated camera looking down the highway toward the burning skyline
    camera.position.set(0, 12, 45);
    camera.lookAt(0, 14, -160);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. MULTI-LAYERED FIRELIGHTING SYSTEM
    const ambientLight = new THREE.AmbientLight(0x1a1518, 0.6); // Cold ash moonlight contrast
    scene.add(ambientLight);

    // Main horizon inferno glow
    const cityInfernoLight = new THREE.DirectionalLight(0xff4411, 2.5);
    cityInfernoLight.position.set(0, 40, -200);
    scene.add(cityInfernoLight);

    // Dynamic flickering point lights buried inside the distant city
    const fireLights = [];
    const lightColors = [0xff2a00, 0xff5500, 0xe61900, 0xff7700];
    for (let i = 0; i < 6; i++) {
        const pLight = new THREE.PointLight(lightColors[i % lightColors.length], 4, 150);
        pLight.position.set((Math.random() - 0.5) * 160, 15 + Math.random() * 25, -130 - Math.random() * 80);
        scene.add(pLight);
        fireLights.push({ light: pLight, baseIntensity: 3 + Math.random() * 2, speed: 4 + Math.random() * 6 });
    }

    // 3. THE HIGHWAY & DEBRIS FIELD (Foreground to Horizon)
    const roadGroup = new THREE.Group();

    // Main asphalt highway surface
    const roadGeo = new THREE.PlaneGeometry(32, 350);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x110e0d, roughness: 0.95, metalness: 0.05 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -120);
    roadGroup.add(road);

    // Desert terrain shoulders
    const desertGeo = new THREE.PlaneGeometry(400, 350);
    const desertMat = new THREE.MeshStandardMaterial({ color: 0x0f0b08, roughness: 1.0 });
    const desert = new THREE.Mesh(desertGeo, desertMat);
    desert.rotation.x = -Math.PI / 2;
    desert.position.set(0, -0.2, -120);
    roadGroup.add(desert);

    // Concrete Jersey barriers lining the highway and median
    const barrierGeo = new THREE.BoxGeometry(1, 1.2, 4);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x2a2522, roughness: 0.9 });
    for (let z = 30; z > -250; z -= 4.5) {
        // Left edge
        if (Math.random() > 0.15) {
            const bLeft = new THREE.Mesh(barrierGeo, barrierMat);
            bLeft.position.set(-15, 0.6, z);
            if (Math.random() > 0.8) bLeft.rotation.z = 0.4; // Knocked over barrier
            roadGroup.add(bLeft);
        }
        // Right edge
        if (Math.random() > 0.15) {
            const bRight = new THREE.Mesh(barrierGeo, barrierMat);
            bRight.position.set(15, 0.6, z);
            roadGroup.add(bRight);
        }
        // Broken center median
        if (Math.random() > 0.4) {
            const bCenter = new THREE.Mesh(barrierGeo, barrierMat);
            bCenter.position.set((Math.random() - 0.5) * 2, 0.6, z);
            bCenter.rotation.y = (Math.random() - 0.5) * 0.5;
            roadGroup.add(bCenter);
        }
    }

    // Tilted / Fallen Utility Poles along the highway
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 18, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1714, roughness: 0.9 });
    for (let z = 20; z > -220; z -= 35) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        const isLeft = Math.random() > 0.5;
        pole.position.set(isLeft ? -18 : 18, 9, z);
        // Tilt poles chaotically
        pole.rotation.z = (isLeft ? -1 : 1) * (0.1 + Math.random() * 0.4);
        pole.rotation.x = (Math.random() - 0.5) * 0.3;
        roadGroup.add(pole);
    }
    scene.add(roadGroup);

    // 4. VEHICLE GRAVEYARD (30+ Burnt Cars, Buses, Overturned Trucks)
    const vehicleGroup = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0x0d0a09, roughness: 0.85 });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x24140e, roughness: 0.95 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 }); // Glowing fire interiors

    for (let i = 0; i < 35; i++) {
        const isTruck = Math.random() > 0.8;
        const isBus = !isTruck && Math.random() > 0.85;
       
        let vWidth = 2.2, vHeight = 1.4, vLength = 4.5;
        if (isTruck) { vWidth = 2.8; vHeight = 3.5; vLength = 10; }
        if (isBus) { vWidth = 2.6; vHeight = 2.8; vLength = 11; }

        const vGeo = new THREE.BoxGeometry(vWidth, vHeight, vLength);
        const vehicle = new THREE.Mesh(vGeo, Math.random() > 0.4 ? carMat : rustMat);

        // Position across road lanes and ditches
        const xPos = (Math.random() - 0.5) * 28;
        const zPos = 20 - Math.pow(Math.random(), 1.2) * 240; // Higher density closer/mid-distance
       
        vehicle.position.set(xPos, vHeight / 2, zPos);
        vehicle.rotation.y = (Math.random() - 0.5) * Math.PI * 0.8; // Crashed angles

        // 25% chance vehicle is overturned on its side or roof
        if (Math.random() > 0.75) {
            vehicle.rotation.z = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2);
            vehicle.position.y = vWidth / 2;
        }

        // Add glowing ember underneath/inside some burnt vehicles
        if (Math.random() > 0.6) {
            const glowGeo = new THREE.PlaneGeometry(vWidth * 1.2, vLength * 1.1);
            const glowMesh = new THREE.Mesh(glowGeo, emberMat);
            glowMesh.rotation.x = -Math.PI / 2;
            glowMesh.position.set(0, -vHeight / 2 + 0.1, 0);
            vehicle.add(glowMesh);
        }

        vehicleGroup.add(vehicle);
    }
    scene.add(vehicleGroup);

    // 5. THE DISTANT RUINED CITYLINE (80+ Shattered Skyscrapers)
    const cityGroup = new THREE.Group();
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x120e0c, roughness: 0.9 });
    const windowFireMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });

    for (let i = 0; i < 85; i++) {
        const bWidth = 8 + Math.random() * 16;
        const bHeight = 30 + Math.random() * 90; // Massive skyline scale
        const bDepth = 8 + Math.random() * 16;

        const boxGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);

        // Deform top vertices to simulate bomb blasts, artillery strikes, and structural collapse
        const posAttr = boxGeo.attributes.position;
        for (let j = 0; j < posAttr.count; j++) {
            if (posAttr.getY(j) > (bHeight / 4)) {
                posAttr.setX(j, posAttr.getX(j) + (Math.random() - 0.5) * 5);
                posAttr.setY(j, posAttr.getY(j) - Math.random() * 12); // Sagging destroyed roofs
                posAttr.setZ(j, posAttr.getZ(j) + (Math.random() - 0.5) * 5);
            }
        }
        boxGeo.computeVertexNormals();

        const building = new THREE.Mesh(boxGeo, buildingMat);

        // Position along a distant horizon arc
        const xPos = (Math.random() - 0.5) * 340;
        const zPos = -140 - Math.random() * 150;
        building.position.set(xPos, bHeight / 2, zPos);

        // Leaning towers of ruined city
        if (Math.random() > 0.8) {
            building.rotation.z = (Math.random() - 0.5) * 0.25;
            building.rotation.x = (Math.random() - 0.5) * 0.2;
        }

        // Attach glowing fire floors/windows inside towers
        if (Math.random() > 0.4) {
            const fireFloorGeo = new THREE.BoxGeometry(bWidth * 1.02, 2 + Math.random() * 6, bDepth * 1.02);
            const fireFloor = new THREE.Mesh(fireFloorGeo, windowFireMat);
            fireFloor.position.set(0, (Math.random() - 0.2) * (bHeight / 2), 0);
            building.add(fireFloor);
        }

        cityGroup.add(building);
    }
    scene.add(cityGroup);

    // 6. ENVIRONMENTAL VFX SYSTEMS (Rising Embers, Falling Ash, Horizon Smoke)
   
    // SYSTEM A: Rising Fire Embers from the City
    const emberCount = 600;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberVel = [];

    for (let i = 0; i < emberCount; i++) {
        emberPos[i * 3] = (Math.random() - 0.5) * 250;
        emberPos[i * 3 + 1] = Math.random() * 80;
        emberPos[i * 3 + 2] = -80 - Math.random() * 180; // Originating from city horizon

        emberVel.push({
            x: (Math.random() - 0.5) * 0.15,
            y: 0.15 + Math.random() * 0.25, // Upward thermal draft
            z: 0.1 + Math.random() * 0.2  // Blowing toward the camera
        });
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberParticles = new THREE.Points(emberGeo, new THREE.PointsMaterial({
        color: 0xff5511, size: 0.6, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
    }));
    scene.add(emberParticles);

    // SYSTEM B: Heavy Drifting Desert Ash & Fallout
    const ashCount = 1000;
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    for (let i = 0; i < ashCount; i++) {
        ashPos[i * 3] = (Math.random() - 0.5) * 160;
        ashPos[i * 3 + 1] = Math.random() * 60;
        ashPos[i * 3 + 2] = 40 - Math.random() * 220;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    const ashParticles = new THREE.Points(ashGeo, new THREE.PointsMaterial({
        color: 0x4a3f39, size: 0.35, transparent: true, opacity: 0.5
    }));
    scene.add(ashParticles);

    // SYSTEM C: Horizon Smoke Pillars (Simple giant planes drifting upward)
    const smokeGroup = new THREE.Group();
    const smokeGeo = new THREE.PlaneGeometry(30, 60);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x080504, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    for (let i = 0; i < 15; i++) {
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.position.set((Math.random() - 0.5) * 240, 30 + Math.random() * 40, -150 - Math.random() * 100);
        smoke.rotation.y = Math.random() * Math.PI;
        smokeGroup.add(smoke);
    }
    scene.add(smokeGroup);

    // 7. CINEMAGRAPH ANIMATION LOOP (Static Camera, Live Environment)
    let animationFrameId = null;
    const clock = new THREE.Clock();

    function animateSceneLoop() {
        animationFrameId = requestAnimationFrame(animateSceneLoop);
        const time = clock.getElapsedTime();

        // 1. Flicker the city inferno lights procedurally
        for (let i = 0; i < fireLights.length; i++) {
            const fl = fireLights[i];
            fl.light.intensity = fl.baseIntensity + Math.sin(time * fl.speed) * 1.5 + Math.cos(time * fl.speed * 1.5) * 0.8;
            fl.light.position.x += Math.sin(time * 2 + i) * 0.1; // Subtle fire dance
        }
        cityInfernoLight.intensity = 2.2 + Math.sin(time * 3) * 0.4;

        // 2. Animate Rising Fiery Embers
        const ePosArr = emberParticles.geometry.attributes.position.array;
        for (let i = 0; i < emberCount; i++) {
            ePosArr[i * 3] += emberVel[i].x + Math.sin(time + i) * 0.05;
            ePosArr[i * 3 + 1] += emberVel[i].y;
            ePosArr[i * 3 + 2] += emberVel[i].z;

            // Reset ember when it rises too high or blows past camera
            if (ePosArr[i * 3 + 1] > 90 || ePosArr[i * 3 + 2] > 50) {
                ePosArr[i * 3] = (Math.random() - 0.5) * 250;
                ePosArr[i * 3 + 1] = 2;
                ePosArr[i * 3 + 2] = -150 - Math.random() * 100;
            }
        }
        emberParticles.geometry.attributes.position.needsUpdate = true;

        // 3. Animate Falling Ash & Dust
        const aPosArr = ashParticles.geometry.attributes.position.array;
        for (let i = 0; i < ashCount; i++) {
            aPosArr[i * 3] -= 0.08; // Wind blowing left
            aPosArr[i * 3 + 1] -= 0.06; // Gravity settling down

            if (aPosArr[i * 3 + 1] < 0 || aPosArr[i * 3] < -80) {
                aPosArr[i * 3] = 80;
                aPosArr[i * 3 + 1] = 50;
            }
        }
        ashParticles.geometry.attributes.position.needsUpdate = true;

        // 4. Slow atmospheric drift for horizon smoke pillars
        smokeGroup.children.forEach((smoke, idx) => {
            smoke.position.y += 0.05;
            smoke.scale.x = 1 + Math.sin(time * 0.5 + idx) * 0.2;
            if (smoke.position.y > 100) smoke.position.y = 20;
        });

        renderer.render(scene, camera);
    }

    animateSceneLoop();

    // 8. RESIZE & CLEANUP HANDLERS
    function handleResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    window.stopLoadingSceneLoop = function () {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    };
})();
