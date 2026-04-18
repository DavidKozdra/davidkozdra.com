// ==================== INDEXEDDB (bear-penny) ====================
var db = null;
var vaultGold = 0;
var vaultStats = { totalRuns: 0, bestWave: 0, bestCombo: 0, totalEarned: 0 };
var shopUpgrades = {};

function openDB() {
    return new Promise(function(resolve, reject) {
        var req = indexedDB.open('bear-penny', 5);
        req.onupgradeneeded = function(e) {
            var d = e.target.result;
            if (e.oldVersion < 3) {
                // Recreate stores without keyPath for v3
                if (d.objectStoreNames.contains('wallet')) d.deleteObjectStore('wallet');
                if (d.objectStoreNames.contains('stats')) d.deleteObjectStore('stats');
                d.createObjectStore('wallet');
                d.createObjectStore('stats');
            }
            if (!d.objectStoreNames.contains('portfolio')) d.createObjectStore('portfolio');
            if (!d.objectStoreNames.contains('upgrades')) d.createObjectStore('upgrades');
            if (!d.objectStoreNames.contains('news')) d.createObjectStore('news');
        };
        req.onsuccess = function(e) { db = e.target.result; resolve(db); };
        req.onerror = function(e) { reject(e); };
    });
}

function loadVault() {
    return new Promise(function(resolve) {
        if (!db) { resolve(0); return; }
        var tx = db.transaction('wallet', 'readonly');
        var store = tx.objectStore('wallet');
        var req = store.get('gold');
        req.onsuccess = function() { resolve(req.result || 0); };
        req.onerror = function() { resolve(0); };
    });
}

function saveVault(amount) {
    return new Promise(function(resolve) {
        if (!db) { resolve(); return; }
        var tx = db.transaction('wallet', 'readwrite');
        var store = tx.objectStore('wallet');
        store.put(amount, 'gold');
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
    });
}

function loadStats() {
    return new Promise(function(resolve) {
        if (!db) { resolve(vaultStats); return; }
        var tx = db.transaction('stats', 'readonly');
        var store = tx.objectStore('stats');
        var req = store.get('player');
        req.onsuccess = function() {
            if (req.result) {
                vaultStats = req.result;
            }
            resolve(vaultStats);
        };
        req.onerror = function() { resolve(vaultStats); };
    });
}

function saveStats() {
    return new Promise(function(resolve) {
        if (!db) { resolve(); return; }
        var tx = db.transaction('stats', 'readwrite');
        var store = tx.objectStore('stats');
        store.put(vaultStats, 'player');
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
    });
}

function loadUpgrades() {
    return new Promise(function(resolve) {
        if (!db) { resolve(shopUpgrades); return; }
        var tx = db.transaction('upgrades', 'readonly');
        var store = tx.objectStore('upgrades');
        var req = store.get('player');
        req.onsuccess = function() {
            if (req.result) {
                shopUpgrades = req.result;
            }
            resolve(shopUpgrades);
        };
        req.onerror = function() { resolve(shopUpgrades); };
    });
}

function saveUpgrades() {
    return new Promise(function(resolve) {
        if (!db) { resolve(); return; }
        var tx = db.transaction('upgrades', 'readwrite');
        var store = tx.objectStore('upgrades');
        store.put(shopUpgrades, 'player');
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
    });
}

function resetAllData() {
    return new Promise(function(resolve) {
        if (!db) { resolve(); return; }
        var tx = db.transaction(['wallet', 'stats', 'upgrades', 'portfolio', 'news'], 'readwrite');
        tx.objectStore('wallet').clear();
        tx.objectStore('stats').clear();
        tx.objectStore('upgrades').clear();
        tx.objectStore('portfolio').clear();
        tx.objectStore('news').clear();
        vaultGold = 0;
        vaultStats = { totalRuns: 0, bestWave: 0, bestCombo: 0, totalEarned: 0 };
        shopUpgrades = {};
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
    });
}

// ==================== GAME STATE ====================
var canvas, ctx, gameRunning, gameLoop;
var keys = {};
var player, fallingItems, particles;
var gold, wave, combo, maxCombo, comboTimer, hp, maxHp;
var waveTimer, waveInterval, spawnInterval, spawnTimer;
var magnetActive, magnetTimer;
var shieldActive, shieldTimer;
var frenzyActive, frenzyTimer;
var difficultyScale;
var bearQuotes = [];
var activeBearQuote = '';
var bearQuoteTimer = 0;
var activeBearMood = 'idle';
var lastBearEvent = 'idle';
var gameMode = 'idle';
var gamePaused = false;
var runState = null;
var currentNode = null;
var currentRunEvent = null;
var currentEncounterGoalWave = 0;
var currentEncounterType = '';
var mazeState = null;
var runBrokerOpen = false;

var RUN_NODE_TYPES = {
    battle: { label: 'Drop', icon: '🪙', desc: 'Survive the cave drop and keep the haul.' },
    maze:   { label: 'Maze', icon: '🧭', desc: 'Grab what you can and escape the tunnels.' },
    event:  { label: 'Event', icon: '🎲', desc: 'Make a choice and live with the tradeoff.' },
    boss:   { label: 'Boss', icon: '🐻', desc: 'Ray turns the whole cave against you.' }
};

var RUN_EVENT_POOL = [
    {
        kicker: 'Margin Desk',
        title: 'Ray Offers Leverage',
        body: 'A greasy ledger lands in your lap. Ray says debt is just confidence with paperwork.',
        choices: [
            { label: 'Take the leverage', detail: '+90 gold now. Lose 1 max HP.', effect: { gold: 90, maxHp: -1, hp: -1 }, result: 'You pocket the gold and your lungs somehow feel smaller.' },
            { label: 'Tune the magnet coils', detail: 'Pay 30 gold for +20% magnet duration.', effect: { gold: -30, magnetDuration: 0.2 }, result: 'The magnet starts humming like it wants the pennies more than you do.' },
            { label: 'Walk away', detail: 'No change. Keep the cave calm.', effect: {}, result: 'You refuse the deal and Ray looks briefly offended.' }
        ]
    },
    {
        kicker: 'Supply Cache',
        title: 'Emergency Rations',
        body: 'A half-buried crate still has medical wraps and sugar packets inside.',
        choices: [
            { label: 'Patch up', detail: 'Heal 2 HP.', effect: { hp: 2 }, result: 'You wrap the bad spots and keep moving.' },
            { label: 'Upgrade the kit', detail: '+1 max HP, +1 HP now.', effect: { maxHp: 1, hp: 1 }, result: 'You reinforce your gear and breathe easier.' },
            { label: 'Sell the crate contents', detail: '+55 gold.', effect: { gold: 55 }, result: 'The broker pays instantly. The cave would not have.' }
        ]
    },
    {
        kicker: 'Tax Tunnel',
        title: 'Shady Tax Shelter',
        body: 'A glowing arrow points toward a side tunnel promising "legal enough" shelter.',
        choices: [
            { label: 'Hide the trail', detail: 'Pay 35 gold for fewer enemies.', effect: { gold: -35, enemyRate: -0.12 }, result: 'The tunnel clears your scent. Fewer bears know where you are.' },
            { label: 'Raid the shelter', detail: '+70 gold but the cave gets meaner.', effect: { gold: 70, enemyRate: 0.12 }, result: 'You strip the room clean and every alarm in the cave wakes up.' },
            { label: 'Steal the blueprints', detail: '+20% maze payouts.', effect: { mazePayout: 0.2 }, result: 'The layouts make more sense now. The loot does too.' }
        ]
    },
    {
        kicker: 'Pitch Deck',
        title: 'Bull Case Presentation',
        body: 'A projector flickers on by itself and starts pitching pure optimism at you.',
        choices: [
            { label: 'Buy the thesis', detail: '+18% coin value.', effect: { coinMult: 0.18 }, result: 'You leave convinced every penny is underpriced.' },
            { label: 'Skip to the appendix', detail: '+10% move speed and +10% magnet pull.', effect: { moveSpeed: 0.1, magnetPull: 0.1 }, result: 'The useful pages were hidden in the back. Of course they were.' },
            { label: 'Short the room', detail: '+45 gold and lose 1 HP.', effect: { gold: 45, hp: -1 }, result: 'You profit from the collapse and inhale too much projector smoke.' }
        ]
    },
    {
        kicker: 'Cave Chapel',
        title: 'Magnet Shrine',
        body: 'Some previous runner built a shrine out of broken magnets, batteries, and pennies fused together.',
        choices: [
            { label: 'Make an offering', detail: 'Pay 25 gold for +15% magnet pull and +1 heart healing.', effect: { gold: -25, magnetPull: 0.15, healBonus: 1 }, result: 'The shrine accepts your bribe and rewires your luck.' },
            { label: 'Crack it open', detail: '+65 gold, lose 1 HP.', effect: { gold: 65, hp: -1 }, result: 'It was mostly copper and bad decisions. Still profitable.' },
            { label: 'Sit quietly', detail: 'Heal 1 HP.', effect: { hp: 1 }, result: 'The cave goes silent long enough for your pulse to slow down.' }
        ]
    }
];

var RUN_BROKER_ITEMS = {
    bucket:   { name: 'Bucket Rig',      icon: '🪣', maxLvl: 4, costs: [35, 70, 120, 190],          desc: '+10px bucket width per rank' },
    leverage: { name: 'Bull Thesis',     icon: '📈', maxLvl: 4, costs: [45, 90, 155, 235],          desc: '+15% drop and maze payout per rank' },
    magnet:   { name: 'Magnet Desk',     icon: '🧲', maxLvl: 4, costs: [40, 85, 145, 220],          desc: '+20% magnet pull and duration per rank' },
    footwork: { name: 'Floor Tape',      icon: '👟', maxLvl: 4, costs: [30, 65, 110, 170],          desc: 'Move faster in drops and mazes' },
    medkit:   { name: 'Patch Kit',       icon: '🩹', maxLvl: 6, costs: [40, 65, 95, 130, 170, 215], desc: 'Heal 2 HP immediately' }
};

var BEAR_TAUNTS = {
    start: [
        'Fresh run. Fresh losses.',
        'All your pennies is MINE.',
        'I can already smell the panic.'
    ],
    hit: [
        'Goddamn it, goddamn it.',
        'All your pennies is MINE.',
        'That bucket is leaking confidence.'
    ],
    block: [
        'Lucky block. Won\'t save you twice.',
        'Cute shield. I still own the market.',
        'You delayed the inevitable.'
    ],
    wave: [
        'New wave. Same suffering.',
        'The cave gets meaner from here.',
        'I brought friends.'
    ],
    combo: [
        'Too many pennies. Hand them over.',
        'Greedy little collector, aren\'t you?',
        'Stack them up. I\'ll take them later.'
    ],
    miss: [
        'Dropped one. It\'s mine now.',
        'Pennies on the floor belong to the bear.',
        'Keep fumbling. I\'m profiting.'
    ],
    powerup: [
        'Temporary edge. Permanent doom.',
        'Powerups won\'t fix your fundamentals.',
        'You juiced the run. I noticed.'
    ],
    gameOver: [
        'Run over. Treasury transferred.',
        'I told you those pennies were mine.',
        'Back to the cave with your empty bucket.'
    ],
    idle: [
        'I\'m watching every penny.',
        'The bear is visible. Your hope is not.',
        'Keep playing. I need the entertainment.'
    ]
};

// Item types
var ITEM_TYPES = {
    penny:    { emoji: '🪙', value: 1,  w: 22, h: 22, bad: false },
    redpenny: { emoji: '🔴', value: 2,  w: 22, h: 22, bad: false, red: true },
    silver:   { emoji: '🥈', value: 5,  w: 24, h: 24, bad: false },
    goldbar:  { emoji: '🥇', value: 25, w: 28, h: 28, bad: false },
    diamond:  { emoji: '💎', value: 100, w: 26, h: 26, bad: false },
    bear:     { emoji: '🐻', value: 0,  w: 30, h: 30, bad: true, damage: 1 },
    bomb:     { emoji: '💣', value: 0,  w: 26, h: 26, bad: true, damage: 1 },
    skull:    { emoji: '💀', value: 0,  w: 28, h: 28, bad: true, damage: 2 },
    heart:    { emoji: '❤️', value: 0,  w: 24, h: 24, bad: false, heal: 1 },
    magnet:   { emoji: '🧲', value: 0,  w: 26, h: 26, bad: false, powerup: 'magnet' },
    shield:   { emoji: '🛡️', value: 0, w: 26, h: 26, bad: false, powerup: 'shield' },
    frenzy:   { emoji: '⚡', value: 0,  w: 26, h: 26, bad: false, powerup: 'frenzy' },
};

// ==================== SHOP UPGRADES ====================
var SHOP_UPGRADES = {
    // Game Upgrades
    coinSize:        { name: 'Bigger Coins',       cat: 'game', icon: '🪙', maxLvl: 5, costs: [100, 250, 500, 1000, 2000],     desc: '+10% coin hitbox size per level' },
    startingHp:      { name: 'Tough Start',        cat: 'game', icon: '💪', maxLvl: 3, costs: [150, 400, 1000],                 desc: 'Start with +1 HP per level' },
    maxHpUp:         { name: 'Iron Constitution',   cat: 'game', icon: '🛡️', maxLvl: 3, costs: [200, 600, 1500],                desc: '+1 max HP cap per level' },
    heartHealing:    { name: 'Better Bandages',    cat: 'game', icon: '❤️', maxLvl: 3, costs: [125, 325, 850],                  desc: 'Hearts heal +1 HP per level' },
    heartDropRate:   { name: 'Lucky Hearts',       cat: 'game', icon: '💖', maxLvl: 4, costs: [100, 250, 600, 1400],            desc: '+2% heart spawn chance per level' },
    redPennyRate:    { name: 'Red Penny Rush',     cat: 'game', icon: '🔴', maxLvl: 5, costs: [75, 200, 400, 800, 1600],        desc: '+4% red penny spawn chance per level' },
    bucketWidth:     { name: 'Wider Bucket',       cat: 'game', icon: '🪣', maxLvl: 5, costs: [100, 250, 500, 1000, 2000],      desc: '+6px bucket width per level' },
    powerupDuration: { name: 'Lasting Power',      cat: 'game', icon: '⏳', maxLvl: 4, costs: [150, 350, 750, 1500],             desc: '+15% powerup duration per level' },
    magnetDuration:  { name: 'Polar Pull',         cat: 'game', icon: '🧲', maxLvl: 4, costs: [125, 300, 700, 1400],            desc: '+25% Magnet duration per level' },
    startPowerup:    { name: 'Head Start',         cat: 'game', icon: '🚀', maxLvl: 1, costs: [500],                             desc: 'Start each run with a random powerup' },
    bearReduction:   { name: 'Bear Repellent',     cat: 'game', icon: '🧴', maxLvl: 4, costs: [200, 500, 1000, 2500],            desc: '-8% enemy spawn rate per level' },
    comboBonus:      { name: 'Combo Master',       cat: 'game', icon: '🔥', maxLvl: 3, costs: [300, 750, 2000],                  desc: '+1 base combo multiplier per level' },
    // Portal Upgrades
    taxReduction:    { name: 'Tax Loophole',       cat: 'portal', icon: '📉', maxLvl: 5, costs: [200, 500, 1000, 2500, 5000],   desc: '-1.5% tax rate per level (10% -> 2.5%)' },
    taxTimer:        { name: 'Extended Filing',    cat: 'portal', icon: '⏰', maxLvl: 4, costs: [150, 400, 900, 2000],            desc: '+60s between tax collections per level' },
    tradeFee:        { name: 'Broker License',     cat: 'portal', icon: '🤝', maxLvl: 4, costs: [250, 600, 1200, 3000],           desc: '5% better buy/sell prices per level' },
    dividends:       { name: 'Dividend Portfolio', cat: 'portal', icon: '💰', maxLvl: 5, costs: [300, 700, 1500, 3000, 6000],    desc: '+2% dividend yield per tax cycle' },
    flatTaxReduction:{ name: 'Tax Shelter',        cat: 'portal', icon: '🏠', maxLvl: 4, costs: [100, 300, 700, 1500],            desc: '-10g flat tax per level (50g -> 10g)' },
    newsDesk:        { name: 'News Desk',          cat: 'portal', icon: '📰', maxLvl: 1, costs: [450],                             desc: 'Unlock the News tab with market gossip and mover headlines' },
};

function getUpgradeLevel(id) {
    return (shopUpgrades && shopUpgrades[id]) || 0;
}

function getRunBrokerLevel(id) {
    return runState && runState.broker ? (runState.broker[id] || 0) : 0;
}

function getRunModifier(id) {
    return runState && runState.mods ? (runState.mods[id] || 0) : 0;
}

function getHeartHealAmount() {
    return ITEM_TYPES.heart.heal + getUpgradeLevel('heartHealing') + getRunModifier('healBonus');
}

function getHeartSpawnChance() {
    return 0.04 + getUpgradeLevel('heartDropRate') * 0.02;
}

function getMagnetDurationFrames() {
    var durationMult = 1 + getUpgradeLevel('powerupDuration') * 0.15 + getUpgradeLevel('magnetDuration') * 0.25 + getRunBrokerLevel('magnet') * 0.2 + getRunModifier('magnetDuration');
    return Math.floor(8 * 60 * durationMult);
}

function getRunCoinMultiplier() {
    return 1 + getRunBrokerLevel('leverage') * 0.15 + getRunModifier('coinMult');
}

function getRunMazeMultiplier() {
    return 1 + getRunBrokerLevel('leverage') * 0.15 + getRunModifier('mazePayout');
}

function getRunBucketWidth() {
    return 48 + getUpgradeLevel('bucketWidth') * 6 + getRunBrokerLevel('bucket') * 10;
}

function getDropMoveSpeed() {
    return (6 + getRunBrokerLevel('footwork') * 0.5) * (1 + getRunModifier('moveSpeed'));
}

function getFrenzyMoveSpeed() {
    return getDropMoveSpeed() + 3;
}

function getMagnetPullStrength() {
    return 0.08 * (1 + getRunBrokerLevel('magnet') * 0.2 + getRunModifier('magnetPull'));
}

function getEnemyRateMultiplier() {
    return Math.max(0.65, 1 + getRunModifier('enemyRate'));
}

function getMazeMoveDelay() {
    return Math.max(4, 9 - getRunBrokerLevel('footwork') - Math.round(getRunModifier('moveSpeed') * 6));
}

function loadBearQuotes() {
    fetch('./entities/bear-quotes.json')
        .then(function(r) { return r.json(); })
        .then(function(data) { bearQuotes = data; })
        .catch(function() { bearQuotes = ['Grr...']; });
}

function showBearQuote(eventType, customText) {
    var pool = customText ? [customText] : (BEAR_TAUNTS[eventType] || bearQuotes || []);
    if (!pool || pool.length === 0) pool = bearQuotes;
    if (!pool || pool.length === 0) return;
    activeBearQuote = pool[Math.floor(Math.random() * pool.length)];
    bearQuoteTimer = 240;
    activeBearMood = eventType || 'idle';
    lastBearEvent = eventType || 'idle';
}

function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    loadBearQuotes();
    openDB().then(function() {
        return Promise.all([loadVault(), loadStats(), loadUpgrades()]);
    }).then(function(results) {
        vaultGold = results[0];
        refreshSettingsPanel();
        refreshStartScreen();
    });
}

function refreshStartScreen() {
    document.getElementById('start-vault').textContent = vaultGold;
    document.getElementById('start-runs').textContent = vaultStats.totalRuns;
    document.getElementById('start-best-wave').textContent = vaultStats.bestWave;
    var upgradeCount = 0;
    var ids = Object.keys(shopUpgrades);
    for (var i = 0; i < ids.length; i++) upgradeCount += shopUpgrades[ids[i]];
    var el = document.getElementById('start-upgrades');
    if (el) el.textContent = upgradeCount;
}

function shuffleCopy(list) {
    return list.slice().sort(function() { return Math.random() - 0.5; });
}

function getNodeTitle(type, tier) {
    var titles = {
        battle: ['Coin Drop', 'Treasury Spill', 'Red Penny Storm', 'Flash Crash', 'Closing Bell'],
        maze: ['Audit Tunnels', 'Vault Maze', 'Exit Liquidity', 'Dark Corridor', 'Blind Cave'],
        event: ['Weird Deal', 'Broker Pitch', 'Strange Find', 'Backroom Choice', 'Ray Interruption'],
        boss: ['Boss Bear']
    };
    var pool = titles[type] || ['Node'];
    return pool[Math.min(tier, pool.length - 1)];
}

function getNodeCopy(type, tier) {
    if (type === 'battle') return 'Survive ' + getEncounterWaveGoal({ type: type, tier: tier }) + ' waves and keep the haul.';
    if (type === 'maze') return 'Grab stash, avoid traps, and find the exit.';
    if (type === 'event') return 'Take a risk, buy leverage, or leave with scars.';
    return 'Ray takes the gloves off. Expect a brutal drop floor.';
}

function createRunNode(type, tier, lane) {
    return {
        id: 'tier-' + tier + '-lane-' + lane,
        type: type,
        tier: tier,
        lane: lane,
        title: getNodeTitle(type, tier),
        copy: getNodeCopy(type, tier),
        cleared: false
    };
}

function createRunMap() {
    var template = [
        ['battle', 'event', 'maze'],
        ['battle', 'maze', 'event'],
        ['battle', 'event', 'battle'],
        ['maze', 'battle', 'event'],
        ['battle', 'maze', 'event']
    ];
    var map = [];
    for (var t = 0; t < template.length; t++) {
        var types = shuffleCopy(template[t]);
        var tier = [];
        for (var lane = 0; lane < 3; lane++) tier.push(createRunNode(types[lane], t, lane));
        map.push(tier);
    }
    map.push([createRunNode('boss', template.length, 1)]);
    return map;
}

function createRunState() {
    var baseMaxHp = 5 + getUpgradeLevel('maxHpUp');
    var baseHp = Math.min(baseMaxHp, 3 + getUpgradeLevel('startingHp'));
    return {
        gold: 0,
        hp: baseHp,
        maxHp: baseMaxHp,
        tier: 0,
        lane: 1,
        broker: {},
        mods: {
            coinMult: 0,
            magnetPull: 0,
            magnetDuration: 0,
            moveSpeed: 0,
            mazePayout: 0,
            enemyRate: 0,
            healBonus: 0
        },
        map: createRunMap(),
        bestCombo: 0,
        bestWave: 0,
        nodesCleared: 0,
        lastSummary: 'Choose the next node on Ray\'s route.'
    };
}

function setGameView(view) {
    var ids = ['game-start', 'run-map', 'event-screen', 'game-over'];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.classList.add('hidden');
    }
    var canvasEl = document.getElementById('game-canvas');
    if (canvasEl) canvasEl.classList.add('hidden');
    var hud = document.getElementById('game-hud');
    if (hud) hud.classList.add('hidden');

    if (view === 'start') document.getElementById('game-start').classList.remove('hidden');
    if (view === 'map') document.getElementById('run-map').classList.remove('hidden');
    if (view === 'event') document.getElementById('event-screen').classList.remove('hidden');
    if (view === 'encounter') {
        if (canvasEl) canvasEl.classList.remove('hidden');
        if (hud) hud.classList.remove('hidden');
    }
    if (view === 'over') document.getElementById('game-over').classList.remove('hidden');
}

function attachGameInput() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchmove', onTouch);
    canvas.removeEventListener('mousemove', onMouse);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('touchmove', onTouch);
    canvas.addEventListener('mousemove', onMouse);
}

function detachGameInput() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    if (canvas) {
        canvas.removeEventListener('touchmove', onTouch);
        canvas.removeEventListener('mousemove', onMouse);
    }
}

function stopEncounterLoop() {
    gameRunning = false;
    gamePaused = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    detachGameInput();
}

function syncRunStateFromGlobals() {
    if (!runState) return;
    runState.gold = gold || 0;
    runState.hp = Math.max(0, hp || 0);
    runState.maxHp = maxHp || runState.maxHp;
    runState.bestCombo = Math.max(runState.bestCombo, maxCombo || 0);
    runState.bestWave = Math.max(runState.bestWave, wave || 0);
}

function findRunNode(id) {
    if (!runState) return null;
    for (var t = 0; t < runState.map.length; t++) {
        for (var i = 0; i < runState.map[t].length; i++) {
            if (runState.map[t][i].id === id) return runState.map[t][i];
        }
    }
    return null;
}

function isNodeAvailable(node) {
    if (!runState || !node || node.cleared || node.tier !== runState.tier) return false;
    if (runState.tier === 0) return true;
    if (runState.map[node.tier].length === 1) return true;
    return Math.abs(node.lane - runState.lane) <= 1;
}

function renderRunMap() {
    if (!runState) return;
    var grid = document.getElementById('run-map-grid');
    if (!grid) return;
    var html = '';
    for (var t = 0; t < runState.map.length; t++) {
        var tier = runState.map[t];
        html += '<div class="run-map-column">';
        html += '<div class="run-map-column-label">Floor ' + (t + 1) + '</div>';
        for (var i = 0; i < tier.length; i++) {
            var node = tier[i];
            var def = RUN_NODE_TYPES[node.type];
            var available = isNodeAvailable(node);
            var stateText = node.cleared ? 'CLEARED' : (available ? 'READY' : (t < runState.tier ? 'DONE' : 'LOCKED'));
            var classes = 'run-node';
            if (node.cleared) classes += ' cleared';
            if (available) classes += ' available current';
            if (!node.cleared && !available && t >= runState.tier) classes += ' locked';
            if (node.type === 'boss') classes += ' node-boss';
            if (available) {
                html += '<button class="' + classes + '" onclick="chooseRunNode(\'' + node.id + '\')">';
            } else {
                html += '<div class="' + classes + '">';
            }
            html += '<div class="run-node-top"><span>' + def.icon + ' ' + def.label + '</span><span>' + stateText + '</span></div>';
            html += '<div class="run-node-name">' + node.title + '</div>';
            html += '<div class="run-node-copy">' + node.copy + '</div>';
            html += available ? '</button>' : '</div>';
        }
        html += '</div>';
    }
    grid.innerHTML = html;
    document.getElementById('run-map-kicker').textContent = runState.tier >= runState.map.length - 1 ? 'Boss Route' : 'Route Planning';
    document.getElementById('run-map-title').textContent = runState.tier >= runState.map.length - 1 ? 'Final Descent' : 'Penny Path';
    document.getElementById('run-map-floor').textContent = (runState.tier + 1) + ' / ' + runState.map.length;
    document.getElementById('run-map-gold').textContent = runState.gold + 'g';
    document.getElementById('run-map-hp').textContent = runState.hp + ' / ' + runState.maxHp;
    document.getElementById('run-map-copy').textContent = runState.lastSummary;
}

function showRunMap() {
    if (!runState) return;
    gameMode = 'map';
    currentRunEvent = null;
    currentNode = null;
    mazeState = null;
    runBrokerOpen = false;
    document.getElementById('run-broker-panel').classList.add('hidden');
    setGameView('map');
    renderRunMap();
}

function getEncounterWaveGoal(node) {
    if (!node) return 3;
    if (node.type === 'boss') return 5;
    return Math.min(4, 3 + Math.floor(node.tier / 3));
}

function resetEncounterState() {
    fallingItems = [];
    particles = [];
    wave = 1;
    combo = 0;
    comboTimer = 0;
    magnetActive = false;
    magnetTimer = 0;
    shieldActive = false;
    shieldTimer = 0;
    frenzyActive = false;
    frenzyTimer = 0;
    keys = {};
    activeBearQuote = '';
    bearQuoteTimer = 0;
    maxCombo = runState ? runState.bestCombo : 0;
}

function applyStartPowerup() {
    if (getUpgradeLevel('startPowerup') < 1) return;
    var powerups = ['magnet', 'shield', 'frenzy'];
    var pick = powerups[Math.floor(Math.random() * powerups.length)];
    var durMult = 1 + getUpgradeLevel('powerupDuration') * 0.15;
    if (pick === 'magnet') { magnetActive = true; magnetTimer = getMagnetDurationFrames(); }
    else if (pick === 'shield') { shieldActive = true; shieldTimer = Math.floor(12 * 60 * durMult); }
    else if (pick === 'frenzy') { frenzyActive = true; frenzyTimer = Math.floor(6 * 60 * durMult); }
}

function startBattleEncounter(node) {
    currentNode = node;
    currentEncounterType = node.type;
    currentEncounterGoalWave = getEncounterWaveGoal(node);
    runBrokerOpen = false;
    document.getElementById('run-broker-panel').classList.add('hidden');
    gold = runState.gold;
    hp = runState.hp;
    maxHp = runState.maxHp;
    resetEncounterState();
    setGameView('encounter');
    resizeCanvas();

    var bucketW = getRunBucketWidth();
    player = { x: canvas.width / 2 - Math.floor(bucketW / 2), w: bucketW, h: 18 };
    player.y = canvas.height - 44;
    difficultyScale = 1 + node.tier * 0.12 + (node.type === 'boss' ? 0.18 : 0);
    waveTimer = 0;
    waveInterval = node.type === 'boss' ? 9 * 60 : 11 * 60;
    spawnInterval = Math.max(node.type === 'boss' ? 28 : 32, 40 - node.tier * 2);
    spawnTimer = 0;

    gameMode = 'battle';
    gameRunning = true;
    gamePaused = false;
    applyStartPowerup();
    updateHUD();
    attachGameInput();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    showBearQuote('start', node.type === 'boss' ? 'Boss floor. All your pennies is MINE.' : 'New floor. Catch fast or pay later.');
    tick();
}

function buildRunEvent() {
    var tpl = RUN_EVENT_POOL[Math.floor(Math.random() * RUN_EVENT_POOL.length)];
    return JSON.parse(JSON.stringify(tpl));
}

function openRunEvent(node) {
    currentNode = node;
    currentRunEvent = buildRunEvent();
    runBrokerOpen = false;
    document.getElementById('run-broker-panel').classList.add('hidden');
    setGameView('event');
    gameMode = 'event';
    showBearQuote('powerup', 'A side deal opened. This will definitely age well.');
    renderCurrentRunEvent();
}

function canAffordEventChoice(choice) {
    if (!choice || !choice.effect || !runState) return false;
    if (typeof choice.effect.gold === 'number' && choice.effect.gold < 0 && runState.gold < Math.abs(choice.effect.gold)) return false;
    if (typeof choice.effect.maxHp === 'number' && runState.maxHp + choice.effect.maxHp < 1) return false;
    return true;
}

function renderCurrentRunEvent() {
    if (!currentRunEvent) return;
    document.getElementById('event-kicker').textContent = currentRunEvent.kicker;
    document.getElementById('event-title').textContent = currentRunEvent.title;
    document.getElementById('event-body').textContent = currentRunEvent.body;
    document.getElementById('event-result').classList.add('hidden');
    document.getElementById('event-continue').classList.add('hidden');
    var choicesEl = document.getElementById('event-choices');
    var html = '';
    for (var i = 0; i < currentRunEvent.choices.length; i++) {
        var choice = currentRunEvent.choices[i];
        var blocked = !canAffordEventChoice(choice);
        html += '<button class="event-choice"' + (blocked ? ' disabled' : ' onclick="resolveRunEventChoice(' + i + ')"') + '>';
        html += '<strong>' + choice.label + '</strong>';
        html += '<span>' + choice.detail + (blocked ? ' (Not enough gold)' : '') + '</span>';
        html += '</button>';
    }
    choicesEl.innerHTML = html;
}

function applyRunEffects(effect) {
    if (!runState || !effect) return;
    if (typeof effect.gold === 'number') runState.gold = Math.max(0, runState.gold + effect.gold);
    if (typeof effect.maxHp === 'number') runState.maxHp = Math.max(1, runState.maxHp + effect.maxHp);
    if (typeof effect.hp === 'number') runState.hp = Math.max(0, Math.min(runState.maxHp, runState.hp + effect.hp));
    runState.hp = Math.min(runState.maxHp, runState.hp);
    var modKeys = ['coinMult', 'magnetPull', 'magnetDuration', 'moveSpeed', 'mazePayout', 'enemyRate', 'healBonus'];
    for (var i = 0; i < modKeys.length; i++) {
        var key = modKeys[i];
        if (typeof effect[key] === 'number') runState.mods[key] += effect[key];
    }
    gold = runState.gold;
    hp = runState.hp;
    maxHp = runState.maxHp;
}

function resolveRunEventChoice(index) {
    if (!currentRunEvent || !currentRunEvent.choices[index]) return;
    var choice = currentRunEvent.choices[index];
    if (!canAffordEventChoice(choice)) return;
    applyRunEffects(choice.effect);
    if (runState.hp <= 0) {
        finishRun(false);
        return;
    }
    document.getElementById('event-choices').innerHTML = '';
    var result = document.getElementById('event-result');
    result.textContent = choice.result;
    result.classList.remove('hidden');
    document.getElementById('event-continue').classList.remove('hidden');
    runState.lastSummary = choice.result;
}

function continueFromEvent() {
    finishCurrentNode(runState ? runState.lastSummary : 'The deal is done.');
}

function toggleRunBroker() {
    if (!runState) return;
    runBrokerOpen = !runBrokerOpen;
    var panel = document.getElementById('run-broker-panel');
    if (panel) panel.classList.toggle('hidden', !runBrokerOpen);
    gamePaused = runBrokerOpen && gameRunning;
    if (runBrokerOpen) renderRunBroker();
}

function renderRunBroker() {
    if (!runState) return;
    var grid = document.getElementById('run-broker-grid');
    if (!grid) return;
    document.getElementById('run-broker-gold').textContent = runState.gold + 'g';
    var html = '';
    var ids = Object.keys(RUN_BROKER_ITEMS);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var item = RUN_BROKER_ITEMS[id];
        var lvl = getRunBrokerLevel(id);
        var maxed = lvl >= item.maxLvl;
        var cost = maxed ? 0 : item.costs[lvl];
        var canAfford = !maxed && runState.gold >= cost;
        html += '<div class="run-broker-item' + (maxed ? ' maxed' : '') + '">';
        html += '<div class="run-broker-item-top"><div class="run-broker-item-name">' + item.icon + ' ' + item.name + '</div><div>Lv ' + lvl + ' / ' + item.maxLvl + '</div></div>';
        html += '<div class="run-broker-item-meta">' + item.desc + '</div>';
        if (maxed) {
            html += '<button class="maxed" disabled>MAXED</button>';
        } else {
            html += '<button onclick="purchaseRunBrokerUpgrade(\'' + id + '\')"' + (canAfford ? '' : ' disabled') + '>' + cost + 'g</button>';
        }
        html += '</div>';
    }
    grid.innerHTML = html;
}

function purchaseRunBrokerUpgrade(id) {
    if (!runState || !RUN_BROKER_ITEMS[id]) return;
    var item = RUN_BROKER_ITEMS[id];
    var lvl = getRunBrokerLevel(id);
    if (lvl >= item.maxLvl) return;
    var cost = item.costs[lvl];
    if (runState.gold < cost) return;

    runState.gold -= cost;
    runState.broker[id] = lvl + 1;
    if (id === 'medkit') runState.hp = Math.min(runState.maxHp, runState.hp + 2);
    gold = runState.gold;
    hp = runState.hp;
    maxHp = runState.maxHp;
    if (player && gameMode === 'battle') {
        player.w = getRunBucketWidth();
        player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    }
    renderRunBroker();
    renderRunMap();
    updateHUD();
}

function mazeCellIndex(cols, x, y) {
    return y * cols + x;
}

function mazeHasPath(cols, rows, walls) {
    var queue = [{ x: 0, y: 0 }];
    var seen = {};
    while (queue.length) {
        var cell = queue.shift();
        var key = cell.x + ',' + cell.y;
        if (seen[key]) continue;
        seen[key] = true;
        if (cell.x === cols - 1 && cell.y === rows - 1) return true;
        var dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (var i = 0; i < dirs.length; i++) {
            var nx = cell.x + dirs[i][0];
            var ny = cell.y + dirs[i][1];
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            if (walls[mazeCellIndex(cols, nx, ny)]) continue;
            queue.push({ x: nx, y: ny });
        }
    }
    return false;
}

function randomMazeCell(state, used) {
    for (var tries = 0; tries < 200; tries++) {
        var x = Math.floor(Math.random() * state.cols);
        var y = Math.floor(Math.random() * state.rows);
        var key = x + ',' + y;
        if (used[key]) continue;
        if (state.walls[mazeCellIndex(state.cols, x, y)]) continue;
        if ((x === 0 && y === 0) || (x === state.exit.x && y === state.exit.y)) continue;
        used[key] = true;
        return { x: x, y: y };
    }
    return null;
}

function createMazeState(node) {
    var cols = 12;
    var rows = 8;
    var walls = [];
    for (var attempt = 0; attempt < 40; attempt++) {
        walls = [];
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var wall = Math.random() < 0.24 && !(x === 0 && y === 0) && !(x === cols - 1 && y === rows - 1);
                walls.push(wall);
            }
        }
        if (mazeHasPath(cols, rows, walls)) break;
    }

    var state = {
        cols: cols,
        rows: rows,
        walls: walls,
        player: { x: 0, y: 0 },
        exit: { x: cols - 1, y: rows - 1 },
        coins: [],
        traps: [],
        collected: 0,
        totalCoins: 0,
        stepCooldown: 0
    };
    var used = {};
    var coinCount = 5 + Math.min(3, node.tier);
    var trapCount = 3 + Math.min(2, Math.floor(node.tier / 2));
    for (var i = 0; i < coinCount; i++) {
        var coinCell = randomMazeCell(state, used);
        if (!coinCell) break;
        state.coins.push({ x: coinCell.x, y: coinCell.y, value: Math.round((8 + node.tier * 3 + Math.random() * 6) * getRunMazeMultiplier()) });
    }
    for (var j = 0; j < trapCount; j++) {
        var trapCell = randomMazeCell(state, used);
        if (!trapCell) break;
        state.traps.push({ x: trapCell.x, y: trapCell.y, damage: 1 });
    }
    state.totalCoins = state.coins.length;
    return state;
}

function startMazeEncounter(node) {
    currentNode = node;
    currentEncounterType = 'maze';
    runBrokerOpen = false;
    document.getElementById('run-broker-panel').classList.add('hidden');
    gold = runState.gold;
    hp = runState.hp;
    maxHp = runState.maxHp;
    resetEncounterState();
    mazeState = createMazeState(node);
    setGameView('encounter');
    resizeCanvas();
    gameMode = 'maze';
    gameRunning = true;
    gamePaused = false;
    updateHUD();
    attachGameInput();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    showBearQuote('start', 'Maze floor. Grab the stash and get out before the cave reprices you.');
    tick();
}

function chooseRunNode(id) {
    var node = findRunNode(id);
    if (!isNodeAvailable(node)) return;
    if (node.type === 'event') openRunEvent(node);
    else if (node.type === 'maze') startMazeEncounter(node);
    else startBattleEncounter(node);
}

function finishCurrentNode(summary) {
    syncRunStateFromGlobals();
    stopEncounterLoop();
    if (!runState || !currentNode) return;
    currentNode.cleared = true;
    runState.nodesCleared++;
    runState.tier = currentNode.tier + 1;
    runState.lane = currentNode.lane;
    runState.lastSummary = summary || 'The route moves deeper into the cave.';
    currentEncounterType = '';
    currentEncounterGoalWave = 0;
    mazeState = null;
    currentRunEvent = null;
    if (runState.tier >= runState.map.length) {
        finishRun(true);
        return;
    }
    showRunMap();
}

function retireRun() {
    if (!runState) return;
    if (!confirm('Cash out this run now and bank the gold?')) return;
    finishRun(false, true);
}

function finishRun(victory, retired) {
    syncRunStateFromGlobals();
    stopEncounterLoop();
    if (document.getElementById('run-broker-panel')) document.getElementById('run-broker-panel').classList.add('hidden');
    runBrokerOpen = false;

    var payout = runState ? runState.gold : (gold || 0);
    var cleared = runState ? runState.nodesCleared : 0;
    var totalNodes = runState ? runState.map.length : 0;
    var bestRunCombo = runState ? runState.bestCombo : (maxCombo || 0);
    var bestRunWave = runState ? runState.bestWave : (wave || 0);

    vaultGold += payout;
    vaultStats.totalRuns++;
    vaultStats.totalEarned += payout;
    if (bestRunWave > vaultStats.bestWave) vaultStats.bestWave = bestRunWave;
    if (bestRunCombo > vaultStats.bestCombo) vaultStats.bestCombo = bestRunCombo;
    saveVault(vaultGold);
    saveStats();

    document.getElementById('final-title').textContent = victory ? 'Cave Cleared!' : (retired ? 'Run Cashed Out' : 'Run Over!');
    document.getElementById('final-gold').textContent = payout;
    document.getElementById('final-progress-line').textContent = 'Nodes cleared: ' + cleared + ' / ' + totalNodes;
    document.getElementById('final-stats-line').textContent = 'Best combo: x' + bestRunCombo + ' · Highest wave: ' + bestRunWave;
    document.getElementById('final-vault').textContent = vaultGold;
    setGameView('over');

    showBearQuote(victory ? 'combo' : 'gameOver', victory ? 'You cleared the cave. I hate that for me.' : undefined);
    if (typeof updateBalanceBar === 'function') updateBalanceBar(vaultGold);
    if (typeof renderCurrentPage === 'function') renderCurrentPage();

    runState = null;
    currentNode = null;
    currentRunEvent = null;
    mazeState = null;
    gameMode = 'over';
}

function resizeCanvas() {
    if (!canvas) return;
    var overlay = document.getElementById('game-overlay');
    var hud = document.getElementById('game-hud');
    var hudHeight = hud && !hud.classList.contains('hidden') ? hud.offsetHeight : 0;
    canvas.width = overlay.clientWidth || window.innerWidth;
    canvas.height = Math.max(320, (overlay.clientHeight || window.innerHeight) - Math.max(50, hudHeight + 8));
}

function closeGame() {
    stopEncounterLoop();
    if (canvas) canvas.classList.add('hidden');
    setGameView('start');
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('shop-panel').classList.add('hidden');
    document.getElementById('run-broker-panel').classList.add('hidden');
    shopOpen = false;
    runBrokerOpen = false;
    runState = null;
    currentNode = null;
    currentRunEvent = null;
    mazeState = null;
    gameMode = 'idle';
}

function toggleSettings() {
    var panel = document.getElementById('settings-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        document.getElementById('shop-panel').classList.add('hidden');
        shopOpen = false;
        refreshSettingsPanel();
    }
}

function refreshSettingsPanel() {
    document.getElementById('set-vault').textContent = vaultGold;
    document.getElementById('set-runs').textContent = vaultStats.totalRuns;
    document.getElementById('set-best-wave').textContent = vaultStats.bestWave;
    document.getElementById('set-best-combo').textContent = vaultStats.bestCombo;
    document.getElementById('set-total-earned').textContent = vaultStats.totalEarned;
}

function confirmResetData() {
    if (confirm('Reset ALL BearPenny data? This deletes your vault gold, stats, and everything. Cannot be undone.')) {
        resetAllData().then(function() {
            if (typeof portfolio !== 'undefined') {
                portfolio = {};
            }
            if (typeof newsFeed !== 'undefined') {
                newsFeed = [];
            }
            refreshSettingsPanel();
            refreshStartScreen();
            if (typeof updateBalanceBar === 'function') updateBalanceBar(vaultGold);
            if (typeof renderCurrentPage === 'function') renderCurrentPage();
            if (typeof syncNewsTabState === 'function') syncNewsTabState();
            if (typeof renderNews === 'function') renderNews();
            alert('All data wiped.');
        });
    }
}

function exportData() {
    openDB().then(function() {
        var tx = db.transaction(['portfolio', 'news'], 'readonly');
        var portfolioReq = tx.objectStore('portfolio').get('holdings');
        var newsReq = tx.objectStore('news').get('feed');
        tx.oncomplete = function() {
            var data = {
                gold: vaultGold,
                stats: vaultStats,
                upgrades: shopUpgrades,
                portfolio: portfolioReq.result || {},
                news: newsReq.result || []
            };
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'bearpenny-save.json';
            a.click();
            URL.revokeObjectURL(a.href);
        };
        tx.onerror = function() {
            alert('Could not export save data.');
        };
    }).catch(function() {
        alert('Could not export save data.');
    });
}

function importData(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (typeof data.gold !== 'number' || typeof data.stats !== 'object') {
                alert('Invalid save file.');
                return;
            }
            vaultGold = data.gold;
            vaultStats = data.stats;
            if (data.upgrades && typeof data.upgrades === 'object') {
                shopUpgrades = data.upgrades;
            }
            if (typeof portfolio !== 'undefined') {
                portfolio = data.portfolio && typeof data.portfolio === 'object' ? data.portfolio : {};
            }
            if (typeof newsFeed !== 'undefined') {
                newsFeed = Array.isArray(data.news) ? data.news : [];
            }
            saveVault(vaultGold).then(function() { return saveStats(); }).then(function() { return saveUpgrades(); }).then(function() {
                if (typeof savePortfolio === 'function') {
                    return savePortfolio();
                }
            }).then(function() {
                if (typeof saveNewsFeed === 'function') {
                    return saveNewsFeed();
                }
            }).then(function() {
                refreshSettingsPanel();
                refreshStartScreen();
                if (typeof updateBalanceBar === 'function') updateBalanceBar(vaultGold);
                if (typeof renderCurrentPage === 'function') renderCurrentPage();
                if (typeof syncNewsTabState === 'function') syncNewsTabState();
                if (typeof renderNews === 'function') renderNews();
                alert('Data imported!');
            });
        } catch (err) {
            alert('Could not read file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================== SHOP ====================
var shopOpen = false;
var shopTab = 'game';

function toggleShop() {
    var panel = document.getElementById('shop-panel');
    if (!panel) return;
    shopOpen = !shopOpen;
    if (shopOpen) {
        document.getElementById('settings-panel').classList.add('hidden');
        panel.classList.remove('hidden');
        renderShop();
    } else {
        panel.classList.add('hidden');
    }
}

function switchShopTab(tab) {
    shopTab = tab;
    var gameBtn = document.getElementById('shop-tab-game');
    var portalBtn = document.getElementById('shop-tab-portal');
    if (gameBtn && portalBtn) {
        gameBtn.classList.toggle('active', tab === 'game');
        portalBtn.classList.toggle('active', tab === 'portal');
    }
    renderShop();
}

function renderShop() {
    var grid = document.getElementById('shop-grid');
    var goldEl = document.getElementById('shop-gold');
    if (!grid) return;
    if (goldEl) goldEl.textContent = vaultGold;

    var html = '';
    var ids = Object.keys(SHOP_UPGRADES);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var up = SHOP_UPGRADES[id];
        if (up.cat !== shopTab) continue;
        var lvl = getUpgradeLevel(id);
        var maxed = lvl >= up.maxLvl;
        var cost = maxed ? 0 : up.costs[lvl];
        var canAfford = !maxed && vaultGold >= cost;

        html += '<div class="shop-card' + (maxed ? ' shop-maxed' : '') + '">';
        html += '<div class="shop-card-header">';
        html += '<span class="shop-icon">' + up.icon + '</span>';
        html += '<span class="shop-name">' + up.name + '</span>';
        html += '</div>';
        html += '<div class="shop-desc">' + up.desc + '</div>';
        html += '<div class="shop-level">Lv ' + lvl + ' / ' + up.maxLvl + '</div>';
        html += '<div class="shop-level-bar"><div class="shop-level-fill" style="width:' + (lvl / up.maxLvl * 100) + '%"></div></div>';
        if (maxed) {
            html += '<button class="shop-buy-btn shop-buy-maxed" disabled>MAXED</button>';
        } else {
            html += '<button class="shop-buy-btn' + (canAfford ? '' : ' shop-buy-disabled') + '" onclick="purchaseUpgrade(\'' + id + '\')"' + (canAfford ? '' : ' disabled') + '>' + cost + 'g</button>';
        }
        html += '</div>';
    }
    grid.innerHTML = html;
}

function purchaseUpgrade(id) {
    var up = SHOP_UPGRADES[id];
    if (!up) return;
    var lvl = getUpgradeLevel(id);
    if (lvl >= up.maxLvl) return;
    var cost = up.costs[lvl];
    if (vaultGold < cost) return;

    vaultGold -= cost;
    shopUpgrades[id] = lvl + 1;
    saveVault(vaultGold);
    saveUpgrades();
    renderShop();
    refreshStartScreen();
    refreshSettingsPanel();
    if (typeof updateBalanceBar === 'function') updateBalanceBar(vaultGold);
    if (typeof syncNewsTabState === 'function') syncNewsTabState();
    if (typeof renderNews === 'function') renderNews();
}

function startGame() {
    stopEncounterLoop();
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('shop-panel').classList.add('hidden');
    document.getElementById('run-broker-panel').classList.add('hidden');
    shopOpen = false;
    runState = createRunState();
    gold = runState.gold;
    hp = runState.hp;
    maxHp = runState.maxHp;
    wave = 1;
    combo = 0;
    maxCombo = 0;
    runBrokerOpen = false;
    showRunMap();
    showBearQuote('start', 'Pick a route. Every floor wants your pennies.');
}

function onKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s',' '].includes(e.key.toLowerCase())) e.preventDefault();
}
function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
function onTouch(e) {
    if (gameMode !== 'battle') return;
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    player.x = e.touches[0].clientX - r.left - player.w / 2;
}
function onMouse(e) {
    if (!gameRunning || gameMode !== 'battle') return;
    var r = canvas.getBoundingClientRect();
    player.x = e.clientX - r.left - player.w / 2;
}

function tick() {
    if (!gameRunning) return;
    if (!gamePaused) update();
    if (!gameRunning) return;
    draw();
    gameLoop = requestAnimationFrame(tick);
}

function spawnItem() {
    var roll = Math.random();
    var type;
    var bearReduce = 1 - getUpgradeLevel('bearReduction') * 0.08;
    var enemyRate = getEnemyRateMultiplier() * (currentEncounterType === 'boss' ? 1.2 : 1);
    var bearChance = Math.min(0.14 + wave * 0.018, 0.32) * bearReduce * enemyRate;
    var bombChance = (wave >= 3 ? Math.min(0.04 + wave * 0.012, 0.18) : 0) * bearReduce * enemyRate;
    var skullChance = (wave >= 7 ? Math.min(0.02 + (wave - 7) * 0.008, 0.1) : 0) * bearReduce * enemyRate;
    var redpennyChance = 0.18 + getUpgradeLevel('redPennyRate') * 0.04;
    var silverChance = wave >= 2 ? 0.10 : 0;
    var goldbarChance = wave >= 5 ? 0.05 : 0;
    var diamondChance = wave >= 8 ? 0.02 : 0;
    var heartChance = getHeartSpawnChance();
    var magnetChance = wave >= 2 ? 0.025 : 0;
    var shieldChance = wave >= 3 ? 0.02 : 0;
    var frenzyChance = wave >= 4 ? 0.015 : 0;

    var c = 0;
    if (roll < (c += heartChance)) type = 'heart';
    else if (roll < (c += magnetChance)) type = 'magnet';
    else if (roll < (c += shieldChance)) type = 'shield';
    else if (roll < (c += frenzyChance)) type = 'frenzy';
    else if (roll < (c += diamondChance)) type = 'diamond';
    else if (roll < (c += goldbarChance)) type = 'goldbar';
    else if (roll < (c += silverChance)) type = 'silver';
    else if (roll < (c += skullChance)) type = 'skull';
    else if (roll < (c += bombChance)) type = 'bomb';
    else if (roll < (c += bearChance)) type = 'bear';
    else if (roll < (c += redpennyChance)) type = 'redpenny';
    else type = 'penny';

    var def = ITEM_TYPES[type];
    // Slower base speed — game should feel hard but readable
    var speed = (1.0 + wave * 0.22 + Math.random() * 1.2) * difficultyScale;
    if (def.bad) speed *= 1.15;

    // Apply coin size upgrade to collectible items
    var itemW = def.w;
    var itemH = def.h;
    if (!def.bad && def.value > 0) {
        var sizeScale = 1 + getUpgradeLevel('coinSize') * 0.10;
        itemW = Math.round(def.w * sizeScale);
        itemH = Math.round(def.h * sizeScale);
    }

    fallingItems.push({
        type: type,
        x: Math.random() * (canvas.width - itemW),
        y: -itemH,
        w: itemW,
        h: itemH,
        speed: speed,
        wobble: Math.random() * Math.PI * 2,
        wobbleAmp: def.bad ? 1.8 : 0.5,
    });
}

function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life--;
        if (p.type === 'spark') { p.x += p.vx; p.y += p.vy; p.vy += 0.15; }
        if (p.type === 'text') { p.y -= 0.8; }
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function attemptMazeMove(dx, dy) {
    if (!mazeState) return;
    var nx = mazeState.player.x + dx;
    var ny = mazeState.player.y + dy;
    if (nx < 0 || ny < 0 || nx >= mazeState.cols || ny >= mazeState.rows) {
        mazeState.stepCooldown = 4;
        return;
    }
    if (mazeState.walls[mazeCellIndex(mazeState.cols, nx, ny)]) {
        mazeState.stepCooldown = 4;
        return;
    }

    mazeState.player.x = nx;
    mazeState.player.y = ny;
    mazeState.stepCooldown = getMazeMoveDelay();

    for (var i = mazeState.coins.length - 1; i >= 0; i--) {
        if (mazeState.coins[i].x === nx && mazeState.coins[i].y === ny) {
            mazeState.collected++;
            gold += mazeState.coins[i].value;
            particles.push({ type: 'text', text: '+' + mazeState.coins[i].value, x: canvas.width / 2, y: canvas.height - 50, life: 36, color: '#fbbf24', size: 16 });
            mazeState.coins.splice(i, 1);
            break;
        }
    }

    for (var j = mazeState.traps.length - 1; j >= 0; j--) {
        if (mazeState.traps[j].x === nx && mazeState.traps[j].y === ny) {
            hp -= mazeState.traps[j].damage;
            particles.push({ type: 'text', text: '-' + mazeState.traps[j].damage + ' HP', x: canvas.width / 2, y: canvas.height - 80, life: 42, color: '#f87171', size: 18 });
            mazeState.traps.splice(j, 1);
            if (hp <= 0) {
                finishRun(false);
                return;
            }
            break;
        }
    }

    if (nx === mazeState.exit.x && ny === mazeState.exit.y) {
        var bonus = mazeState.collected >= mazeState.totalCoins ? Math.round(20 * getRunMazeMultiplier()) : 0;
        if (bonus > 0) gold += bonus;
        finishCurrentNode(bonus > 0 ? 'Perfect maze clear. You found the whole stash and the bonus vault.' : 'Maze cleared. You escaped with what you could carry.');
        return;
    }

    runState.gold = gold;
    runState.hp = hp;
    updateHUD();
}

function updateMazeEncounter() {
    if (!mazeState) return;
    if (bearQuoteTimer > 0) bearQuoteTimer--;
    if (mazeState.stepCooldown > 0) mazeState.stepCooldown--;

    var dx = 0;
    var dy = 0;
    if (mazeState.stepCooldown <= 0) {
        if (keys['arrowleft'] || keys['a']) dx = -1;
        else if (keys['arrowright'] || keys['d']) dx = 1;
        else if (keys['arrowup'] || keys['w']) dy = -1;
        else if (keys['arrowdown'] || keys['s']) dy = 1;
    }
    if (dx || dy) attemptMazeMove(dx, dy);

    updateParticles();
    updateHUD();
}

function update() {
    if (gameMode === 'maze') {
        updateMazeEncounter();
        return;
    }
    if (gameMode !== 'battle') {
        updateHUD();
        return;
    }

    // Player movement
    var speed = frenzyActive ? getFrenzyMoveSpeed() : getDropMoveSpeed();
    if (keys['arrowleft'] || keys['a']) player.x -= speed;
    if (keys['arrowright'] || keys['d']) player.x += speed;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

    // Combo decay
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) combo = 0;
    }

    // Powerup timers
    if (magnetActive) {
        magnetTimer--;
        if (magnetTimer <= 0) magnetActive = false;
    }
    if (shieldActive) {
        shieldTimer--;
        if (shieldTimer <= 0) shieldActive = false;
    }
    if (frenzyActive) {
        frenzyTimer--;
        if (frenzyTimer <= 0) frenzyActive = false;
    }

    // Bear quote decay
    if (bearQuoteTimer > 0) bearQuoteTimer--;

    // Spawn items
    spawnTimer++;
    var actualSpawnInterval = frenzyActive ? Math.max(8, spawnInterval * 0.5) : spawnInterval;
    if (spawnTimer >= actualSpawnInterval) {
        spawnTimer = 0;
        spawnItem();
        if (wave >= 3 && Math.random() < 0.3) spawnItem();
        if (wave >= 6 && Math.random() < 0.3) spawnItem();
        if (wave >= 9 && Math.random() < 0.2) spawnItem();
    }

    // Wave progression
    waveTimer++;
    if (waveTimer >= waveInterval) {
        waveTimer = 0;
        if (wave >= currentEncounterGoalWave) {
            gold += currentEncounterType === 'boss' ? 120 : 40 + currentNode.tier * 12;
            finishCurrentNode(currentEncounterType === 'boss' ? 'Boss floor cleared. Ray is furious and your pockets are heavier.' : 'Floor cleared. You survived the drop and kept the spread.');
            return;
        }
        wave++;
        spawnInterval = Math.max(10, 40 - wave * 2.5);
        difficultyScale = 1 + wave * 0.07;
        particles.push({ type: 'text', text: 'WAVE ' + wave, x: canvas.width / 2, y: canvas.height / 2, life: 90, color: '#60a5fa', size: 34 });
        showBearQuote('wave');
    }

    // Update falling items
    for (var i = fallingItems.length - 1; i >= 0; i--) {
        var item = fallingItems[i];
        item.y += item.speed;
        item.wobble += 0.05;
        item.x += Math.sin(item.wobble) * item.wobbleAmp;

        // Magnet: attract coins toward player
        if (magnetActive && !ITEM_TYPES[item.type].bad && ITEM_TYPES[item.type].value > 0) {
            var dx = (player.x + player.w / 2) - (item.x + item.w / 2);
            item.x += dx * getMagnetPullStrength();
        }

        // Collision with player
        if (item.y + item.h > player.y && item.y < player.y + player.h &&
            item.x + item.w > player.x && item.x < player.x + player.w) {
            var def = ITEM_TYPES[item.type];
            if (def.bad) {
                if (shieldActive) {
                    // Shield absorbs
                    shieldActive = false;
                    shieldTimer = 0;
                    showBearQuote('block');
                    particles.push({ type: 'text', text: 'BLOCKED!', x: item.x, y: item.y, life: 50, color: '#38bdf8', size: 18 });
                } else {
                    hp -= def.damage;
                    combo = 0;
                    comboTimer = 0;
                    showBearQuote('hit');
                    particles.push({ type: 'text', text: '-' + def.damage + ' HP', x: item.x, y: item.y, life: 45, color: '#f87171', size: 18 });
                    for (var s = 0; s < 8; s++) {
                        particles.push({ type: 'spark', x: item.x + item.w/2, y: item.y, vx: (Math.random()-.5)*5, vy: -Math.random()*4, life: 24, color: '#f87171' });
                    }
                    if (hp <= 0) { finishRun(false); return; }
                }
            } else if (def.heal) {
                var healAmount = getHeartHealAmount();
                hp = Math.min(maxHp, hp + healAmount);
                particles.push({ type: 'text', text: '+' + healAmount + ' HP', x: item.x, y: item.y, life: 40, color: '#4ade80', size: 16 });
            } else if (def.powerup === 'magnet') {
                magnetActive = true;
                magnetTimer = getMagnetDurationFrames();
                showBearQuote('powerup');
                particles.push({ type: 'text', text: 'MAGNET!', x: item.x, y: item.y, life: 50, color: '#34d399', size: 16 });
            } else if (def.powerup === 'shield') {
                shieldActive = true;
                shieldTimer = Math.floor(12 * 60 * (1 + getUpgradeLevel('powerupDuration') * 0.15));
                showBearQuote('powerup');
                particles.push({ type: 'text', text: 'SHIELD!', x: item.x, y: item.y, life: 50, color: '#38bdf8', size: 16 });
            } else if (def.powerup === 'frenzy') {
                frenzyActive = true;
                frenzyTimer = Math.floor(6 * 60 * (1 + getUpgradeLevel('powerupDuration') * 0.15));
                showBearQuote('powerup');
                particles.push({ type: 'text', text: 'FRENZY!', x: item.x, y: item.y, life: 50, color: '#facc15', size: 18 });
            } else {
                // Coin collected
                combo++;
                comboTimer = 90;
                if (combo > maxCombo) maxCombo = combo;
                var multiplier = 1 + getUpgradeLevel('comboBonus') + Math.floor(combo / 5);
                if (frenzyActive) multiplier *= 2;
                var earned = Math.max(1, Math.round(def.value * multiplier * getRunCoinMultiplier()));
                gold += earned;
                if (combo > 0 && combo % 12 === 0) showBearQuote('combo');
                particles.push({ type: 'text', text: '+' + earned, x: item.x, y: item.y, life: 35, color: '#fbbf24', size: 14 + Math.min(earned / 10, 10) });
                for (var s = 0; s < 4; s++) {
                    particles.push({ type: 'spark', x: item.x + item.w/2, y: item.y, vx: (Math.random()-.5)*3, vy: -Math.random()*2.5-1, life: 20, color: def.value >= 25 ? '#fde68a' : '#fbbf24' });
                }
            }
            fallingItems.splice(i, 1);
            continue;
        }

        // Off screen
        if (item.y > canvas.height + 20) {
            if (!ITEM_TYPES[item.type].bad && ITEM_TYPES[item.type].value > 0) {
                combo = 0;
                comboTimer = 0;
                if (Math.random() < 0.3) showBearQuote('miss');
            }
            fallingItems.splice(i, 1);
        }
    }

    updateParticles();
    runState.gold = gold;
    runState.hp = hp;
    updateHUD();
}

function drawMazeEncounter() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#07111f');
    bg.addColorStop(1, '#111827');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!mazeState) return;
    var cell = Math.max(28, Math.floor(Math.min((canvas.width - 120) / mazeState.cols, (canvas.height - 120) / mazeState.rows)));
    var offsetX = Math.floor((canvas.width - cell * mazeState.cols) / 2);
    var offsetY = Math.max(28, Math.floor((canvas.height - cell * mazeState.rows) / 2));

    for (var y = 0; y < mazeState.rows; y++) {
        for (var x = 0; x < mazeState.cols; x++) {
            var px = offsetX + x * cell;
            var py = offsetY + y * cell;
            var wall = mazeState.walls[mazeCellIndex(mazeState.cols, x, y)];
            ctx.fillStyle = wall ? '#0b1220' : '#172033';
            ctx.fillRect(px, py, cell - 2, cell - 2);
            if (!wall) {
                ctx.strokeStyle = 'rgba(148,163,184,0.08)';
                ctx.strokeRect(px, py, cell - 2, cell - 2);
            }
        }
    }

    for (var i = 0; i < mazeState.coins.length; i++) {
        var coin = mazeState.coins[i];
        var cx = offsetX + coin.x * cell + cell / 2;
        var cy = offsetY + coin.y * cell + cell / 2;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(7, cell * 0.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold ' + Math.max(11, Math.floor(cell * 0.34)) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy + 1);
    }

    for (var j = 0; j < mazeState.traps.length; j++) {
        var trap = mazeState.traps[j];
        var tx = offsetX + trap.x * cell + cell / 2;
        var ty = offsetY + trap.y * cell + cell / 2;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(tx, ty - cell * 0.18);
        ctx.lineTo(tx - cell * 0.18, ty + cell * 0.18);
        ctx.lineTo(tx + cell * 0.18, ty + cell * 0.18);
        ctx.closePath();
        ctx.fill();
    }

    var exitX = offsetX + mazeState.exit.x * cell;
    var exitY = offsetY + mazeState.exit.y * cell;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(exitX + 5, exitY + 5, cell - 12, cell - 12);
    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold ' + Math.max(10, Math.floor(cell * 0.28)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exitX + cell / 2, exitY + cell / 2 + 1);

    var playerX = offsetX + mazeState.player.x * cell;
    var playerY = offsetY + mazeState.player.y * cell;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(playerX + 4, playerY + 7, cell - 10, Math.max(14, cell - 18), 6);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold ' + Math.max(11, Math.floor(cell * 0.34)) + 'px sans-serif';
    ctx.fillText('$', playerX + cell / 2, playerY + cell / 2 + 2);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Audit Maze', 18, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Use arrows or WASD. Grab stash, dodge traps, reach EXIT.', 18, 46);

    particles.forEach(function(p) {
        var alpha = Math.min(1, p.life / 15);
        ctx.globalAlpha = alpha;
        if (p.type === 'text') {
            ctx.fillStyle = p.color;
            ctx.font = 'bold ' + p.size + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        } else if (p.type === 'spark') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    });

    drawBearPresenter();
}

function draw() {
    if (gameMode === 'maze') {
        drawMazeEncounter();
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    var bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#0a0a1a');
    bg.addColorStop(1, '#111827');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(30,40,60,0.35)';
    ctx.lineWidth = 0.5;
    for (var x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for (var y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

    // Frenzy tint
    if (frenzyActive) {
        ctx.fillStyle = 'rgba(250, 200, 20, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw falling items
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fallingItems.forEach(function(item) {
        var def = ITEM_TYPES[item.type];
        // Red pennies: draw a red circle with ¢
        if (def.red) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(item.x + item.w/2, item.y + item.h/2, item.w/2, 0, Math.PI * 2);
            ctx.fillStyle = '#dc2626';
            ctx.fill();
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fef2f2';
            ctx.font = 'bold ' + Math.round(item.w * 0.6) + 'px sans-serif';
            ctx.fillText('¢', item.x + item.w/2, item.y + item.h/2 + 1);
            ctx.restore();
        } else {
            ctx.font = item.w + 'px serif';
            ctx.fillText(def.emoji, item.x + item.w/2, item.y + item.h/2);
        }
    });

    // Draw player (bucket)
    var grd = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.h);
    grd.addColorStop(0, '#fbbf24');
    grd.addColorStop(1, '#b45309');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.w, player.h, 5);
    ctx.fill();
    // Rim
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(player.x - 3, player.y, player.w + 6, 4);
    // $ sign
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('$', player.x + player.w/2, player.y + player.h/2 + 2);

    // Shield aura
    if (shieldActive) {
        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(Date.now()/300) * 0.1;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.w/2, player.y + player.h/2, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Magnet aura
    if (magnetActive) {
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(Date.now()/200) * 0.08;
        ctx.beginPath();
        ctx.arc(player.x + player.w/2, player.y, 80, Math.PI, 0);
        ctx.fillStyle = '#34d399';
        ctx.fill();
        ctx.restore();
    }

    // Draw particles
    particles.forEach(function(p) {
        var alpha = Math.min(1, p.life / 15);
        ctx.globalAlpha = alpha;
        if (p.type === 'text') {
            ctx.fillStyle = p.color;
            ctx.font = 'bold ' + p.size + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        } else if (p.type === 'spark') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    });

    // Combo bar at bottom
    if (combo > 0) {
        var barW = Math.min(combo * 8, canvas.width - 40);
        var barX = (canvas.width - barW) / 2;
        ctx.fillStyle = 'rgba(167,139,250,0.3)';
        ctx.fillRect(barX, canvas.height - 12, barW, 8);
        ctx.fillStyle = '#a78bfa';
        var comboFill = (comboTimer / 90) * barW;
        ctx.fillRect(barX, canvas.height - 12, comboFill, 8);
    }

    drawBearPresenter();

    // Active powerup indicators at bottom-left
    drawPowerupBar();
}

function drawBearPresenter() {
    var panelW = Math.min(320, canvas.width - 24);
    var panelH = 96;
    var panelX = canvas.width - panelW - 16;
    var panelY = 20;
    var faceX = panelX + 54;
    var faceY = panelY + 48;
    var quote = activeBearQuote || BEAR_TAUNTS.idle[0];
    var alpha = bearQuoteTimer > 0 ? Math.min(1, 0.65 + (bearQuoteTimer / 240) * 0.35) : 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.strokeStyle = activeBearMood === 'hit' ? '#f87171' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 14);
    ctx.fill();
    ctx.stroke();

    // Bear face
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.arc(faceX, faceY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(faceX - 18, faceY - 20, 10, 0, Math.PI * 2);
    ctx.arc(faceX + 18, faceY - 20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c08457';
    ctx.beginPath();
    ctx.arc(faceX, faceY + 6, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(faceX - 8, faceY - 4, 3, 0, Math.PI * 2);
    ctx.arc(faceX + 8, faceY - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(faceX, faceY + 2);
    ctx.lineTo(faceX - 4, faceY + 10);
    ctx.lineTo(faceX + 4, faceY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = activeBearMood === 'combo' ? '#fbbf24' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(faceX, faceY + 10, 8, 0.1, Math.PI - 0.1, activeBearMood === 'combo');
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BOSS BEAR', panelX + 100, panelY + 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(lastBearEvent.toUpperCase(), panelX + 100, panelY + 40);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    wrapBearText(quote, panelX + 100, panelY + 58, panelW - 116, 16);
    ctx.restore();
}

function wrapBearText(text, x, y, maxWidth, lineHeight) {
    var words = String(text).split(' ');
    var line = '';
    var lines = [];
    for (var i = 0; i < words.length; i++) {
        var testLine = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = words[i];
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    for (var j = 0; j < Math.min(lines.length, 2); j++) {
        ctx.fillText(lines[j], x, y + j * lineHeight);
    }
}

function drawPowerupBar() {
    if (gameMode !== 'battle') return;
    var indicators = [];
    if (magnetActive) indicators.push({ emoji: '🧲', t: magnetTimer, color: '#34d399' });
    if (shieldActive) indicators.push({ emoji: '🛡️', t: shieldTimer, color: '#38bdf8' });
    if (frenzyActive) indicators.push({ emoji: '⚡', t: frenzyTimer, color: '#facc15' });
    if (indicators.length === 0) return;

    ctx.save();
    var startX = 12;
    var startY = canvas.height - 36;
    indicators.forEach(function(ind, idx) {
        var x = startX + idx * 56;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(x, startY, 50, 24, 6);
        ctx.fill();
        ctx.strokeStyle = ind.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.font = '14px serif';
        ctx.textAlign = 'left';
        ctx.fillText(ind.emoji, x + 4, startY + 17);
        ctx.fillStyle = ind.color;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(Math.ceil(ind.t / 60) + 's', x + 24, startY + 17);
    });
    ctx.restore();
}

function updateHUD() {
    document.getElementById('hud-gold').textContent = runState ? runState.gold : gold;
    if (runState && runState.map) {
        document.getElementById('hud-wave').textContent = Math.min(runState.tier + 1, runState.map.length) + ' / ' + runState.map.length;
    } else {
        document.getElementById('hud-wave').textContent = wave;
    }
    if (gameMode === 'battle') {
        document.getElementById('hud-combo').textContent = String(currentEncounterType || 'drop').toUpperCase() + ' W' + wave + '/' + currentEncounterGoalWave;
    } else if (gameMode === 'maze' && mazeState) {
        document.getElementById('hud-combo').textContent = 'MAZE ' + mazeState.collected + '/' + mazeState.totalCoins;
    } else if (gameMode === 'map') {
        document.getElementById('hud-combo').textContent = 'ROUTE';
    } else {
        document.getElementById('hud-combo').textContent = 'RUN';
    }
    var hearts = '';
    for (var i = 0; i < maxHp; i++) hearts += i < hp ? '♥' : '♡';
    document.getElementById('hud-hp').textContent = hearts;
}

function endGame() {
    finishRun(false);
}
