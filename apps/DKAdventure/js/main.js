import { loadGameData } from './data-loader.js';
import { Game } from './game.js';
import { createSaveStore } from './storage.js';
import { createUI } from './ui.js';

function buildBooks(books, saveData) {
  return books.map((book) => ({
    ...book,
    unlocked: saveData.unlocked.includes(book.id),
  }));
}

function showBootError(message) {
  const panel = document.createElement('div');
  panel.textContent = message;
  Object.assign(panel.style, {
    position: 'fixed',
    left: '16px',
    right: '16px',
    bottom: '16px',
    zIndex: '9999',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#111624',
    color: '#e5e7eb',
    border: '1px solid #1f2a44',
    boxShadow: '0 10px 30px rgba(0,0,0,.5)',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
  });
  document.body.appendChild(panel);
}

async function init() {
  const data = await loadGameData();
  const saveStore = createSaveStore();
  let game = null;
  let ui = null;

  ui = createUI({
    onOpenChapter(id) {
      if (!game) {
        return;
      }
      ui.showScreen('game');
      game.startChapter(id);
    },
    onBackToMenu() {
      if (!game) {
        return;
      }
      ui.showScreen('menu');
      ui.hideAllUI();
      ui.hideTos();
      ui.hideInfo();
      game.stop();
    },
    onReset() {
      saveStore.clear();
    },
    onAcceptTos() {
      saveStore.data.tosAccepted = true;
      saveStore.persist();
      ui.hideTos();
    },
    onDeclineTos() {
      ui.hideTos();
      ui.showScreen('menu');
      game?.stop();
    },
  });

  game = new Game({
    ui,
    saveStore,
    content: data.chapters,
    assets: {
      audio: data.audio,
      atlases: data.atlases,
    },
  });

  ui.renderLibrary(buildBooks(data.books, saveStore.data));
  ui.hideAllUI();
}

init().catch((error) => {
  console.error(error);
  showBootError('DKAdventure could not load its JSON files. Serve this folder over HTTP instead of opening the HTML file directly.');
});