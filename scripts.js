let scene, camera, renderer;
let hero, buildings = [], enemies = [];
let isTransformed = false;
let gameTime = 0;
let score = 0;
let dayCount = 1;
let selectedHeroName = "Bilinmeyen";
let selectedHeroColor = 0x66fcf1;

// Web Audio API ile Ses Efektleri Üreteci
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playAudio(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
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
}

const screens = ['splash-screen', 'character-screen', 'menu-screen', 'howto-screen', 'missions-screen'];

function showScreen(screenId) {
    screens.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    if(target) target.classList.remove('hidden');

    if(screenId === 'game-hud') {
        document.getElementById('game-hud').classList.remove('hidden');
    } else {
        document.getElementById('game-hud').classList.add('hidden');
    }
}

function showCharacterSelect() {
    showScreen('character-screen');
}

function selectHero(name, color) {
    selectedHeroName = name;
    selectedHeroColor = color;
    document.getElementById('hero-name-display').innerText = name;
    document.getElementById('hud-hero-info').innerText = `Seçilen: ${name}`;
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
    scene.background = new THREE.Color(0x0b0c10);
    scene.fog = new THREE.FogExp2(0x0b0c10, 0.015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f2833, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    createCity();
    createHero();
    spawnEnemies();
    animate();
}

function createCity() {
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.5 });
    for (let x = -60; x <= 60; x += 20) {
        for (let z = -60; z <= 60; z += 20) {
            if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
            const height = Math.random() * 30 + 10;
            const geo = new THREE.BoxGeometry(12, height, 12);
            const building = new THREE.Mesh(geo, buildingMat);
            building.position.set(x, height / 2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            scene.add(building);
            buildings.push(building);
        }
    }
}

function createHero() {
    const heroGeo = new THREE.BoxGeometry(2, 4, 2);
    const heroMat = new THREE.MeshStandardMaterial({ color: 0xc5c6c7 });
    hero = new THREE.Mesh(heroGeo, heroMat);
    hero.position.set(0, 2, 0);
    hero.castShadow = true;
    scene.add(hero);
}

function spawnEnemies() {
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0x330000 });
    for (let i = 0; i < 4 + dayCount; i++) {
        const geo = new THREE.BoxGeometry(2, 4, 2);
        const enemy = new THREE.Mesh(geo, enemyMat);
        let ex = (Math.random() - 0.5) * 80;
        let ez = (Math.random() - 0.5) * 80;
        enemy.position.set(ex, 2, ez);
        scene.add(enemy);
        enemies.push(enemy);
    }
}

function toggleTransformation() {
    isTransformed = !isTransformed;
    const statusText = document.getElementById('hud-status');
    const btn = document.getElementById('transform-btn');

    if (isTransformed) {
        hero.material.color.setHex(selectedHeroColor);
        statusText.innerText = `Kimlik: ${selectedHeroName} ⚡`;
        statusText.style.color = "#ff4757";
        btn.innerText = "SİVİLE DÖN";
        triggerNotif(`${selectedHeroName.toUpperCase()} GÜÇLERİ AKTİF!`);
    } else {
        hero.material.color.setHex(0xc5c6c7);
        statusText.innerText = "Kimlik: Sivil";
        statusText.style.color = "#66fcf1";
        btn.innerText = "🦸‍♂️ GÜÇLERİ AÇ";
        triggerNotif("GİZLİ KİMLİĞE DÖNÜLDÜ");
    }
}

function triggerNotif(text) {
    const notif = document.getElementById('notif');
    notif.innerText = text;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 2000);
}

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function animate() {
    requestAnimationFrame(animate);

    gameTime += 0.05;
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
        scene.background.setHex(0x050508);
    } else {
        timeText.innerText = "GÜNDÜZ ☀️";
        timeText.style.color = "#ff9f43";
        scene.background.setHex(0x0b0c10);
    }

    let speed = 0.3;
    if (keys['w'] || keys['arrowup']) hero.position.z -= speed;
    if (keys['s'] || keys['arrowdown']) hero.position.z += speed;
    if (keys['a'] || keys['arrowleft']) hero.position.x -= speed;
    if (keys['d'] || keys['arrowright']) hero.position.x += speed;

    camera.position.x = hero.position.x;
    camera.position.z = hero.position.z + 25;
    camera.lookAt(hero.position);

    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        if (hero.position.distanceTo(enemy.position) < 3) {
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
          
