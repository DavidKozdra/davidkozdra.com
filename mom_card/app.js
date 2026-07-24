const card = document.querySelector(".card");
const flowerRain = document.querySelector(".flower-rain");
const sparkleLayer = document.querySelector(".sparkle-layer");
const messageLines = [...document.querySelectorAll(".card-back .message p")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  .matches;

let typingRunId = 0;
let bloomTimer = null;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* ---------- message typewriter ---------- */

function cacheMessageText() {
  messageLines.forEach((line) => {
    line.dataset.text = line.textContent;
  });
}

function resetMessageForTyping() {
  messageLines.forEach((line) => {
    line.textContent = "";
    line.classList.remove("is-typing");
  });
}

function setMessageImmediate() {
  messageLines.forEach((line) => {
    line.textContent = line.dataset.text || "";
    line.classList.remove("is-typing");
  });
}

async function playTypewriter() {
  if (reduceMotion) {
    setMessageImmediate();
    return;
  }

  const runId = ++typingRunId;
  resetMessageForTyping();

  for (let i = 0; i < messageLines.length; i += 1) {
    if (runId !== typingRunId) {
      return;
    }

    const line = messageLines[i];
    const text = line.dataset.text || "";
    const isTitle = line.id === "title";
    const charDelay = isTitle ? 44 : 30;
    line.classList.add("is-typing");

    for (let j = 0; j < text.length; j += 1) {
      if (runId !== typingRunId) {
        return;
      }

      line.textContent += text[j];
      await wait(charDelay);
    }

    line.classList.remove("is-typing");
    await wait(140);
  }
}

/* ---------- decorations ---------- */

function createSparkleBurst() {
  if (reduceMotion) {
    return;
  }

  const rect = card.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const count = 16;

  for (let i = 0; i < count; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const distance = 45 + Math.random() * 80;
    sparkle.style.setProperty("--x", `${centerX}px`);
    sparkle.style.setProperty("--y", `${centerY}px`);
    sparkle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    sparkle.style.setProperty("--s", `${6 + Math.random() * 8}px`);
    sparkle.addEventListener("animationend", () => sparkle.remove(), {
      once: true,
    });
    sparkleLayer.appendChild(sparkle);
  }
}

function createFlowers() {
  const flowerCount = 18;
  for (let i = 0; i < flowerCount; i += 1) {
    const flower = document.createElement("span");
    flower.className = "flower";
    flower.style.left = `${Math.random() * 100}vw`;
    flower.style.setProperty("--size", `${14 + Math.random() * 20}px`);
    flower.style.setProperty("--duration", `${8 + Math.random() * 8}s`);
    flower.style.setProperty("--delay", `${-Math.random() * 16}s`);
    flower.style.setProperty("--drift", `${-42 + Math.random() * 84}px`);
    flower.style.setProperty("--opacity", `${0.35 + Math.random() * 0.45}`);
    flowerRain.appendChild(flower);
  }
}

/* ---------- open / close ---------- */

function toggleCard() {
  const willOpen = !card.classList.contains("open");
  card.classList.toggle("open", willOpen);
  card.setAttribute("aria-expanded", String(willOpen));

  if (willOpen) {
    card.classList.add("fresh-open");
    if (bloomTimer) {
      clearTimeout(bloomTimer);
    }
    bloomTimer = setTimeout(() => {
      card.classList.remove("fresh-open");
    }, 720);
    createSparkleBurst();
    playTypewriter();
    return;
  }

  typingRunId += 1;
  setMessageImmediate();
}

cacheMessageText();
setMessageImmediate();
createFlowers();

card.addEventListener("click", toggleCard);
card.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleCard();
  }
});
