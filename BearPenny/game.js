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
var slowActive, slowTimer;
var difficultyScale;
var bearQuotes = [];
var activeBearQuote = '';
var bearQuoteTimer = 0;
var activeBearMood = 'idle';
var lastBearEvent = 'idle';

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
    slow:     { emoji: '🕐', value: 0,  w: 26, h: 26, bad: false, powerup: 'slow' },
};

// ==================== SHOP UPGRADES ====================
var SHOP_UPGRADES = {
    // Game Upgrades
    coinSize:        { name: 'Bigger Coins',       cat: 'game', icon: '🪙', maxLvl: 5, costs: [100, 250, 500, 1000, 2000],     desc: '+10% coin hitbox size per level' },
    startingHp:      { name: 'Tough Start',        cat: 'game', icon: '💪', maxLvl: 3, costs: [150, 400, 1000],                 desc: 'Start with +1 HP per level' },
    maxHpUp:         { name: 'Iron Constitution',   cat: 'game', icon: '🛡️', maxLvl: 3, costs: [200, 600, 1500],                desc: '+1 max HP cap per level' },
    redPennyRate:    { name: 'Red Penny Rush',     cat: 'game', icon: '🔴', maxLvl: 5, costs: [75, 200, 400, 800, 1600],        desc: '+4% red penny spawn chance per level' },
    bucketWidth:     { name: 'Wider Bucket',       cat: 'game', icon: '🪣', maxLvl: 5, costs: [100, 250, 500, 1000, 2000],      desc: '+6px bucket width per level' },
    powerupDuration: { name: 'Lasting Power',      cat: 'game', icon: '⏳', maxLvl: 4, costs: [150, 350, 750, 1500],             desc: '+15% powerup duration per level' },
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

function resizeCanvas() {
    if (!canvas) return;
    var overlay = document.getElementById('game-overlay');
    canvas.width = overlay.clientWidth || window.innerWidth;
    canvas.height = (overlay.clientHeight || window.innerHeight) - 50;
}

function closeGame() {
    if (gameRunning) {
        gameRunning = false;
        if (gameLoop) cancelAnimationFrame(gameLoop);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        if (canvas) {
            canvas.removeEventListener('touchmove', onTouch);
            canvas.removeEventListener('mousemove', onMouse);
            canvas.classList.add('hidden');
        }
    }
    document.getElementById('game-start').classList.remove('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('shop-panel').classList.add('hidden');
    shopOpen = false;
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
    document.getElementById('game-start').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('shop-panel').classList.add('hidden');
    shopOpen = false;
    document.getElementById('game-hud').classList.remove('hidden');
    canvas.classList.remove('hidden');
    resizeCanvas();

    // Apply bucket width upgrade
    var bucketW = 48 + getUpgradeLevel('bucketWidth') * 6;
    player = { x: canvas.width / 2 - Math.floor(bucketW / 2), w: bucketW, h: 18 };
    player.y = canvas.height - 44;
    fallingItems = [];
    particles = [];
    gold = 0;
    wave = 1;
    combo = 0;
    maxCombo = 0;
    comboTimer = 0;
    // Apply HP upgrades
    hp = 3 + getUpgradeLevel('startingHp');
    maxHp = 5 + getUpgradeLevel('maxHpUp');
    if (hp > maxHp) hp = maxHp;
    magnetActive = false;
    magnetTimer = 0;
    shieldActive = false;
    shieldTimer = 0;
    frenzyActive = false;
    frenzyTimer = 0;
    slowActive = false;
    slowTimer = 0;
    difficultyScale = 1;
    gameRunning = true;
    keys = {};
    activeBearQuote = '';
    bearQuoteTimer = 0;

    waveTimer = 0;
    waveInterval = 20 * 60;
    spawnInterval = 40;
    spawnTimer = 0;

    updateHUD();

    // Apply startPowerup upgrade
    if (getUpgradeLevel('startPowerup') >= 1) {
        var powerups = ['magnet', 'shield', 'frenzy', 'slow'];
        var pick = powerups[Math.floor(Math.random() * powerups.length)];
        var durMult = 1 + getUpgradeLevel('powerupDuration') * 0.15;
        if (pick === 'magnet') { magnetActive = true; magnetTimer = Math.floor(8 * 60 * durMult); }
        else if (pick === 'shield') { shieldActive = true; shieldTimer = Math.floor(12 * 60 * durMult); }
        else if (pick === 'frenzy') { frenzyActive = true; frenzyTimer = Math.floor(6 * 60 * durMult); }
        else if (pick === 'slow') { slowActive = true; slowTimer = Math.floor(7 * 60 * durMult); }
    }

    showBearQuote('start');

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('touchmove', onTouch);
    canvas.addEventListener('mousemove', onMouse);

    if (gameLoop) cancelAnimationFrame(gameLoop);
    tick();
}

function onKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    if (['arrowleft','arrowright','arrowup','arrowdown','a','d',' '].includes(e.key.toLowerCase())) e.preventDefault();
}
function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
function onTouch(e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    player.x = e.touches[0].clientX - r.left - player.w / 2;
}
function onMouse(e) {
    if (!gameRunning) return;
    var r = canvas.getBoundingClientRect();
    player.x = e.clientX - r.left - player.w / 2;
}

function tick() {
    if (!gameRunning) return;
    update();
    draw();
    gameLoop = requestAnimationFrame(tick);
}

function spawnItem() {
    var roll = Math.random();
    var type;
    var bearReduce = 1 - getUpgradeLevel('bearReduction') * 0.08;
    var bearChance = Math.min(0.14 + wave * 0.018, 0.32) * bearReduce;
    var bombChance = (wave >= 3 ? Math.min(0.04 + wave * 0.012, 0.18) : 0) * bearReduce;
    var skullChance = (wave >= 7 ? Math.min(0.02 + (wave - 7) * 0.008, 0.1) : 0) * bearReduce;
    var redpennyChance = 0.18 + getUpgradeLevel('redPennyRate') * 0.04;
    var silverChance = wave >= 2 ? 0.10 : 0;
    var goldbarChance = wave >= 5 ? 0.05 : 0;
    var diamondChance = wave >= 8 ? 0.02 : 0;
    var heartChance = 0.04;
    var magnetChance = wave >= 2 ? 0.025 : 0;
    var shieldChance = wave >= 3 ? 0.02 : 0;
    var frenzyChance = wave >= 4 ? 0.015 : 0;
    var slowChance = wave >= 2 ? 0.02 : 0;

    var c = 0;
    if (roll < (c += heartChance)) type = 'heart';
    else if (roll < (c += magnetChance)) type = 'magnet';
    else if (roll < (c += shieldChance)) type = 'shield';
    else if (roll < (c += frenzyChance)) type = 'frenzy';
    else if (roll < (c += slowChance)) type = 'slow';
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
    if (slowActive) speed *= 0.5;
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

function update() {
    // Player movement
    var speed = 6;
    if (frenzyActive) speed = 9;
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
    if (slowActive) {
        slowTimer--;
        if (slowTimer <= 0) slowActive = false;
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
        wave++;
        spawnInterval = Math.max(10, 40 - wave * 2.5);
        difficultyScale = 1 + wave * 0.07;
        particles.push({ type: 'text', text: 'WAVE ' + wave, x: canvas.width / 2, y: canvas.height / 2, life: 90, color: '#60a5fa', size: 34 });
        showBearQuote('wave');
    }

    // Update falling items
    for (var i = fallingItems.length - 1; i >= 0; i--) {
        var item = fallingItems[i];
        var itemSpeed = item.speed;
        if (slowActive && !item._slowed) {
            itemSpeed *= 0.5;
        }
        item.y += itemSpeed;
        item.wobble += 0.05;
        item.x += Math.sin(item.wobble) * item.wobbleAmp;

        // Magnet: attract coins toward player
        if (magnetActive && !ITEM_TYPES[item.type].bad && ITEM_TYPES[item.type].value > 0) {
            var dx = (player.x + player.w / 2) - (item.x + item.w / 2);
            item.x += dx * 0.08;
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
                    if (hp <= 0) { endGame(); return; }
                }
            } else if (def.heal) {
                hp = Math.min(maxHp, hp + def.heal);
                particles.push({ type: 'text', text: '+HP', x: item.x, y: item.y, life: 40, color: '#4ade80', size: 16 });
            } else if (def.powerup === 'magnet') {
                magnetActive = true;
                magnetTimer = Math.floor(8 * 60 * (1 + getUpgradeLevel('powerupDuration') * 0.15));
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
            } else if (def.powerup === 'slow') {
                slowActive = true;
                slowTimer = Math.floor(7 * 60 * (1 + getUpgradeLevel('powerupDuration') * 0.15));
                showBearQuote('powerup');
                particles.push({ type: 'text', text: 'SLOW-MO!', x: item.x, y: item.y, life: 50, color: '#a78bfa', size: 16 });
            } else {
                // Coin collected
                combo++;
                comboTimer = 90;
                if (combo > maxCombo) maxCombo = combo;
                var multiplier = 1 + getUpgradeLevel('comboBonus') + Math.floor(combo / 5);
                if (frenzyActive) multiplier *= 2;
                var earned = def.value * multiplier;
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

    // Update particles
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life--;
        if (p.type === 'spark') { p.x += p.vx; p.y += p.vy; p.vy += 0.15; }
        if (p.type === 'text') { p.y -= 0.8; }
        if (p.life <= 0) particles.splice(i, 1);
    }

    updateHUD();
}

function draw() {
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

    // Slow-mo tint
    if (slowActive) {
        ctx.fillStyle = 'rgba(120, 80, 200, 0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
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
    var panelY = 16;
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
    var indicators = [];
    if (magnetActive) indicators.push({ emoji: '🧲', t: magnetTimer, color: '#34d399' });
    if (shieldActive) indicators.push({ emoji: '🛡️', t: shieldTimer, color: '#38bdf8' });
    if (frenzyActive) indicators.push({ emoji: '⚡', t: frenzyTimer, color: '#facc15' });
    if (slowActive)   indicators.push({ emoji: '🕐', t: slowTimer, color: '#a78bfa' });
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
    document.getElementById('hud-gold').textContent = gold;
    document.getElementById('hud-wave').textContent = wave;
    var mult = 1 + getUpgradeLevel('comboBonus') + Math.floor(combo / 5);
    if (frenzyActive) mult *= 2;
    document.getElementById('hud-combo').textContent = 'x' + mult;
    var hearts = '';
    for (var i = 0; i < maxHp; i++) hearts += i < hp ? '♥' : '♡';
    document.getElementById('hud-hp').textContent = hearts;
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(gameLoop);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchmove', onTouch);
    canvas.removeEventListener('mousemove', onMouse);
    document.getElementById('game-hud').classList.add('hidden');

    vaultGold += gold;
    vaultStats.totalRuns++;
    vaultStats.totalEarned += gold;
    if (wave > vaultStats.bestWave) vaultStats.bestWave = wave;
    if (maxCombo > vaultStats.bestCombo) vaultStats.bestCombo = maxCombo;
    saveVault(vaultGold);
    saveStats();

    document.getElementById('final-gold').textContent = gold;
    document.getElementById('final-wave').textContent = wave;
    document.getElementById('final-combo').textContent = maxCombo;
    document.getElementById('final-vault').textContent = vaultGold;
    showBearQuote('gameOver');
    document.getElementById('game-over').classList.remove('hidden');
    canvas.classList.add('hidden');
    if (typeof updateBalanceBar === 'function') updateBalanceBar(vaultGold);
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
}
