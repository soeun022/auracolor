// State Management
let state = {
  colors: [], // Array of { hex, hsl, locked }
  colorCount: 5,
  harmony: 'random',
  savedPalettes: [],
  deferredPrompt: null, // For PWA installation
  activePickerIndex: null // Track index for active color card in custom picker
};

// DOM Elements Cache
const elements = {
  paletteContainer: document.getElementById('palette-container'),
  harmonySelect: document.getElementById('harmony-select'),
  pwaInstallBtn: document.getElementById('pwa-install-btn'),
  toggleSavedBtn: document.getElementById('toggle-saved-btn'),
  closeDrawerBtn: document.getElementById('close-drawer-btn'),
  savedDrawer: document.getElementById('saved-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  searchSavedInput: document.getElementById('search-saved-input'),
  savedPalettesList: document.getElementById('saved-palettes-list'),
  colorCountNum: document.getElementById('color-count-num'),
  addColorBtn: document.getElementById('add-color-btn'),
  removeColorBtn: document.getElementById('remove-color-btn'),
  generateBtn: document.getElementById('generate-btn'),
  saveBtn: document.getElementById('save-btn'),
  paletteNameInput: document.getElementById('palette-name-input'),
  toastContainer: document.getElementById('toast-container'),

  // Custom Color Picker DOM elements
  pickerModal: document.getElementById('picker-modal'),
  pickerModalOverlay: document.getElementById('picker-modal-overlay'),
  pickerHexInput: document.getElementById('picker-hex-input'),
  pickerCanvas: document.getElementById('picker-canvas'),
  pickerCursor: document.getElementById('picker-cursor'),
  pickerHueSlider: document.getElementById('picker-hue-slider'),
  pickerBrightnessSlider: document.getElementById('picker-brightness-slider'),
  pickerBrightnessNum: document.getElementById('picker-brightness-num')
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  loadSavedPalettes();
  setupEventListeners();
  initPalette();
  registerServiceWorker();
});

// Register Service Worker for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[Service Worker] Registered', reg.scope))
        .catch(err => console.error('[Service Worker] Registration failed', err));
    });
  }
}

// Intercept PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  elements.pwaInstallBtn.classList.remove('hidden');
});

// Toast System
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  
  const iconName = type === 'error' ? 'alert-circle' : 'check-circle';
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  lucide.createIcons();
  
  // Auto remove after animation completes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// HSL <-> HEX Conversion Utilities
function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

// Get contrast text class (dark/light) based on luminance
function getTextContrastClass(hex) {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let a = [r, g, b].map(function (v) {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  let luminance = a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  return luminance > 0.45 ? 'dark-text' : 'light-text';
}

// Generate a random HSL color in grey-beige/greige tone (灰米色調)
function randomColor() {
  const h = Math.floor(Math.random() * 45) + 15; // 15 to 60 degrees (warm sands, creams, stone greige)
  const s = Math.floor(Math.random() * 15) + 6;  // 6% to 21% saturation (very soft, muted greyish)
  const l = Math.floor(Math.random() * 40) + 40; // 40% to 80% lightness (elegant warm tones)
  return { h, s, l, hex: hslToHex(h, s, l) };
}

// Initialize workspace colors array
function initPalette() {
  state.colors = [];
  for (let i = 0; i < state.colorCount; i++) {
    const color = randomColor();
    state.colors.push({
      hex: color.hex,
      hsl: { h: color.h, s: color.s, l: color.l },
      locked: false
    });
  }
  generatePalette(true); // Initial generation
}

// Primary Palette Generator Algorithm
function generatePalette(forceAll = false) {
  // Find a base color for harmony algorithms:
  // Use first locked color. If none, generate a random starting color.
  let baseColor;
  const firstLocked = state.colors.find(c => c.locked);
  
  if (firstLocked) {
    baseColor = { ...firstLocked.hsl, hex: firstLocked.hex };
  } else {
    baseColor = randomColor();
  }

  state.colors.forEach((colorObj, i) => {
    if (colorObj.locked && !forceAll) return; // Keep locked colors

    let h = baseColor.h;
    let s = baseColor.s;
    let l = baseColor.l;

    const factor = (i - Math.floor(state.colorCount / 2));

    if (state.harmony === 'random') {
      const rand = randomColor();
      h = rand.h;
      s = rand.s;
      l = rand.l;
    } else if (state.harmony === 'monochromatic') {
      // Vary lightness and saturation
      l = Math.max(35, Math.min(82, baseColor.l + (factor * 9)));
      s = Math.max(6, Math.min(22, baseColor.s - (factor * 2)));
    } else if (state.harmony === 'analogous') {
      // Hues spaced by 12 degrees for smooth sand transitions
      h = (baseColor.h + (factor * 12) + 360) % 360;
      s = Math.max(6, Math.min(22, baseColor.s + factor));
      l = Math.max(35, Math.min(82, baseColor.l - (factor * 5)));
    } else if (state.harmony === 'complementary') {
      // Opposite hues on the wheel, but desaturated
      if (i < Math.ceil(state.colorCount / 2)) {
        h = baseColor.h;
        l = Math.max(35, Math.min(82, baseColor.l + (i * 6)));
      } else {
        h = (baseColor.h + 180) % 360;
        l = Math.max(35, Math.min(82, baseColor.l - ((i - Math.ceil(state.colorCount / 2)) * 6)));
      }
      s = Math.max(6, Math.min(22, baseColor.s));
    } else if (state.harmony === 'triadic') {
      // Spaced by 120 degrees
      const segment = i % 3;
      if (segment === 0) h = baseColor.h;
      else if (segment === 1) h = (baseColor.h + 120) % 360;
      else h = (baseColor.h + 240) % 360;
      
      const repeatOffset = Math.floor(i / 3) * 6;
      l = Math.max(35, Math.min(82, baseColor.l + repeatOffset));
      s = Math.max(6, Math.min(22, baseColor.s));
    } else if (state.harmony === 'split') {
      // Base, Base + 150, Base + 210
      const segment = i % 3;
      if (segment === 0) h = baseColor.h;
      else if (segment === 1) h = (baseColor.h + 150) % 360;
      else h = (baseColor.h + 210) % 360;
      
      const repeatOffset = Math.floor(i / 3) * 6;
      l = Math.max(35, Math.min(82, baseColor.l - repeatOffset));
      s = Math.max(6, Math.min(22, baseColor.s));
    }

    colorObj.hsl = { h, s, l };
    colorObj.hex = hslToHex(h, s, l);
  });

  renderPalette();
}

// Remove specific color from palette
function removeSpecificColor(index) {
  if (state.colorCount > 2) {
    state.colors.splice(index, 1);
    state.colorCount--;
    elements.colorCountNum.textContent = state.colorCount;
    renderPalette();
  } else {
    showToast('最少需要 2 種色彩', 'error');
  }
}

// Render colors in workspace
function renderPalette() {
  elements.paletteContainer.innerHTML = '';
  
  state.colors.forEach((colorObj, i) => {
    const contrastClass = getTextContrastClass(colorObj.hex);
    const col = document.createElement('div');
    col.className = 'color-col';
    col.dataset.index = i;

    col.innerHTML = `
      <button class="lock-btn ${colorObj.locked ? 'locked' : ''}" title="${colorObj.locked ? '解鎖色彩' : '鎖定色彩'}">
        <i data-lucide="${colorObj.locked ? 'lock' : 'unlock'}"></i>
      </button>
      
      <div class="color-card ${contrastClass}" style="background-color: ${colorObj.hex}">
        <div class="col-center">
          <span class="hex-value" title="點擊複製">${colorObj.hex.toUpperCase()}</span>
        </div>
        
        <div class="col-right">
          <button class="tool-btn adjust-btn" title="細部調整">
            <i data-lucide="sliders"></i>
          </button>
          <button class="tool-btn delete-btn" title="刪除色彩" style="color: var(--danger-color);">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;

    // Event Listeners for this column
    const lockBtn = col.querySelector('.lock-btn');
    lockBtn.addEventListener('click', () => toggleLock(i));

    const hexText = col.querySelector('.hex-value');
    hexText.addEventListener('click', () => copyToClipboard(colorObj.hex));

    const adjustBtn = col.querySelector('.adjust-btn');
    adjustBtn.addEventListener('click', () => openPickerModal(i));

    const deleteBtn = col.querySelector('.delete-btn');
    if (state.colorCount <= 2) {
      deleteBtn.style.opacity = '0.3';
      deleteBtn.style.cursor = 'not-allowed';
      deleteBtn.addEventListener('click', () => showToast('最少需要 2 種色彩', 'error'));
    } else {
      deleteBtn.addEventListener('click', () => removeSpecificColor(i));
    }

    elements.paletteContainer.appendChild(col);
  });

  updateMeshBackground();
  lucide.createIcons();
}

// Toggle lock status of column
function toggleLock(index) {
  state.colors[index].locked = !state.colors[index].locked;
  renderPalette();
}


// Update color workspace UI elements dynamically
function updateColorWorkspace(index, hex, h, s, l) {
  const col = elements.paletteContainer.children[index];
  if (!col) return;
  const card = col.querySelector('.color-card');
  if (card) {
    card.style.backgroundColor = hex;
    card.className = `color-card ${getTextContrastClass(hex)}`;
  }
  const hexValueSpan = col.querySelector('.hex-value');
  if (hexValueSpan) hexValueSpan.textContent = hex.toUpperCase();
  const pickerInput = col.querySelector('.color-picker-input');
  if (pickerInput) pickerInput.value = hex;

  updateMeshBackground();
}

// Copy color hex code to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text.toUpperCase()).then(() => {
    showToast(`已複製色碼：${text.toUpperCase()}`);
  }).catch(() => {
    showToast('複製失敗', 'error');
  });
}

// Saved Palettes Logic
function loadSavedPalettes() {
  const data = localStorage.getItem('auracolor_palettes');
  if (data) {
    try {
      state.savedPalettes = JSON.parse(data);
    } catch (e) {
      console.error('Error loading saved palettes', e);
      state.savedPalettes = [];
    }
  } else {
    state.savedPalettes = [];
  }
  renderSavedPalettesList();
}

function saveCurrentPalette() {
  const rawName = elements.paletteNameInput.value.trim();
  const name = rawName || `配色卡 #${state.savedPalettes.length + 1}`;
  
  const newPalette = {
    id: Date.now().toString(),
    name: name,
    colors: state.colors.map(c => c.hex),
    date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  };

  state.savedPalettes.unshift(newPalette); // Add to top
  localStorage.setItem('auracolor_palettes', JSON.stringify(state.savedPalettes));
  
  elements.paletteNameInput.value = ''; // clear input
  showToast(`已成功儲存色卡「${name}」！`);
  loadSavedPalettes();
}

function deletePalette(id, name) {
  state.savedPalettes = state.savedPalettes.filter(p => p.id !== id);
  localStorage.setItem('auracolor_palettes', JSON.stringify(state.savedPalettes));
  showToast(`已刪除「${name}」`);
  loadSavedPalettes();
}

function applySavedPalette(paletteColors) {
  state.colorCount = paletteColors.length;
  elements.colorCountNum.textContent = state.colorCount;
  
  state.colors = paletteColors.map(hex => ({
    hex: hex,
    hsl: hexToHsl(hex),
    locked: false
  }));
  
  renderPalette();
  closeDrawer();
  showToast('已套用配色卡至工作區');
}

function copyFullPaletteHex(colorsArray) {
  const text = colorsArray.map(c => c.toUpperCase()).join(', ');
  navigator.clipboard.writeText(text).then(() => {
    showToast('已複製整組色碼！');
  }).catch(() => {
    showToast('複製失敗', 'error');
  });
}

// Render Saved Palettes inside drawer
function renderSavedPalettesList(filterText = '') {
  elements.savedPalettesList.innerHTML = '';
  
  const filtered = state.savedPalettes.filter(p => 
    p.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    elements.savedPalettesList.innerHTML = `
      <div class="empty-state">
        <i data-lucide="search-slash"></i>
        <p>${filterText ? '找不到符合的色卡' : '目前沒有儲存的配色卡'}</p>
        <span>${filterText ? '換個關鍵字搜尋看看吧' : '為你的配色命名並點擊儲存色彩開始！'}</span>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'saved-card';
    
    // Create color strip HTML
    let colorStripHtml = `<div class="card-color-strip" title="點擊套用此配色">`;
    p.colors.forEach(hex => {
      colorStripHtml += `<div class="card-color-segment" style="background-color: ${hex}"></div>`;
    });
    colorStripHtml += `</div>`;

    card.innerHTML = `
      <div class="card-header">
        <span class="card-title" title="${p.name}">${p.name}</span>
        <span class="card-date">${p.date}</span>
      </div>
      ${colorStripHtml}
      <div class="card-actions">
        <button class="card-btn card-btn-copy" title="複製此色卡的所有 HEX 代碼">
          <i data-lucide="copy"></i>
        </button>
        <button class="card-btn card-btn-delete" title="刪除此色卡">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    // Click events
    card.querySelector('.card-color-strip').addEventListener('click', () => {
      applySavedPalette(p.colors);
    });

    card.querySelector('.card-btn-copy').addEventListener('click', () => {
      copyFullPaletteHex(p.colors);
    });

    card.querySelector('.card-btn-delete').addEventListener('click', () => {
      deletePalette(p.id, p.name);
    });

    elements.savedPalettesList.appendChild(card);
  });

  lucide.createIcons();
}

// Drawer Open/Close Transitions
function openDrawer() {
  elements.savedDrawer.classList.add('open');
  elements.drawerOverlay.classList.add('open');
}

function closeDrawer() {
  elements.savedDrawer.classList.remove('open');
  elements.drawerOverlay.classList.remove('open');
}

// Event Listeners setup
function setupEventListeners() {
  // Generate on spacebar press (if not typing in input fields)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const activeEl = document.activeElement.tagName;
      if (activeEl !== 'INPUT' && activeEl !== 'SELECT' && activeEl !== 'TEXTAREA') {
        e.preventDefault();
        generatePalette();
      }
    }
  });

  // Generator Buttons
  elements.generateBtn.addEventListener('click', () => generatePalette());
  
  // Harmony Selector
  elements.harmonySelect.addEventListener('change', (e) => {
    state.harmony = e.target.value;
    generatePalette(true); // force recalculation based on new harmony rules
  });

  // Add/Remove colors modifiers
  elements.addColorBtn.addEventListener('click', () => {
    if (state.colorCount < 8) {
      state.colorCount++;
      elements.colorCountNum.textContent = state.colorCount;
      
      // Push new color mapping the harmony
      const color = randomColor();
      state.colors.push({
        hex: color.hex,
        hsl: { h: color.h, s: color.s, l: color.l },
        locked: false
      });
      renderPalette();
    } else {
      showToast('最多支援 8 種色彩', 'error');
    }
  });

  elements.removeColorBtn.addEventListener('click', () => {
    if (state.colorCount > 2) {
      state.colorCount--;
      elements.colorCountNum.textContent = state.colorCount;
      state.colors.pop();
      renderPalette();
    } else {
      showToast('最少需要 2 種色彩', 'error');
    }
  });

  // Saving Palette
  elements.saveBtn.addEventListener('click', saveCurrentPalette);
  
  elements.paletteNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveCurrentPalette();
    }
  });

  // Saved Drawer controls
  elements.toggleSavedBtn.addEventListener('click', openDrawer);
  elements.closeDrawerBtn.addEventListener('click', closeDrawer);
  elements.drawerOverlay.addEventListener('click', closeDrawer);

  // Search filter saved palettes
  elements.searchSavedInput.addEventListener('input', (e) => {
    renderSavedPalettesList(e.target.value);
  });

  // PWA Install Button Click
  elements.pwaInstallBtn.addEventListener('click', () => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      state.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          showToast('感謝您安裝 AuraColor！');
          elements.pwaInstallBtn.classList.add('hidden');
        } else {
          showToast('安裝已取消', 'error');
        }
        state.deferredPrompt = null;
      });
    }
  });

  // Custom Color Picker Modal bindings
  const pickerCloseBtn = document.getElementById('picker-close-btn');
  if (pickerCloseBtn) {
    pickerCloseBtn.addEventListener('click', closePickerModal);
  }
  elements.pickerModalOverlay.addEventListener('click', closePickerModal);
  
  elements.pickerCanvas.addEventListener('mousedown', startCanvasDrag);
  window.addEventListener('mousemove', canvasDrag);
  window.addEventListener('mouseup', stopCanvasDrag);
  
  elements.pickerCanvas.addEventListener('touchstart', startCanvasDrag, { passive: false });
  window.addEventListener('touchmove', canvasDrag, { passive: false });
  window.addEventListener('touchend', stopCanvasDrag);
  
  elements.pickerHueSlider.addEventListener('input', handlePickerHueInput);
  elements.pickerBrightnessSlider.addEventListener('input', handlePickerBrightnessInput);
  elements.pickerHexInput.addEventListener('input', handlePickerHexInput);
}

// ==========================================
// Custom Color Picker Modal Logic (HSV/HSB)
// ==========================================

let isDraggingCanvas = false;

// HSV <-> HSL helper conversions
function hsvToHsl(h, s, v) {
  s /= 100;
  v /= 100;
  let l = v * (1 - s / 2);
  let sL = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
  return {
    h: h,
    s: Math.round(sL * 100),
    l: Math.round(l * 100)
  };
}

function hslToHsv(h, s, l) {
  s /= 100;
  l /= 100;
  let v = l + s * Math.min(l, 1 - l);
  let sV = v === 0 ? 0 : 2 * (1 - l / v);
  return {
    h: h,
    s: Math.round(sV * 100),
    v: Math.round(v * 100)
  };
}

// Open modal and load current color properties
function openPickerModal(index) {
  state.activePickerIndex = index;
  const colorObj = state.colors[index];
  const hsv = hslToHsv(colorObj.hsl.h, colorObj.hsl.s, colorObj.hsl.l);
  
  elements.pickerHexInput.value = colorObj.hex.toUpperCase();
  elements.pickerHueSlider.value = colorObj.hsl.h;
  elements.pickerBrightnessSlider.value = colorObj.hsl.l;
  elements.pickerBrightnessNum.textContent = colorObj.hsl.l;
  
  // Set canvas background to pure Hue
  elements.pickerCanvas.style.backgroundColor = hslToHex(colorObj.hsl.h, 100, 50);
  
  // Set cursor position based on Saturation & Value
  elements.pickerCursor.style.left = `${hsv.s}%`;
  elements.pickerCursor.style.top = `${100 - hsv.v}%`;
  
  // Update brightness track gradient
  updateBrightnessTrackBackground(colorObj.hsl.h, colorObj.hsl.s);
  
  elements.pickerModal.classList.add('active');
}

function closePickerModal() {
  state.activePickerIndex = null;
  elements.pickerModal.classList.remove('active');
}

// Drag events on Saturation/Value Square
function startCanvasDrag(e) {
  isDraggingCanvas = true;
  canvasDrag(e);
}

function canvasDrag(e) {
  if (!isDraggingCanvas || state.activePickerIndex === null) return;
  
  // Prevent touch scrolling
  if (e.cancelable) e.preventDefault();
  
  const rect = elements.pickerCanvas.getBoundingClientRect();
  let clientX = e.clientX;
  let clientY = e.clientY;
  
  if (e.touches && e.touches[0]) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  
  let x = clientX - rect.left;
  let y = clientY - rect.top;
  
  // Clamp boundaries
  x = Math.max(0, Math.min(rect.width, x));
  y = Math.max(0, Math.min(rect.height, y));
  
  const s_hsv = Math.round((x / rect.width) * 100);
  const v_hsv = Math.round((1 - y / rect.height) * 100);
  
  // Position handle
  elements.pickerCursor.style.left = `${(x / rect.width) * 100}%`;
  elements.pickerCursor.style.top = `${(y / rect.height) * 100}%`;
  
  updateColorFromHsv(s_hsv, v_hsv);
}

function stopCanvasDrag() {
  isDraggingCanvas = false;
}

// Update state and workspace from HSV coords
function updateColorFromHsv(s_hsv, v_hsv) {
  const index = state.activePickerIndex;
  if (index === null) return;
  
  const h = parseInt(elements.pickerHueSlider.value);
  const hsl = hsvToHsl(h, s_hsv, v_hsv);
  const hex = hslToHex(h, hsl.s, hsl.l);
  
  state.colors[index].hex = hex;
  state.colors[index].hsl = { h, s: hsl.s, l: hsl.l };
  
  // Update inputs inside modal
  elements.pickerHexInput.value = hex.toUpperCase();
  elements.pickerBrightnessSlider.value = hsl.l;
  elements.pickerBrightnessNum.textContent = hsl.l;
  
  updateBrightnessTrackBackground(h, hsl.s);
  updateColorWorkspace(index, hex, h, hsl.s, hsl.l);
}

// Slider update handlers
function handlePickerHueInput() {
  const index = state.activePickerIndex;
  if (index === null) return;
  
  const h = parseInt(elements.pickerHueSlider.value);
  
  // Update canvas background
  elements.pickerCanvas.style.backgroundColor = hslToHex(h, 100, 50);
  
  // Get current HSV saturation and value from cursor coordinates
  const s_hsv = parseFloat(elements.pickerCursor.style.left);
  const v_hsv = 100 - parseFloat(elements.pickerCursor.style.top);
  
  updateColorFromHsv(s_hsv, v_hsv);
}

function handlePickerBrightnessInput() {
  const index = state.activePickerIndex;
  if (index === null) return;
  
  const l = parseInt(elements.pickerBrightnessSlider.value);
  elements.pickerBrightnessNum.textContent = l;
  
  const h = parseInt(elements.pickerHueSlider.value);
  const s_hsl = state.colors[index].hsl.s;
  
  // Update HSL lightness in state
  const hex = hslToHex(h, s_hsl, l);
  state.colors[index].hex = hex;
  state.colors[index].hsl.l = l;
  
  elements.pickerHexInput.value = hex.toUpperCase();
  
  // Re-calculate HSV to update cursor position
  const hsv = hslToHsv(h, s_hsl, l);
  elements.pickerCursor.style.left = `${hsv.s}%`;
  elements.pickerCursor.style.top = `${100 - hsv.v}%`;
  
  updateBrightnessTrackBackground(h, s_hsl);
  updateColorWorkspace(index, hex, h, s_hsl, l);
}

function handlePickerHexInput() {
  const index = state.activePickerIndex;
  if (index === null) return;
  
  let val = elements.pickerHexInput.value.trim();
  if (!val.startsWith('#')) val = '#' + val;
  
  // Validate standard HEX format
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    const hex = val;
    const hsl = hexToHsl(hex);
    const hsv = hslToHsv(hsl.h, hsl.s, hsl.l);
    
    state.colors[index].hex = hex;
    state.colors[index].hsl = hsl;
    
    // Update modal elements
    elements.pickerHueSlider.value = hsl.h;
    elements.pickerBrightnessSlider.value = hsl.l;
    elements.pickerBrightnessNum.textContent = hsl.l;
    elements.pickerCanvas.style.backgroundColor = hslToHex(hsl.h, 100, 50);
    elements.pickerCursor.style.left = `${hsv.s}%`;
    elements.pickerCursor.style.top = `${100 - hsv.v}%`;
    
    updateBrightnessTrackBackground(hsl.h, hsl.s);
    updateColorWorkspace(index, hex, hsl.h, hsl.s, hsl.l);
  }
}

// Update brightness slider track background gradient
function updateBrightnessTrackBackground(h, s) {
  elements.pickerBrightnessSlider.style.background = `linear-gradient(to right, #000000 0%, ${hslToHex(h, s, 50)} 50%, #ffffff 100%)`;
}

// Update dynamic mesh background gradients to match the palette
function updateMeshBackground() {
  const meshBackground = document.getElementById('mesh-background');
  if (!meshBackground) return;
  
  const circles = meshBackground.querySelectorAll('.mesh-circle');
  if (!circles.length) return;
  
  // Distribute active color palette HEX values across the background circle nodes
  // Modulo calculation ensures all 8 backdrop nodes are colored evenly even if colorCount < 8
  for (let i = 0; i < circles.length; i++) {
    const colorIndex = i % state.colors.length;
    const hex = state.colors[colorIndex].hex;
    if (circles[i]) {
      circles[i].style.backgroundColor = hex;
    }
  }
}
