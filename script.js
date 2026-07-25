let scene, camera, renderer;
let heroGroup, headMesh, bodyMesh, leftArm, rightArm, leftLeg, rightLeg;
let buildings = [], enemies = [];
let isTransformed = false;
let gameTime = 0;
let score = 0;
let dayCount = 1;
let selectedHeroName = "Bilinmeyen";
let selectedHeroColor = 0x66fcf1;
let previewAnimations = [];

let audioCtx = null;

function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.log("AudioContext desteklenmiyor veya engellendi.");
    }
}

function playAudio(type) {
    initAudio();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'transform') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'defeat') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'alert') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.setValueAtTime(300, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) {}
}

window.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        const handleSplashInteraction = (e) => {
            e.preventDefault();
            initAudio();
            playAudio('click');
            showCharacterSelect();
        };
        splashScreen.addEventListener('click', handleSplashInteraction);
        splashScreen.addEventListener('touchend', handleSplashInteraction, { passive: false });
    }

    // Karakter kartlarına hem tıklama hem dokunma olayını dinamik ve güvenli şekilde bağlıyoruz
    const heroCards = document.querySelectorAll('.hero-card');
    heroCards.forEach(card => {
        const heroName = card.getAttribute('data-hero');
        const heroColor = parseInt(card.getAttribute('data-color'));

        const handleCardSelection = (e) => {
            e.preventDefault();
            playAudio('click');
            selectHero(heroName, heroColor);
        };

        card.addEventListener('click', handleCardSelection);
        card.addEventListener('touchend', handleCardSelection, { passive: false });
    });
});

const screens = ['splash-screen', 'character-screen', 'menu-screen', 'howto-screen', 'missions-screen'];

function showScreen(screenId) {
    screens.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    if(target) target.classList.remove('hidden');

    const hud = document.getElementById('game-hud');
    if(hud) {
        if(screenId === 'game-hud') {
            hud.classList.remove('hidden');
        } else {
            hud.classList.add('hidden');
        }
    }
}

function showCharacterSelect() {
    showScreen('character-screen');
    setTimeout(initCharacterPreviews, 50);
}

function initCharacterPreviews() {
    const previews = [
        { id: 'preview-ironman', color: 0xff4757 },
        { id: 'preview-thor', color: 0x3498db },
        { id: 'preview-spiderman', color: 0xe67e22 },
        { id: 'preview-marvel', color: 0xf1c40f }
    ];

    previewAnimations = [];

    previews.forEach(p => {
        const canvas = document.getElementById(p.id);
        if (!canvas) return;

        const parent = canvas.parentElement;
        const w = parent.clientWidth || 150;
        const h = parent.clientHeight || 95;

        const pScene = new THREE.Scene();
        pScene.background = new THREE.Color(0x0a0c10);

        const pCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
        pCamera.position.set(0, 2.2, 4.8);
        pCamera.lookAt(0, 1.7, 0);

        const pRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        pRenderer.setSize(w, h, false);

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(2, 4, 3);
        pScene.add(light);
        pScene.add(new THREE.AmbientLight(0xffffff, 0.7));

        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.3, metalness: 0.5 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 });

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), skinMat);
        head.position.y = 2.7;
        group.add(head);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.5), mat);
        body.position.y = 1.7;
        group.add(body);

        const armGeo = new THREE.BoxGeometry(0.3, 1.1, 0.3);
        const leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.65, 1.7, 0);
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.65, 1.7, 0);
        group.add(rightArm);

        const legGeo = new THREE.BoxGeometry(0.35, 1.1, 0.35);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2833 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.25, 0.55, 0);
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.25, 0.55, 0);
        group.add(rightLeg);

        pScene.add(group);

        function renderPreview() {
            group.rotation.y += 0.02;
            pRenderer.render(pScene, pCamera);
        }
        previewAnimations.push(renderPreview);
    });

    function runPreviews() {
        const charScreen = document.getElementById('character-screen');
        if (charScreen && !charScreen.classList.contains('hidden')) {
            previewAnimations.forEach(anim => anim());
            requestAnimationFrame(runPreviews);
        }
    }
    runPreviews();
}

function selectHero(name, color) {
    selectedHeroName = name;
    selectedHeroColor = color;
    document.getElementById('hero-name-display').innerText = name;
    showScreen('menu-screen');
}

function goToMenu() {
    showScreen('menu-screen');
}

function startGame() {
    showScreen('game-hud');
    initThreeJS();
}

function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (renderer) {
        container.innerHTML = '';
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.01);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xddeeff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(40, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    const groundGeo = new THREE.PlaneGeometry(350, 350);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    createRealisticCity();
    createRealisticHero();
    spawnEnemies();
    animate();
}

function createRealisticCity() {
    const buildingColors = [0x1a1d24, 0x222630, 0x12151a, 0x2b303c];
    
    for (let x = -80; x <= 80; x += 20) {
        for (let z = -80; z <= 80; z += 20) {
            if (Math.abs(x) < 14 && Math.abs(z) < 14) continue;
            
            const height = Math.random() * 40 + 15;
            const width = 14;
            const depth = 14;
            const col = buildingColors[Math.floor(Math.random() * buildingColors.length)];
            
            const buildingGroup = new THREE.Group();

            const buildingMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.2 });
            const geo = new THREE.BoxGeometry(width, height, depth);
            const buildingMesh = new THREE.Mesh(geo, buildingMat);
            buildingMesh.position.y = height / 2;
            buildingMesh.castShadow = true;
            buildingMesh.receiveShadow = true;
            buildingGroup.add(buildingMesh);

            const roofMat = new THREE.MeshStandardMaterial({ color: 0x0e1116, roughness: 0.8 });
            const roofGeo = new THREE.BoxGeometry(width * 0.7, 2, depth * 0.7);
            const roofMesh = new THREE.Mesh(roofGeo, roofMat);
            roofMesh.position.y = height + 1;
            roofMesh.castShadow = true;
            buildingGroup.add(roofMesh);

            const windowMat = new THREE.MeshBasicMaterial({ color: 0xffea79 });
            for (let wy = 4; wy < height - 4; wy += 5) {
                for (let wx = -4; wx <= 4; wx += 4) {
                    const winGeo = new THREE.PlaneGeometry(1.2, 2);
                    const winFront = new THREE.Mesh(winGeo, windowMat);
                    winFront.position.set(wx, wy, depth / 2 + 0.05);
                    buildingGroup.add(winFront);

                    const winSide = new THREE.Mesh(winGeo, windowMat);
                    winSide.rotation.y = Math.PI / 2;
                    winSide.position.set(width / 2 + 0.05, wy, wx);
                    buildingGroup.add(winSide);
                }
            }

            buildingGroup.position.set(x, 0, z);
            scene.add(buildingGroup);
            buildings.push(buildingGroup);
        }
    }
}

function createRealisticHero() {
    heroGroup = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 });
    const civilianClothes = new THREE.MeshStandardMaterial({ color: 0x3b4a59, roughness: 0.7 });

    const headGeo = new THREE.BoxGeometry(0.6, 0.7, 0.6);
    headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 3.3;
    headMesh.castShadow = true;
    heroGroup.add(headMesh);

    const bodyGeo = new THREE.BoxGeometry(1.1, 1.5, 0.5);
    bodyMesh = new THREE.Mesh(bodyGeo, civilianClothes);
    bodyMesh.position.y = 2.15;
    bodyMesh.castShadow = true;
    heroGroup.add(bodyMesh);

    const armGeo = new THREE.BoxGeometry(0.35, 1.3, 0.35);
    leftArm = new THREE.Mesh(armGeo, civilianClothes);
    leftArm.position.set(-0.75, 2.15, 0);
    leftArm.castShadow = true;
    heroGroup.add(leftArm);

    rightArm = new THREE.Mesh(armGeo, civilianClothes);
    rightArm.position.set(0.75, 2.15, 0);
    rightArm.castShadow = true;
    heroGroup.add(rightArm);

    const legGeo = new THREE.BoxGeometry(0.45, 1.4, 0.45);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2833, roughness: 0.8 });
    leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.3, 0.7, 0);
    leftLeg.castShadow = true;
    heroGroup.add(leftLeg);

    rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.3, 0.7, 0);
    rightLeg.castShadow = true;
    heroGroup.add(rightLeg);

    heroGroup.position.set(0, 0, 0);
    scene.add(heroGroup);
}

function spawnEnemies() {
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0x330000, roughness: 0.3, metalness: 0.3 });
    for (let i = 0; i < 4 + dayCount; i++) {
        const enemyGroup = new THREE.Group();
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 1.2), enemyMat);
        body.position.y = 1.4;
        body.castShadow = true;
        enemyGroup.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x222 }));
        head.position.y = 3.1;
        head.castShadow = true;
        enemyGroup.add(head);

        let ex = (Math.random() - 0.5) * 110;
        let ez = (Math.random() - 0.5) * 110;
        enemyGroup.position.set(ex, 0, ez);
        scene.add(enemyGroup);
        enemies.push(enemyGroup);
    }
}

function toggleTransformation() {
    isTransformed = !isTransformed;
    const statusText = document.getElementById('hud-status');
    const btn = document.getElementById('transform-btn');
    const heroMat = new THREE.MeshStandardMaterial({ color: selectedHeroColor, roughness: 0.2, metalness: 0.6 });

    if (isTransformed) {
        bodyMesh.material = heroMat;
        leftArm.material = heroMat;
        rightArm.material = heroMat;
        statusText.innerText = `Kimlik: ${selectedHeroName} ⚡`;
        statusText.style.color = "#ff4757";
        btn.innerText = "SİVİLE DÖN";
        triggerNotif(`${selectedHeroName.toUpperCase()} GÜÇLERİ AKTİF!`);
    } else {
        const civilianClothes = new THREE.MeshStandardMaterial({ color: 0x3b4a59, roughness: 0.7 });
        bodyMesh.material = civilianClothes;
        leftArm.material = civilianClothes;
        rightArm.material = civilianClothes;
        statusText.innerText = "Kimlik: Sivil";
        statusText.style.color = "#66fcf1";
        btn.innerText = "🦸‍♂️ GÜÇLERİ AÇ";
        triggerNotif("GİZLİ KİMLİĞE DÖNÜLDÜ");
    }
}

function triggerNotif(text) {
    const notif = document.getElementById('notif');
    if (!notif) return;
    notif.innerText = text;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 2000);
}

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function setMove(direction, isPressed) {
    if (direction === 'up') keys['w'] = isPressed;
    if (direction === 'down') keys['s'] = isPressed;
    if (direction === 'left') keys['a'] = isPressed;
    if (direction === 'right') keys['d'] = isPressed;
}

let walkCycle = 0;

function animate() {
    requestAnimationFrame(animate);

    gameTime += 0.04;
    if (gameTime > 100) {
        gameTime = 0;
        dayCount++;
        playAudio('alert');
        document.getElementById('hud-day').innerText = `Gün: ${dayCount}`;
        triggerNotif(`GÜN ${dayCount} BAŞLADI - DÜŞMANLAR GÜÇLENDİ!`);
        spawnEnemies();
    }

    let isNight = gameTime > 50;
    const timeText = document.getElementById('hud-time');
    if (isNight) {
        timeText.innerText = "GECE 🌙 (Tehlike!)";
        timeText.style.color = "#a29bfe";
        scene.background.setHex(0x030406);
    } else {
        timeText.innerText = "GÜNDÜZ ☀️";
        timeText.style.color = "#ff9f43";
        scene.background.setHex(0x0a0c10);
    }

    let speed = 0.35;
    let moving = false;

    if (keys['w'] || keys['arrowup']) { heroGroup.position.z -= speed; heroGroup.rotation.y = Math.PI; moving = true; }
    if (keys['s'] || keys['arrowdown']) { heroGroup.position.z += speed; heroGroup.rotation.y = 0; moving = true; }
    if (keys['a'] || keys['arrowleft']) { heroGroup.position.x -= speed; heroGroup.rotation.y = -Math.PI / 2; moving = true; }
    if (keys['d'] || keys['arrowright']) { heroGroup.position.x += speed; heroGroup.rotation.y = Math.PI / 2; moving = true; }

    if (moving) {
        walkCycle += 0.25;
        leftLeg.rotation.x = Math.sin(walkCycle) * 0.7;
        rightLeg.rotation.x = -Math.sin(walkCycle) * 0.7;
        leftArm.rotation.x = -Math.sin(walkCycle) * 0.7;
        rightArm.rotation.x = Math.sin(walkCycle) * 0.7;
    } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
    }

    camera.position.x = heroGroup.position.x;
    camera.position.y = heroGroup.position.y + 5.5;
    camera.position.z = heroGroup.position.z + 11;
    camera.lookAt(heroGroup.position.x, heroGroup.position.y + 1.8, heroGroup.position.z);

    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        if (heroGroup.position.distanceTo(enemy.position) < 3.2) {
            if (isTransformed) {
                playAudio('defeat');
                scene.remove(enemy);
                enemies.splice(i, 1);
                score += 50;
                document.getElementById('hud-score').innerText = `Skor: ${score}`;
                triggerNotif("TEHLİKE BERTARAF EDİLDİ!");
            } else {
                triggerNotif("RİSK! Kahramana dönüşmelisin!");
            }
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
        
