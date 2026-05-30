import { $ } from './utils.js';

export function createUI(actions) {
  const elements = {
    screens: {
      menu: $('#menu-screen'),
      game: $('#game-screen'),
    },
    booksGrid: $('#booksGrid'),
    booksGrid2: $('#booksGrid2'),
    resetBtn: $('#resetBtn'),
    backBtn: $('#backBtn'),
    chapterChip: $('#chapterChip'),
    legend: $('#legend'),
    centerText: $('#centerText'),
    tapHint: $('#tapHint'),
    progressWrap: $('#progressWrap'),
    progressFill: $('#progressFill'),
    progressCount: $('#progressCount'),
    progressLabel: $('#progressLabel'),
    inventory: $('#inventory'),
    debugChip: $('#debugChip'),
    tosModal: $('#tosModal'),
    tosAccept: $('#tosAccept'),
    tosDecline: $('#tosDecline'),
    infoModal: $('#infoModal'),
    infoTitle: $('#infoTitle'),
    infoBody: $('#infoBody'),
    infoOk: $('#infoOk'),
    slotString: $('#slot-string'),
    slotMoney: $('#slot-money'),
    slotComputer: $('#slot-computer'),
  };

  elements.backBtn.onclick = actions.onBackToMenu;
  elements.resetBtn.onclick = actions.onReset;
  elements.tosAccept.onclick = actions.onAcceptTos;
  elements.tosDecline.onclick = actions.onDeclineTos;
  elements.infoOk.onclick = hideInfo;

  function renderLibrary(books) {
    elements.booksGrid.innerHTML = '';
    elements.booksGrid2.innerHTML = '';

    books.forEach((book, index) => {
      const tile = document.createElement('div');
      const target = index < 6 ? elements.booksGrid : elements.booksGrid2;

      tile.className = `book${book.unlocked ? ' unlocked' : ' locked'}`;
      tile.innerHTML = `
        <div class="book-spine"></div>
        <div class="book-title">${book.title}</div>
        <div class="book-chap">Chapter ${book.id}</div>
        <div class="book-badge">${book.unlocked ? 'Open' : 'Locked'}</div>
      `;
      tile.onclick = () => {
        if (book.unlocked) {
          actions.onOpenChapter(book.id);
        }
      };

      target.appendChild(tile);
    });
  }

  function showScreen(name) {
    elements.screens.menu.classList.toggle('active', name === 'menu');
    elements.screens.game.classList.toggle('active', name === 'game');
  }

  function hideAllUI() {
    elements.legend.style.display = 'none';
    elements.centerText.style.display = 'none';
    elements.tapHint.style.display = 'none';
    elements.progressWrap.style.display = 'none';
    elements.inventory.style.display = 'none';
    elements.debugChip.style.display = 'none';
  }

  function showLegend(text) {
    elements.legend.textContent = text;
    elements.legend.style.display = 'block';
  }

  function showTapHint(text) {
    if (text) {
      elements.tapHint.textContent = text;
    }
    elements.tapHint.style.display = 'block';
  }

  function showProgress() {
    elements.progressWrap.style.display = 'block';
  }

  function updateProgress({ label, countText, percent }) {
    if (label !== undefined) {
      elements.progressLabel.textContent = label;
    }
    if (countText !== undefined) {
      elements.progressCount.textContent = countText;
    }
    if (percent !== undefined) {
      elements.progressFill.style.width = `${percent}%`;
    }
  }

  function showInventory() {
    elements.inventory.style.display = 'flex';
  }

  function updateInventoryUI(inventory) {
    elements.slotString.classList.toggle('filled', Boolean(inventory.string));
    elements.slotMoney.classList.toggle('filled', Boolean(inventory.money));
    elements.slotComputer.classList.toggle('filled', Boolean(inventory.computer));
  }

  function showDebugChip(text = 'DEBUG') {
    elements.debugChip.textContent = text;
    elements.debugChip.style.display = 'inline-flex';
  }

  function showInfo(title, body) {
    elements.infoTitle.textContent = title;
    elements.infoBody.textContent = body;
    elements.infoModal.classList.add('show');
  }

  function hideInfo() {
    elements.infoModal.classList.remove('show');
  }

  function showTos() {
    elements.tosModal.classList.add('show');
  }

  function hideTos() {
    elements.tosModal.classList.remove('show');
  }

  function setChapterLabel(label) {
    elements.chapterChip.textContent = label;
  }

  return {
    elements,
    renderLibrary,
    showScreen,
    hideAllUI,
    showLegend,
    showTapHint,
    showProgress,
    updateProgress,
    showInventory,
    updateInventoryUI,
    showDebugChip,
    showInfo,
    hideInfo,
    showTos,
    hideTos,
    setChapterLabel,
  };
}