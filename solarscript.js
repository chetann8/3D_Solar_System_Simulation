// Declare global variables for Three.js scene components
let scene, camera, renderer, controls;
const planets = []; // Array to store planet objects for animation
let isPaused = false; // State for pause/resume
let isLightMode = false; // State for dark/light mode
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPlanet = null; // To track which planet is currently hovered

// Constants for planet properties (radius, distance, speed)
// These values are scaled for visualization, not astronomically accurate
const SUN_RADIUS = 10;
const MAX_ORBITAL_SPEED_FACTOR = 0.05; 

const PLANET_DATA = [
    { name: 'Mercury', radius: 0.8, distance: 15, initialSpeed: 0.04, color: 0xA9A9A9 }, // Dark Gray
    { name: 'Venus', radius: 1.5, distance: 22, initialSpeed: 0.015, color: 0xFF6600 },  // Orange
    { name: 'Earth', radius: 1.6, distance: 30, initialSpeed: 0.01, color: 0x0077BE },   // Blue
    { name: 'Mars', radius: 1.2, distance: 38, initialSpeed: 0.008, color: 0xCC0000 },    // Red
    { name: 'Jupiter', radius: 5, distance: 60, initialSpeed: 0.005, color: 0xFFCC66 },   // Light Orange/Yellow
    { name: 'Saturn', radius: 4, distance: 85, initialSpeed: 0.003, color: 0xFFD100 },    // Yellow
    { name: 'Uranus', radius: 3.5, distance: 110, initialSpeed: 0.002, color: 0x0099FF },  // Light Blue
    { name: 'Neptune', radius: 3.4, distance: 135, initialSpeed: 0.001, color: 0x3366FF }   // Dark Blue
];

// Global light references to modify them for dark/light mode
let sunLight, ambientLight;

/**
    * Initializes the Three.js scene, camera, renderer, and lighting.
    * Creates the Sun, all planets, and background stars.
    * Sets up UI controls and event listeners.
*/
    function init() {
    
        scene = new THREE.Scene(); // Scene: where all objects, cameras, and lights are placed.
        scene.background = new THREE.Color(0x000000); // Default black background for space

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);// Camera: defines what is seen and from what perspective.
        camera.position.set(0, 50, 150); // Initial camera position

        // Renderer: renders the scene using WebGL.
        renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
        renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size to full window
        document.body.appendChild(renderer.domElement); // Add renderer's canvas to the DOM

        // OrbitControls: allows for interactive camera control (orbit, zoom, pan).
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Enable smooth camera movement
        controls.dampingFactor = 0.05; // Damping intensity
        // Store initial camera state for reset
        controls.target0.set(controls.target.x, controls.target.y, controls.target.z);
        controls.position0.set(camera.position.x, camera.position.y, camera.position.z);
        controls.zoom0 = camera.zoom;


        // Add Lighting
        // PointLight: emits light from a single point in all directions (for the Sun).
        sunLight = new THREE.PointLight(0xFFFFFF, 1.5, 0); // White light, intensity 1.5, no decay
        sunLight.position.set(0, 0, 0); // Position at the center (where the Sun is)
        scene.add(sunLight);

        // AmbientLight: illuminates all objects in the scene equally.
        // Helps to prevent completely dark areas.
        ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light, low intensity
        scene.add(ambientLight);

        // Create the Sun
        const sunGeometry = new THREE.SphereGeometry(SUN_RADIUS, 64, 64); // Larger sphere for Sun
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500 }); // Orange color for the Sun
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);

        // Create Planets and their controls
        const controlsPanel = document.getElementById('controls-panel');
        const speedControlsDiv = document.createElement('div'); // Container for speed sliders
        controlsPanel.appendChild(speedControlsDiv);

        PLANET_DATA.forEach((data, index) => {
            const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
            const planetMaterial = new THREE.MeshLambertMaterial({ color: data.color });
            const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
            planetMesh.name = data.name; // Assign a name for raycasting identification

            const planetOrbit = new THREE.Object3D();
            planetOrbit.add(planetMesh);
            scene.add(planetOrbit);

            planetMesh.position.x = data.distance;
                
            planets.push({
                mesh: planetMesh,
                orbit: planetOrbit,
                speed: data.initialSpeed,
                distance: data.distance,
                name: data.name
            });

        // Create control elements for each planet
        const planetControlDiv = document.createElement('div');
        planetControlDiv.className = 'planet-control';

        const label = document.createElement('label');
        label.htmlFor = `speed-slider-${index}`;
        label.textContent = data.name;

        const speedValueSpan = document.createElement('span');
        speedValueSpan.className = 'speed-value';
        speedValueSpan.textContent = `Speed: ${data.initialSpeed.toFixed(4)}`; 

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `speed-slider-${index}`;
        slider.min = '0';
        slider.max = '100'; // Scale slider from 0 to 100
        slider.step = '1';
        slider.value = (data.initialSpeed / MAX_ORBITAL_SPEED_FACTOR) * 100;

        slider.addEventListener('input', (event) => {
            const newSpeed = (parseFloat(event.target.value) / 100) * MAX_ORBITAL_SPEED_FACTOR;
            planets[index].speed = newSpeed;
            speedValueSpan.textContent = `Speed: ${newSpeed.toFixed(4)}`;
        });

        planetControlDiv.appendChild(label);
        label.appendChild(speedValueSpan);
        planetControlDiv.appendChild(slider);
        speedControlsDiv.appendChild(planetControlDiv);
        });

        // Create Background Stars
        createStars();

        // Setup Bonus Feature UI and Listeners
        const pauseResumeButton = document.getElementById('pauseResumeButton');
        pauseResumeButton.addEventListener('click', togglePauseResume);

        const toggleLightModeButton = document.getElementById('toggleLightModeButton');
        toggleLightModeButton.addEventListener('click', toggleLightMode);

        const resetCameraButton = document.getElementById('resetCameraButton');
        resetCameraButton.addEventListener('click', () => {
            controls.reset(); // Reset OrbitControls to its initial state
        });

        // Event listeners for tooltips and click-to-focus
        renderer.domElement.addEventListener('mousemove', onMouseMove, false);
        renderer.domElement.addEventListener('click', onClick, false);

         // Handle window resizing
        window.addEventListener('resize', onWindowResize, false);
    }

    /**
    * Creates a field of random stars in the background.
    */
    function createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.3 }); // White stars, small size

        const starVertices = [];
        for (let i = 0; i < 10000; i++) { // number of stars
            const x = THREE.MathUtils.randFloatSpread(1000); // -500 to 500
            const y = THREE.MathUtils.randFloatSpread(1000); // -500 to 500
            const z = THREE.MathUtils.randFloatSpread(1000); // -500 to 500
            starVertices.push(x, y, z);
        }
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);
    }

    /**
    * Toggles the animation between paused and resumed states.
    */
    function togglePauseResume() {
        isPaused = !isPaused;
        const button = document.getElementById('pauseResumeButton');
        button.textContent = isPaused ? 'Resume Animation' : 'Pause Animation';
    }

    /**
    * Toggles between dark and light mode for the scene and UI.
    */
    function toggleLightMode() {
        isLightMode = !isLightMode;
        if (isLightMode) {
            document.body.classList.add('light-mode');
            scene.background.set(0xC0D8F0); // Light blue background
            sunLight.color.set(0x888888); // Dimmer white light
            ambientLight.color.set(0xAAAAAA); // Brighter ambient light
        } else {
            document.body.classList.remove('light-mode');
            scene.background.set(0x000000); // Black background
            sunLight.color.set(0xFFFFFF); // Original bright white light
            ambientLight.color.set(0x404040); // Original soft gray ambient light
        }
    }

    /**
    * Event handler for mouse movement to detect planet hovers and show tooltips.
    * @param {MouseEvent} event - The mouse event.
    */
    function onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the ray
        const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

        const tooltip = document.getElementById('planet-tooltip');

        if (intersects.length > 0) {
            // If an intersection is found, and it's a planet mesh
            const intersectedObject = intersects[0].object;
            const planetData = planets.find(p => p.mesh === intersectedObject);

            if (planetData) {
                if (hoveredPlanet !== planetData) {
                    hoveredPlanet = planetData;
                    tooltip.textContent = planetData.name;
                    tooltip.style.display = 'block';
                }
                // Update tooltip position every frame in animate() for smooth follow
            }
        } else {
            // No intersection, hide tooltip
            if (hoveredPlanet) {
                hoveredPlanet = null;
                tooltip.style.display = 'none';
            }
        }
    }

    /**
    * Event handler for mouse clicks to focus camera on a clicked planet.
    * @param {MouseEvent} event - The mouse event.
    */
    function onClick(event) {
        // Similar raycasting logic as onMouseMove
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            const planetData = planets.find(p => p.mesh === clickedObject);

            if (planetData) {
                focusOnPlanet(planetData.mesh);
            }
        }
    }

    /**
    * Moves the camera to focus on a specific planet.
    * @param {THREE.Mesh} targetMesh - The mesh of the planet to focus on.
    */
    function focusOnPlanet(targetMesh) {
        // Calculate a good viewing distance from the planet
        const focusDistance = targetMesh.geometry.boundingSphere.radius * 5 + 20; // Radius * factor + offset

        // Get target planet's world position
        const targetPosition = new THREE.Vector3();
        targetMesh.getWorldPosition(targetPosition);

        // Calculate new camera position
        // Move camera back along the vector from target to camera, by focusDistance
        const direction = new THREE.Vector3().subVectors(camera.position, targetPosition).normalize();
        const newCameraPosition = new THREE.Vector3().addVectors(targetPosition, direction.multiplyScalar(focusDistance));

        // Smoothly interpolate camera and controls target
        // This is a simplified interpolation. For more complex animations, consider GSAP or similar.
        const initialCameraPosition = camera.position.clone();
        const initialControlsTarget = controls.target.clone();
        const animationDuration = 1000; // milliseconds
        const startTime = performance.now();

        function animateCamera() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            camera.position.lerpVectors(initialCameraPosition, newCameraPosition, progress);
            controls.target.lerpVectors(initialControlsTarget, targetPosition, progress);
            controls.update(); // Update controls after changing target/position

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }
        animateCamera();
    }

    /**
    * Updates the camera aspect ratio and renderer size when the window is resized.
    */
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
    * Animation loop for the solar system.
    * Uses requestAnimationFrame for smooth, browser-optimized animation.
    */
    function animate() {
        requestAnimationFrame(animate);

        // Update controls for smooth camera movement
        controls.update();

        // Animate planets only if not paused
            if (!isPaused) {
                planets.forEach(planet => {
                    // Rotate the orbit object around the Y-axis (vertical axis)
                    planet.orbit.rotation.y += planet.speed;
                });
            }

            // Update tooltip position if a planet is hovered
            if (hoveredPlanet) {
                const tooltip = document.getElementById('planet-tooltip');
                const vector = new THREE.Vector3();
                // Get the world position of the hovered planet's mesh
                hoveredPlanet.mesh.getWorldPosition(vector);
                // Project the 3D world position to 2D screen coordinates
                vector.project(camera);

                // Convert normalized device coordinates to pixels
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

                tooltip.style.left = `${x}px`;
                tooltip.style.top = `${y}px`;
                tooltip.style.display = 'block'; // Ensure it's visible
            } else {
                document.getElementById('planet-tooltip').style.display = 'none';
            }

            // Render the scene from the camera's perspective
            renderer.render(scene, camera);
        }

        // Initialize and start the animation when the window loads
        window.onload = function () {
            init(); // Setup the scene and controls
            animate(); // Start the animation loop
        };