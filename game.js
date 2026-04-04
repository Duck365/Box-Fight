const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU'; 
let pendingGameMode = 'AI'; 
let gameMode = 'AI'; 
let customBodyColor = 'blue';
let selectedMapIndex = 0;
let p1Wins = 0; let p2Wins = 0;

let p1Controls = { left: 'a', right: 'd', up: 'w', down: 's', shoot: 'z', shield: 'x', dash: 'c', ult: 'q', restart: 'r' };
let p2Controls = { left: 'arrowleft', right: 'arrowright', up: 'arrowup', down: 'arrowdown', shoot: 'm', shield: ',', dash: '.', ult: 'space' };

let keyEditMode = false;
let awaitingKey = null; // Used for the new listener system
const lightColors = ['white', '#ffff00', '#00ffff', '#00ff00'];

const mapLayouts = [
    [ { x: 0, y: 570, w: 800, h: 30 }, { x: 100, y: 460, w: 100, h: 10 }, { x: 350, y: 480, w: 100, h: 10 }, { x: 600, y: 460, w: 100, h: 10 }, { x: 220, y: 360, w: 100, h: 10 }, { x: 480, y: 360, w: 100, h: 10 }, { x: 350, y: 260, w: 100, h: 10 }, { x: 80, y: 200, w: 100, h: 10 }, { x: 620, y: 200, w: 100, h: 10 } ],
    [ { x: 0, y: 570, w: 800, h: 30 }, { x: 250, y: 450, w: 300, h: 10 }, { x: 100, y: 330, w: 150, h: 10 }, { x: 550, y: 330, w: 150, h: 10 }, { x: 300, y: 210, w: 200, h: 10 } ],
    [ { x: 0, y: 570, w: 800, h: 30 }, { x: 50, y: 480, w: 150, h: 10 }, { x: 250, y: 400, w: 150, h: 10 }, { x: 450, y: 320, w: 150, h: 10 }, { x: 650, y: 240, w: 150, h: 10 }, { x: 50, y: 200, w: 200, h: 10 } ],
    [ { x: 0, y: 570, w: 250, h: 30 }, { x: 550, y: 570, w: 250, h: 30 }, { x: 0, y: 0, w: 20, h: 600 }, { x: 780, y: 0, w: 20, h: 600 }, { x: 350, y: 400, w: 100, h: 10 }, { x: 150, y: 250, w: 100, h: 10 }, { x: 550, y: 250, w: 100, h: 10 } ] 
];

const stars = Array.from({length: 100}, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2 + 1, alpha: Math.random() * 0.5 + 0.2 }));

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    if (screenId) {
        let targetScreen = document.getElementById(screenId);
        if (targetScreen) targetScreen.style.display = 'flex';
    }
}

function drawMiniMaps() {
    for(let i = 0; i < 4; i++) {
        let c = document.getElementById('mapPreview' + i);
        if(c) {
            let cx = c.getContext('2d');
            cx.clearRect(0,0, c.width, c.height);
            cx.fillStyle = '#444';
            mapLayouts[i].forEach(p => cx.fillRect(p.x * 0.2, p.y * 0.2, p.w * 0.2, p.h * 0.2));
        }
    }
}

function goToMapSelect(mode) { pendingGameMode = mode; showScreen('mapMenu'); drawMiniMaps(); }
function startRandomMap() { startGame(Math.floor(Math.random() * mapLayouts.length)); }
function startGame(mapIndex) { gameMode = pendingGameMode; selectedMapIndex = mapIndex; gameState = 'PLAYING'; showScreen(null); resetGame(); }
function togglePause() {
    if (gameState === 'PLAYING') { gameState = 'PAUSED'; showScreen('pauseMenu'); } 
    else if (gameState === 'PAUSED') { gameState = 'PLAYING'; showScreen(null); }
}
function quitToMenu() { gameState = 'MENU'; showScreen('mainMenu'); p1Wins = 0; p2Wins = 0; }
function returnFromSettings() { 
    awaitingKey = null; // Cancel any active listening
    if (gameState === 'PAUSED') showScreen('pauseMenu'); else showScreen('mainMenu'); 
}

function setBodyColor(color) { 
    customBodyColor = color; 
    let preview1 = document.getElementById('previewBox');
    let preview2 = document.getElementById('bigPreviewBox');
    if (preview1) preview1.style.backgroundColor = color; 
    if (preview2) preview2.style.backgroundColor = color; 
    let eyeCol = lightColors.includes(color) ? 'black' : 'white';
    document.querySelectorAll('.eye, .big-eye').forEach(el => el.style.backgroundColor = eyeCol);
}

// NEW LISTENER KEYBIND LOGIC
function toggleKeyEditMode() {
    keyEditMode = !keyEditMode;
    document.querySelectorAll('.edit-icon').forEach(el => el.style.display = keyEditMode ? 'inline-block' : 'none');
    if (!keyEditMode) awaitingKey = null; // Cancel listener if we exit edit mode
}

function listenForKey(player, action) {
    if (awaitingKey) {
        // Reset the previous label if we click a new one before pressing a key
        let oldLabel = document.getElementById(`val_${awaitingKey.player}_${awaitingKey.action}`);
        oldLabel.classList.remove('waiting-key');
        oldLabel.innerText = awaitingKey.player === 'p1' ? p1Controls[awaitingKey.action] : p2Controls[awaitingKey.action];
    }
    
    awaitingKey = { player, action };
    let label = document.getElementById(`val_${player}_${action}`);
    label.innerText = "[Press Key]";
    label.classList.add('waiting-key');
}

function resetKeysToDefault() {
    p1Controls = { left: 'a', right: 'd', up: 'w', down: 's', shoot: 'z', shield: 'x', dash: 'c', ult: 'q', restart: 'r' };
    p2Controls = { left: 'arrowleft', right: 'arrowright', up: 'arrowup', down: 'arrowdown', shoot: 'm', shield: ',', dash: '.', ult: 'space' };
    
    // Visually update everything in the UI
    for(let key in p1Controls) {
        let el = document.getElementById(`val_p1_${key}`);
        if(el) { el.innerText = p1Controls[key]; el.classList.remove('waiting-key'); }
    }
    for(let key in p2Controls) {
        let el = document.getElementById(`val_p2_${key}`);
        if(el) { el.innerText = p2Controls[key]; el.classList.remove('waiting-key'); }
    }
    awaitingKey = null;
}

let BASE_MOVE_SPEED = 180; let BASE_GRAVITY = 900; let BASE_JUMP = -480; 
const BULLET_SPEED = 500; const DASH_SPEED = 600; const DASH_DURATION = 0.15; const DASH_COOLDOWN = 1.5;

let keys = {}; let prevKeys = {}; 
window.addEventListener('keydown', e => { 
    // IF WE ARE WAITING FOR A KEYBIND
    if (awaitingKey) {
        e.preventDefault(); // Stop scrolling when mapping space/arrows
        let newKey = e.key.toLowerCase(); 
        if (newKey === ' ') newKey = 'space';
        
        // Save it to memory
        if (awaitingKey.player === 'p1') p1Controls[awaitingKey.action] = newKey;
        else p2Controls[awaitingKey.action] = newKey;
        
        // Update the screen
        let label = document.getElementById(`val_${awaitingKey.player}_${awaitingKey.action}`);
        label.innerText = newKey;
        label.classList.remove('waiting-key');
        
        awaitingKey = null;
        return; // Don't trigger any game logic
    }

    // NORMAL GAMEPLAY INPUT
    let mappedKey = e.key.toLowerCase(); 
    if (mappedKey === ' ') mappedKey = 'space';
    
    // Prevent default scrolling for game controls
    let isControlKey = Object.values(p1Controls).includes(mappedKey) || Object.values(p2Controls).includes(mappedKey);
    if (isControlKey) e.preventDefault();

    keys[mappedKey] = true; 
    if (mappedKey === 'p' && !prevKeys['p']) togglePause(); 
});

window.addEventListener('keyup', e => { 
    let k = e.key.toLowerCase(); if (k === ' ') k = 'space'; keys[k] = false; 
});

let players = []; let bullets = []; let platforms = []; let weaponDrops = [];
let nextWeaponTimer = 2; let lastTime;
let currentEvent = 'None'; let eventCountdown = 15; let eventMessageTimer = 0;

function resetGame() {
    players = [
        { id: 1, isAI: false, x: 50, y: 500, w: 14, h: 14, baseW: 14, baseH: 14, vx: 0, vy: 0, hp: 5, facing: 'right', shielding: false, cooldown: 0, dashTime: 0, dashCd: 0, color: customBodyColor, jumps: 0, onWall: 0, lastWall: 0, blocks: 0, weapon: 'default', ammo: 0 },
        { id: 2, isAI: (gameMode === 'AI'), x: 740, y: 500, w: 14, h: 14, baseW: 14, baseH: 14, vx: 0, vy: 0, hp: 5, facing: 'left', shielding: false, cooldown: 0, dashTime: 0, dashCd: 0, color: 'red', stateTimer: 0, jumps: 0, onWall: 0, lastWall: 0, blocks: 0, weapon: 'default', ammo: 0 }
    ];
    bullets = []; weaponDrops = []; nextWeaponTimer = 2; 
    platforms = JSON.parse(JSON.stringify(mapLayouts[selectedMapIndex]));
    currentEvent = 'None'; eventCountdown = 15; BASE_GRAVITY = 900; BASE_JUMP = -480;
}

function triggerRandomEvent() {
    const events = ['Low Gravity', 'Infinite Jump', 'BIG', 'Tiny', 'Minigun Only'];
    currentEvent = events[Math.floor(Math.random() * events.length)];
    eventCountdown = 20; eventMessageTimer = 3;
    BASE_GRAVITY = 900; BASE_JUMP = -480;
    players.forEach(p => { p.w = p.baseW; p.h = p.baseH; });

    if (currentEvent === 'Low Gravity') { BASE_GRAVITY = 400; BASE_JUMP = -250; }
    if (currentEvent === 'BIG') { players.forEach(p => { p.w = p.baseW * 2; p.h = p.baseH * 2; p.y -= p.baseH; }); }
    if (currentEvent === 'Tiny') { players.forEach(p => { p.w = p.baseW / 2; p.h = p.baseH / 2; }); }
    if (currentEvent === 'Minigun Only') { players.forEach(p => { p.weapon = 'minigun'; p.ammo = 200; }); weaponDrops = []; }
}

function rectIntersect(r1, r2) { return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y); }

function updatePhysics(entity, dt) {
    let prevY = entity.y;

    // Check if player is holding down (to fall through platforms)
    let isDownPressed = false;
    if (!entity.isAI) {
        isDownPressed = (entity.id === 1) ? keys[p1Controls.down] : keys[p2Controls.down];
    }

    // 1. Move Horizontally
    entity.x += entity.vx * dt;
    entity.onWall = 0;

    // Edge of canvas bounds
    if (entity.x <= 0) { entity.x = 0; entity.onWall = -1; }
    if (entity.x + entity.w >= canvas.width) { entity.x = canvas.width - entity.w; entity.onWall = 1; }

    // X-Axis Collision Check (Fixed floor snagging!)
    platforms.forEach(p => {
        if (rectIntersect(entity, p)) {
            // Only act as a wall if we are hitting the SIDE, not sitting on top of it.
            // We leave a 5-pixel buffer so sliding on the floor doesn't trigger a wall bounce.
            if (entity.y + entity.h > p.y + 5 && entity.y < p.y + p.h - 5) {
                if (entity.vx > 0) { entity.x = p.x - entity.w; entity.onWall = 1; } 
                else if (entity.vx < 0) { entity.x = p.x + p.w; entity.onWall = -1; }
                entity.vx = 0;
            }
        }
    });

    // 2. Move Vertically
    if (entity.dashTime <= 0) entity.vy += BASE_GRAVITY * dt;
    entity.y += entity.vy * dt;
    entity.grounded = false;

    // Y-Axis Collision Check
    platforms.forEach(p => {
        if (rectIntersect(entity, p)) {
            let isMainFloor = (p.y >= 550); // Identifies the solid ground at the bottom

            // If holding DOWN and it's a floating platform, let them fall right through!
            if (isDownPressed && !isMainFloor && entity.vy > 0) {
                return; // Skip collision!
            }

            // Check if bottom of character was actually ABOVE the platform before this frame
            if (entity.vy > 0 && prevY + entity.h <= p.y + (entity.vy * dt) + 5) { 
                entity.y = p.y - entity.h; 
                entity.vy = 0; 
                entity.grounded = true; 
                entity.jumps = 0; 
                entity.lastWall = 0;
            } 
            // Check if top of character hit the BOTTOM of a platform
            else if (entity.vy < 0 && prevY >= p.y + p.h - (Math.abs(entity.vy) * dt) - 5) { 
                entity.y = p.y + p.h;
                entity.vy = 0;
            }
        }
    });

    // Pit Fall Respawn
    if (entity.y > canvas.height + 50) { 
        entity.y = 10; 
        entity.vy = 0; 
        entity.x = canvas.width / 2; 
    }
}

function fireBullet(x, y, vx, vy, ownerId, isUlt, w = 10, h = 3, color = '#ffff00') {
    bullets.push({ x: x, y: y, w: isUlt ? 40 : w, h: isUlt ? 20 : h, vx: vx, vy: vy, ownerId: ownerId, damage: isUlt ? 3 : 1, isUltimate: isUlt, color: isUlt ? '#ff00ff' : color });
}

function shoot(entity) {
    if (entity.cooldown <= 0) {
        let spawnX = entity.facing === 'right' ? entity.x + entity.w : entity.x - 12;
        let baseVx = entity.facing === 'right' ? BULLET_SPEED : -BULLET_SPEED;
        let yOffset = entity.y + (entity.h / 2) - 2;

        if (entity.weapon === 'shotgun' && entity.ammo > 0) {
            fireBullet(spawnX, yOffset, baseVx, 0, entity.id, false, 8, 3, '#00ff00');
            fireBullet(spawnX, yOffset, baseVx, -50, entity.id, false, 8, 3, '#00ff00');
            fireBullet(spawnX, yOffset, baseVx, 50, entity.id, false, 8, 3, '#00ff00');
            entity.ammo--; entity.cooldown = 0.7;
        } else if (entity.weapon === 'minigun' && entity.ammo > 0) {
            fireBullet(spawnX, yOffset, baseVx * 1.3, (Math.random() - 0.5) * 80, entity.id, false, 6, 6, '#ff8800');
            entity.ammo--; entity.cooldown = 0.08; 
        } else if (entity.weapon === 'sniper' && entity.ammo > 0) {
            fireBullet(spawnX, yOffset, baseVx * 5, 0, entity.id, false, 30, 2, '#ff0000'); 
            entity.ammo--; entity.cooldown = 1.0; 
        } else {
            fireBullet(spawnX, yOffset, baseVx, 0, entity.id, false, 10, 3, '#ffff00');
            entity.cooldown = 0.4;
        }
        if (entity.ammo <= 0 && currentEvent !== 'Minigun Only') entity.weapon = 'default';
    }
}

function fireUltimate(entity) {
    let spawnX = entity.facing === 'right' ? entity.x + entity.w + 5 : entity.x - 45;
    fireBullet(spawnX, entity.y - 5, entity.facing === 'right' ? BULLET_SPEED * 1.5 : -BULLET_SPEED * 1.5, 0, entity.id, true, 40, 20);
    entity.blocks = 0; 
}

function getShieldRect(entity) {
    let margin = currentEvent === 'BIG' ? 5 : 3;
    if (entity.facing === 'right') return { x: entity.x + entity.w + margin, y: entity.y - 3, w: 4, h: entity.h + 6 };
    if (entity.facing === 'left') return { x: entity.x - margin - 4, y: entity.y - 3, w: 4, h: entity.h + 6 };
    if (entity.facing === 'up') return { x: entity.x - 3, y: entity.y - margin - 4, w: entity.w + 6, h: 4 };
    if (entity.facing === 'down') return { x: entity.x - 3, y: entity.y + entity.h + margin, w: entity.w + 6, h: 4 };
    return { x: 0, y: 0, w: 0, h: 0 };
}

function updateAI(enemy, playerTarget, dt) {
    enemy.stateTimer -= dt; enemy.vx = 0; enemy.shielding = false;

    let incoming = bullets.find(b => b.ownerId !== enemy.id && Math.abs(b.y - enemy.y) < 30 && Math.abs(b.x - enemy.x) < 200);
    if (incoming && !incoming.isUltimate) { 
        enemy.facing = (incoming.x < enemy.x) ? 'left' : 'right'; 
        if (Math.random() < 0.4 && enemy.grounded) { enemy.vy = BASE_JUMP; }
        else { enemy.shielding = true; }
    } else {
        if (playerTarget.y < enemy.y - 40) { 
            if (enemy.grounded && Math.random() < 0.1) { enemy.vy = BASE_JUMP; enemy.jumps = 1; } 
            else if (!enemy.grounded && enemy.jumps === 1 && enemy.vy > -50 && Math.random() < 0.15) { enemy.vy = BASE_JUMP * 0.8; enemy.jumps = 2; }
        }
        
        if (enemy.stateTimer <= 0) {
            enemy.stateTimer = Math.random(); let action = Math.random();
            if (action < 0.4) enemy.facing = 'left';
            else if (action < 0.8) enemy.facing = 'right';
            else if (enemy.grounded) { enemy.vy = BASE_JUMP; enemy.jumps = 1; }
        }
        
        if (enemy.facing === 'left') enemy.vx = -BASE_MOVE_SPEED;
        if (enemy.facing === 'right') enemy.vx = BASE_MOVE_SPEED;

        if (((enemy.facing === 'left' && playerTarget.x < enemy.x) || (enemy.facing === 'right' && playerTarget.x > enemy.x)) && Math.abs(playerTarget.y - enemy.y) < 40) { 
            if (enemy.blocks >= 10) fireUltimate(enemy); else shoot(enemy); 
        }
    }
}

function handlePlayerInput(p, controls, dt) {
    let dashKey = keys[controls.dash]; let shootKey = keys[controls.shoot];
    let shieldKey = keys[controls.shield]; let jumpKey = keys[controls.up];
    let ultKey = keys[controls.ult];

    if (ultKey && p.blocks >= 10) fireUltimate(p);
    if (dashKey && p.dashCd <= 0) { p.dashTime = DASH_DURATION; p.dashCd = DASH_COOLDOWN; }

    p.vx = 0; p.shielding = shieldKey && !shootKey; 

    if (p.dashTime > 0) {
        p.vx = p.facing === 'left' ? -DASH_SPEED : DASH_SPEED; p.vy = 0; p.dashTime -= dt; p.shielding = false; 
    } else {
        if (keys[controls.left]) { p.vx = -BASE_MOVE_SPEED; p.facing = 'left'; }
        if (keys[controls.right]) { p.vx = BASE_MOVE_SPEED; p.facing = 'right'; }
        if (p.shielding && jumpKey) p.facing = 'up';
        if (p.shielding && keys[controls.down]) p.facing = 'down';

        let prevJumpKey = prevKeys[controls.up];
        if (!p.shielding && jumpKey && !prevJumpKey) {
            let maxJumps = (currentEvent === 'Infinite Jump') ? 999 : 2;
            if (p.grounded) { 
                p.vy = BASE_JUMP; p.jumps = 1; p.lastWall = 0;
            } else if (p.onWall !== 0) { 
                if (p.lastWall !== p.onWall) {
                    p.vy = BASE_JUMP * 0.9; 
                    p.vx = p.onWall === -1 ? BASE_MOVE_SPEED * 1.5 : -BASE_MOVE_SPEED * 1.5; 
                    p.lastWall = p.onWall; 
                }
            } else if (p.jumps < maxJumps) { 
                p.vy = BASE_JUMP * 0.8; p.jumps++; 
            }
        }
    }
    if (shootKey && !p.shielding) shoot(p);
}

function update(dt) {
    if (gameState !== 'PLAYING') { Object.assign(prevKeys, keys); return; }

    let alivePlayers = players.filter(p => p.hp > 0);
    // NEW WIN STATE LOGIC
    if (alivePlayers.length <= 1) {
        if (keys[p1Controls.restart]) {
            if (alivePlayers.length > 0) { if (alivePlayers[0].id === 1) p1Wins++; else p2Wins++; }
            resetGame();
        }
        Object.assign(prevKeys, keys); return; 
    }

    eventCountdown -= dt;
    if (eventMessageTimer > 0) eventMessageTimer -= dt;
    if (eventCountdown <= 0) {
        if (currentEvent === 'None') triggerRandomEvent();
        else { currentEvent = 'None'; eventCountdown = 15; eventMessageTimer = 3; BASE_GRAVITY = 900; BASE_JUMP = -480; players.forEach(p => { p.w = p.baseW; p.h = p.baseH; }); }
    }

    nextWeaponTimer -= dt;
    if (nextWeaponTimer <= 0 && weaponDrops.length < 3 && currentEvent !== 'Minigun Only') {
        let p = platforms[Math.floor(Math.random() * (platforms.length - 1)) + 1];
        let types = ['shotgun', 'minigun', 'sniper']; let type = types[Math.floor(Math.random() * types.length)];
        weaponDrops.push({ x: p.x + p.w / 2, y: p.y - 15, w: 16, h: 16, type: type, color: type === 'shotgun' ? '#00ff00' : (type === 'minigun' ? '#ff8800' : '#ff0000') });
        nextWeaponTimer = 4 + Math.random() * 4; 
    }

    players.forEach(p => {
        p.cooldown -= dt; p.dashCd -= dt;
        if (p.isAI) { let target = players.find(other => other.id !== p.id); if (target) updateAI(p, target, dt); } 
        else { let controls = p.id === 1 ? p1Controls : p2Controls; handlePlayerInput(p, controls, dt); }
        updatePhysics(p, dt);
    });

    for (let i = weaponDrops.length - 1; i >= 0; i--) {
        let wd = weaponDrops[i];
        players.forEach(p => { if (rectIntersect(p, wd)) { p.weapon = wd.type; p.ammo = (wd.type === 'shotgun') ? 3 : (wd.type === 'minigun' ? 50 : 1); weaponDrops.splice(i, 1); } });
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; b.x += b.vx * dt; b.y += (b.vy || 0) * dt; let removed = false;
        players.forEach(p => {
            if (removed) return;
            let pShield = p.shielding ? getShieldRect(p) : null;
            if (pShield && rectIntersect(b, pShield) && b.ownerId !== p.id) { if (b.isUltimate) p.hp -= b.damage; else p.blocks = Math.min(10, p.blocks + 1); bullets.splice(i, 1); removed = true; return; }
            if (b.ownerId !== p.id && rectIntersect(b, p)) { p.hp -= b.damage; bullets.splice(i, 1); removed = true; return; }
        });
        if (!removed && (b.x < -150 || b.x > canvas.width + 150 || b.y < -150 || b.y > canvas.height + 150)) bullets.splice(i, 1);
    }
    Object.assign(prevKeys, keys);
}

function drawRect(rect, color) { ctx.fillStyle = color; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }

function drawPlayer(entity) {
    drawRect(entity, entity.dashTime > 0 ? 'white' : entity.color);
    ctx.fillStyle = lightColors.includes(entity.color) ? 'black' : 'white';
    let eyeSize = entity.w * 0.15; let eyeY = entity.y + entity.h * 0.2;
    if (entity.facing === 'right') { ctx.fillRect(entity.x + entity.w * 0.6, eyeY, eyeSize, eyeSize); ctx.fillRect(entity.x + entity.w * 0.85, eyeY, eyeSize, eyeSize); }
    else if (entity.facing === 'left') { ctx.fillRect(entity.x + entity.w * 0.1, eyeY, eyeSize, eyeSize); ctx.fillRect(entity.x + entity.w * 0.35, eyeY, eyeSize, eyeSize); }
    
    ctx.fillStyle = '#777'; let gunW = entity.w * 0.6; let gunH = entity.h * 0.2; let gunY = entity.y + entity.h * 0.5;
    if (entity.weapon === 'shotgun') { ctx.fillStyle = '#00ff00'; gunW = entity.w * 0.8; gunH = entity.h * 0.4; }
    if (entity.weapon === 'minigun') { ctx.fillStyle = '#ff8800'; gunW = entity.w; gunH = entity.h * 0.5; }
    if (entity.weapon === 'sniper') { ctx.fillStyle = '#ff0000'; gunW = entity.w * 1.5; gunH = entity.h * 0.15; }

    if (entity.facing === 'right') ctx.fillRect(entity.x + entity.w, gunY, gunW, gunH);
    if (entity.facing === 'left') ctx.fillRect(entity.x - gunW, gunY, gunW, gunH);

    if (entity.shielding) drawRect(getShieldRect(entity), entity.id === 1 ? '#00ffff' : '#ff8888');
    if (entity.weapon === 'sniper') {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctx.lineWidth = 1; ctx.beginPath();
        let sightY = gunY + gunH/2;
        ctx.moveTo(entity.facing === 'right' ? entity.x + entity.w : entity.x, sightY);
        ctx.lineTo(entity.facing === 'right' ? canvas.width : 0, sightY); ctx.stroke();
    }
}

function drawHUD() {
    let p1 = players.find(p => p.id === 1); let p2 = players.find(p => p.id === 2);
    ctx.fillStyle = 'white'; ctx.font = '14px Arial'; ctx.fillText(`P1 Wins: ${p1Wins}`, 20, 15); ctx.fillText(`P2 Wins: ${p2Wins}`, canvas.width - 90, 15);

    if (p1) {
        ctx.fillStyle = customBodyColor; ctx.font = '20px Arial'; ctx.fillText('❤'.repeat(Math.max(0, p1.hp)), 20, 35);
        ctx.fillStyle = '#444'; ctx.fillRect(20, 45, 100, 10);
        if (p1.blocks >= 10) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(20, 45, 100, 10); ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText('ULT (Q)', 20, 43); } 
        else { ctx.fillStyle = '#00ffff'; ctx.fillRect(20, 45, p1.blocks * 10, 10); }
        if (p1.weapon !== 'default') { ctx.fillStyle = 'white'; ctx.fillText(`${p1.weapon.toUpperCase()}: ${p1.ammo}`, 20, 75); }
    }
    if (p2) {
        ctx.fillStyle = 'red'; ctx.font = '20px Arial'; ctx.fillText('❤'.repeat(Math.max(0, p2.hp)), canvas.width - 120, 35);
        ctx.fillStyle = '#444'; ctx.fillRect(canvas.width - 120, 45, 100, 10);
        if (p2.blocks >= 10) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(canvas.width - 120, 45, 100, 10); ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText('ULT READY', canvas.width - 120, 43); } 
        else { ctx.fillStyle = '#00ffff'; ctx.fillRect(canvas.width - 120, 45, p2.blocks * 10, 10); }
        if (p2.weapon !== 'default') { ctx.fillStyle = 'white'; ctx.fillText(`${p2.weapon.toUpperCase()}: ${p2.ammo}`, canvas.width - 120, 75); }
    }

    if (currentEvent !== 'None') { ctx.fillStyle = '#ff00ff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText(`EVENT: ${currentEvent} (${Math.ceil(eventCountdown)}s)`, canvas.width/2, 30); ctx.textAlign = 'left'; }
    if (eventMessageTimer > 0) { ctx.fillStyle = 'white'; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center'; ctx.fillText(currentEvent === 'None' ? "EVENT ENDED" : `EVENT: ${currentEvent.toUpperCase()}!`, canvas.width/2, canvas.height/2 - 50); ctx.textAlign = 'left'; }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState !== 'PLAYING') return;

    stars.forEach(s => { ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`; ctx.fillRect(s.x, s.y, s.s, s.s); });
    platforms.forEach(p => drawRect(p, 'rgba(68, 68, 68, 0.8)'));
    weaponDrops.forEach(wd => { drawRect(wd, wd.color); ctx.strokeStyle = 'white'; ctx.strokeRect(wd.x, wd.y, wd.w, wd.h); }); 
    players.forEach(p => { if (p.hp > 0) drawPlayer(p); });
    bullets.forEach(b => drawRect(b, b.color)); 
    drawHUD();

    let alivePlayers = players.filter(p => p.hp > 0);
    if (alivePlayers.length <= 1) { 
        ctx.fillStyle = 'white'; ctx.font = '30px Arial'; ctx.textAlign = 'center';
        let rKey = p1Controls.restart.toUpperCase();
        if (alivePlayers.length === 0) ctx.fillText(`DRAW! Press ${rKey}`, canvas.width/2, 300);
        else ctx.fillText(`Player ${alivePlayers[0].id} WINS! Press ${rKey} to Continue`, canvas.width/2, 300);
        ctx.textAlign = 'left';
    }
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp; let dt = (timestamp - lastTime) / 1000; lastTime = timestamp; if (dt > 0.1) dt = 0.1;
    update(dt); draw(); requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Fullscreen Toggle Logic
const fullscreenBtn = document.getElementById('fullscreenBtn');

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        // If not in fullscreen, request it for the whole page
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        // If already in fullscreen, exit it
        document.exitFullscreen();
    }
});
