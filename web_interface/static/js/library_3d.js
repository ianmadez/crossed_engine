// web_interface/static/js/library_3d.js

let scene, camera, renderer, dustParticles;
let booksArray = [];

/**
 * Initializes the lightweight WebGL workspace environment
 */
function initThreeShelf() {
    const container = document.getElementById('three-shelf-canvas');
    if (!container) return;

    // 1. Scene & Context Viewport Creation
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0807); // Match deep charcoal body shadow
    scene.fog = new THREE.FogExp2(0x0a0807, 0.15); // Layered dread depth

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Structural Elements: The Wood Shelves
    const shelfMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2b1e16, // Rich dark table/shelf brown
        roughness: 0.9,
        metalness: 0.1
    });

    for (let row = -1; row <= 1; row++) {
        const shelfGeo = new THREE.BoxGeometry(7, 0.15, 0.8);
        const shelfMesh = new THREE.Mesh(shelfGeo, shelfMaterial);
        shelfMesh.position.set(0, row * 1.3 - 0.4, -0.5);
        scene.add(shelfMesh);

        // Populate procedural low-poly book geometries onto each row
        populateRowBooks(row * 1.3 - 0.4);
    }

    // 3. Lighting Architecture (Dim Flickering Lantern Profile)
    const ambientLight = new THREE.AmbientLight(0x1a0f0a, 1.5);
    scene.add(ambientLight);

    const lanternLight = new THREE.PointLight(0xd97e41, 2, 8); // Warm amber illumination
    lanternLight.position.set(0, 1, 2);
    lanternLight.name = "lantern";
    scene.add(lanternLight);

    // 4. Atmospheric Particle System (Floating Dust Motes)
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 8;     // X vector width
        positions[i + 1] = (Math.random() - 0.5) * 6; // Y vector height
        positions[i + 2] = (Math.random() - 0.5) * 4; // Z depth orientation
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create soft, round procedural particle textures via basic canvas operations
    const pMaterial = new THREE.PointsMaterial({
        color: 0xd9c5b2,
        size: 0.03,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });

    dustParticles = new THREE.Points(geometry, pMaterial);
    scene.add(dustParticles);

    // Bind browser scale constraints safely
    window.addEventListener('resize', onWindowResize);

    // Fire up primary rendering cycle loops
    animateThreeView();
}

/**
 * Procedurally generates individual book meshes with slight structural variations
 */
function populateRowBooks(shelfY) {
    const bookColors = [0x423127, 0x592424, 0x1c2421, 0x3d352e]; // Muted spine tones
    let currentX = -2.5;

    while (currentX < 2.5) {
        const width = 0.12 + Math.random() * 0.1;
        const height = 0.5 + Math.random() * 0.25;
        const depth = 0.4 + Math.random() * 0.2;

        const bookGeo = new THREE.BoxGeometry(width, height, depth);
        const bookMat = new THREE.MeshStandardMaterial({
            color: bookColors[Math.floor(Math.random() * bookColors.length)],
            roughness: 0.85
        });

        const bookMesh = new THREE.Mesh(bookGeo, bookMat);
        // Align bottom boundary of book to top face of shelf mesh asset
        bookMesh.position.set(currentX + width / 2, shelfY + height / 2 + 0.075, -0.4);
        
        // Add random slight rotational lean to mimic a realistic, unstable stack
        if (Math.random() > 0.8) {
            bookMesh.rotation.z = (Math.random() - 0.5) * 0.15;
        }

        scene.add(bookMesh);
        booksArray.push(bookMesh);
        
        // Advance cursor position horizontally spacing slots out randomly
        currentX += width + 0.05 + Math.random() * 0.15;
    }
}

/**
 * Master real-time animation loop frame updater
 */
function animateThreeView() {
    requestAnimationFrame(animateThreeView);

    // 1. Procedural Lantern Glow Flickering Modulator
    const lantern = scene.getObjectByName("lantern");
    if (lantern) {
        lantern.intensity = 1.8 + Math.sin(Date.now() * 0.008) * 0.2 + (Math.random() - 0.5) * 0.08;
    }

    // 2. Drifting Dust Motion Routine
    if (dustParticles) {
        const positions = dustParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.002; // Slow downward fall delta
            if (positions[i] < -3) positions[i] = 3; // Reset height wrap loop boundaries
            
            // Add subtle lateral wind sway offsets
            positions[i - 1] += Math.sin(Date.now() * 0.001 + i) * 0.0005;
        }
        dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Automatically trigger initialization when DOM layout resolves completely
window.addEventListener('DOMContentLoaded', initThreeShelf);