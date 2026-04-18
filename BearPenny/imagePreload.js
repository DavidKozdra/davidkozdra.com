// BearPenny Atlas Sprite Sheet
// Source: images/Atlas.png (1280x1280)
//
// Usage:
//   ATLAS.ready.then(() => {
//     drawSprite(ctx, SPRITES.coin, destX, destY, destW, destH);
//   });
//
//   function drawSprite(ctx, sprite, x, y, w, h) {
//     ctx.drawImage(ATLAS.img, sprite.x, sprite.y, sprite.w, sprite.h, x, y, w, h);
//   }

var ATLAS = (function () {
    var img = new Image();
    var resolve;
    var ready = new Promise(function (res) { resolve = res; });

    img.onload = function () { resolve(img); };
    img.onerror = function () { console.error('BearPenny: failed to load Atlas.png'); resolve(null); };
    img.src = './images/Atlas.png';

    return { img: img, ready: ready };
})();

// Sprite coordinates in the atlas (x, y, w, h — all in atlas pixels)
var SPRITES = {
    // ── Bear Faces ──────────────────────────────────────────────────
    // Four framed portrait cards (row 1), plus a larger body card
    bearFaceIdle:    { x: 52,   y: 48,  w: 280, h: 328 }, // cool sunglasses, neutral
    bearFaceGrumpy:  { x: 350,  y: 48,  w: 162, h: 328 }, // mildly grumpy
    bearFaceAngry:   { x: 566,  y: 48,  w: 174, h: 328 }, // angry red brow
    bearFaceFurious: { x: 800,  y: 48,  w: 152, h: 328 }, // furious open mouth
    bearBody:        { x: 964,  y: 48,  w: 276, h: 328 }, // suit body card (angry)

    // ── Row 2 ────────────────────────────────────────────────────────
    moneyStack:      { x: 60,   y: 408, w: 280, h: 376 }, // stack of cash bills
    pills:           { x: 356,  y: 408, w: 118, h: 376 }, // blue/red/green pill buttons + up-arrow
    bearFaceMad:     { x: 520,  y: 408, w: 288, h: 376 }, // bear head close-up (enraged)
    progressBar:     { x: 924,  y: 408, w: 316, h: 180 }, // blue progress bar full
    goldBar:         { x: 924,  y: 616, w: 316, h: 168 }, // gold/orange bar

    // ── Row 3 — Small Icons ──────────────────────────────────────────
    star:            { x: 56,   y: 840, w: 128, h: 160 }, // yellow star
    crown:           { x: 212,  y: 840, w: 128, h: 160 }, // gold crown
    diamond:         { x: 376,  y: 840, w: 124, h: 160 }, // blue gem
    coin:            { x: 560,  y: 840, w: 120, h: 160 }, // gold dollar coin
    medal:           { x: 740,  y: 840, w: 132, h: 160 }, // gold circular medal/badge
    target:          { x: 908,  y: 840, w: 152, h: 160 }, // red bullseye target
    notebook:        { x: 1096, y: 840, w: 132, h: 160 }, // blue notebook with chart

    // ── Row 4 — Large Icons ──────────────────────────────────────────
    calculator:      { x: 64,   y: 1008, w: 116, h: 232 }, // calculator
    moneyBag:        { x: 224,  y: 1008, w: 112, h: 232 }, // green money bag with chart
    clipboard:       { x: 376,  y: 1008, w: 136, h: 232 }, // clipboard with bar chart
    chestOpen:       { x: 564,  y: 1008, w: 212, h: 232 }, // open treasure chest (payout)
    chestClosed:     { x: 816,  y: 1008, w: 220, h: 232 }, // closed treasure chest
    book:            { x: 1076, y: 1008, w: 152, h: 232 }, // "Investing 101" book
};

// Convenience — draw a named sprite onto a canvas context
// ctx: CanvasRenderingContext2D
// sprite: one of the SPRITES values
// x, y: destination top-left
// w, h: destination size (optional — defaults to sprite's natural size)
function drawSprite(ctx, sprite, x, y, w, h) {
    if (!ATLAS.img.complete || !ATLAS.img.naturalWidth) return;
    ctx.drawImage(
        ATLAS.img,
        sprite.x, sprite.y, sprite.w, sprite.h,
        x, y,
        w !== undefined ? w : sprite.w,
        h !== undefined ? h : sprite.h
    );
}

// Paint a sprite into every DOM canvas with class="atlas-sprite" and data-sprite="<key>"
// Called once on atlas load, and again whenever you need a refresh.
function paintAtlasSprites() {
    var canvases = document.querySelectorAll('canvas[data-sprite]');
    for (var i = 0; i < canvases.length; i++) {
        var el = canvases[i];
        var key = el.dataset.sprite;
        var sp = SPRITES[key];
        if (!sp) continue;
        var c = el.getContext('2d');
        c.clearRect(0, 0, el.width, el.height);
        c.drawImage(ATLAS.img, sp.x, sp.y, sp.w, sp.h, 0, 0, el.width, el.height);
    }
}

ATLAS.ready.then(function(img) {
    if (img) paintAtlasSprites();
});

// Pick the right bear face sprite based on mood string
// mood: 'idle' | 'hit' | 'combo' | 'furious'
function bearFaceForMood(mood) {
    switch (mood) {
        case 'hit':      return SPRITES.bearFaceAngry;    // took a block — irritated
        case 'block':    return SPRITES.bearFaceGrumpy;   // shield blocked him — suspicious
        case 'wave':     return SPRITES.bearFaceGrumpy;   // new wave incoming — watching
        case 'miss':     return SPRITES.bearFaceGrumpy;   // player missed a coin — smug
        case 'combo':    return SPRITES.bearFaceFurious;  // player on a streak — enraged
        case 'gameOver': return SPRITES.bearFaceFurious;  // player lost — triumphant rage
        case 'start':    return SPRITES.bearFaceAngry;    // run starts — competitive
        case 'powerup':  return SPRITES.bearFaceMad;      // powerup grabbed — flustered
        default:         return SPRITES.bearFaceIdle;     // idle — cool sunglasses
    }
}
