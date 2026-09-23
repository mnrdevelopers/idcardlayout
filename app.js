/**
 * A4 ID Card Specimen Layout & Print Tool
 * Fully Client-Side High-Precision Printing & PDF Export
 * Strict Safety: Mandatory "SAMPLE / NOT VALID FOR IDENTIFICATION" Markings
 */

// ==========================================================================
// 1. CONSTANTS & INITIAL STATE
// ==========================================================================

const MM_TO_INCH = 1 / 25.4;

const PRESETS = {
    id1: { width: 85.60, height: 53.98, name: "ID-1 Standard" },
    driving: { width: 85.60, height: 53.98, name: "Driver License / Badge" },
    business: { width: 90.00, height: 50.00, name: "Business Card" },
    id2: { width: 105.00, height: 74.00, name: "ID-2 Specimen (A7)" },
    custom: { width: 85.60, height: 53.98, name: "Custom" }
};

const DEFAULT_STATE = {
    // Mode
    mode: 'single', // 'single' or 'batch'

    // Paper Specs
    paperOrientation: 'portrait', // 'portrait' (210x297) | 'landscape' (297x210)
    paperWidthMm: 210,
    paperHeightMm: 297,
    outputDpi: 300,

    // Card Specs
    cardPreset: 'id1',
    cardWidthMm: 85.60,
    cardHeightMm: 53.98,
    cardResizeMode: 'cover', // 'cover' (Crop to Fill), 'contain', 'stretch'
    cardBorderRadiusMm: 3.18,

    // Layout Alignment
    topMarginMm: 25,
    cardGapMm: 5,
    cuttingGuideStyle: 'dashed', // 'dashed', 'solid', 'cropmarks', 'none'
    guideColor: '#94a3b8',

    // Watermark & Safety Specs (Mandatory)
    watermarkText: 'SAMPLE / NOT VALID FOR IDENTIFICATION',
    watermarkPlacement: 'bottom_banner', // 'bottom_banner', 'diagonal_overlay', 'top_bottom_dual', 'subtle_card_stamp'
    watermarkColor: 'crimson',
    watermarkOpacity: 0.70,
    watermarkSizeScale: 1.0,

    // Images State
    front: {
        file: null,
        img: null,
        name: '',
        sizeStr: '',
        dimsStr: '',
        rotation: 0, // 0, 90, 180, 270
        zoom: 1.0,   // 0.5 to 2.0
        offsetX: 0,  // mm
        offsetY: 0   // mm
    },
    back: {
        file: null,
        img: null,
        name: '',
        sizeStr: '',
        dimsStr: '',
        rotation: 0,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0
    },

    // Batch Queue
    batchQueue: [] // Array of { id, frontFile, backFile, frontImg, backImg, status, frontName, backName }
};

// Global Active State
let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
// Keep image object references in separate registry
let imageRegistry = {
    front: null,
    back: null
};

// Canvas references
let previewCanvas = null;
let previewCtx = null;
let masterCanvas = null;
let masterCtx = null;

// UI & Zoom state
let previewZoomScale = 1.0;
let isRendering = false;
let renderDebounceTimer = null;

// ==========================================================================
// 2. DOM ELEMENTS CACHE
// ==========================================================================

const DOM = {};

function initDOM() {
    // Mode toggles
    DOM.btnToggleBatch = document.getElementById('btnToggleBatch');
    DOM.batchBtnText = document.getElementById('batchBtnText');
    DOM.singleModeSection = document.getElementById('singleModeSection');
    DOM.batchModeSection = document.getElementById('batchModeSection');

    // Header actions
    DOM.btnLoadSample = document.getElementById('btnLoadSample');
    DOM.btnResetAll = document.getElementById('btnResetAll');

    // Single upload zones
    DOM.frontDropZone = document.getElementById('frontDropZone');
    DOM.frontDropContent = document.getElementById('frontDropContent');
    DOM.inputFront = document.getElementById('inputFront');
    DOM.btnRemoveFront = document.getElementById('btnRemoveFront');
    DOM.frontMetaInfo = document.getElementById('frontMetaInfo');
    DOM.frontThumb = document.getElementById('frontThumb');
    DOM.frontName = document.getElementById('frontName');
    DOM.frontDims = document.getElementById('frontDims');
    DOM.frontSize = document.getElementById('frontSize');
    DOM.frontTweaks = document.getElementById('frontTweaks');
    DOM.frontZoom = document.getElementById('frontZoom');
    DOM.frontZoomVal = document.getElementById('frontZoomVal');
    DOM.frontOffX = document.getElementById('frontOffX');
    DOM.frontOffXVal = document.getElementById('frontOffXVal');
    DOM.frontOffY = document.getElementById('frontOffY');
    DOM.frontOffYVal = document.getElementById('frontOffYVal');
    DOM.btnResetFrontTweaks = document.getElementById('btnResetFrontTweaks');

    DOM.backDropZone = document.getElementById('backDropZone');
    DOM.backDropContent = document.getElementById('backDropContent');
    DOM.inputBack = document.getElementById('inputBack');
    DOM.btnRemoveBack = document.getElementById('btnRemoveBack');
    DOM.backMetaInfo = document.getElementById('backMetaInfo');
    DOM.backThumb = document.getElementById('backThumb');
    DOM.backName = document.getElementById('backName');
    DOM.backDims = document.getElementById('backDims');
    DOM.backSize = document.getElementById('backSize');
    DOM.backTweaks = document.getElementById('backTweaks');
    DOM.backZoom = document.getElementById('backZoom');
    DOM.backZoomVal = document.getElementById('backZoomVal');
    DOM.backOffX = document.getElementById('backOffX');
    DOM.backOffXVal = document.getElementById('backOffXVal');
    DOM.backOffY = document.getElementById('backOffY');
    DOM.backOffYVal = document.getElementById('backOffYVal');
    DOM.btnResetBackTweaks = document.getElementById('btnResetBackTweaks');

    DOM.btnSwapCards = document.getElementById('btnSwapCards');

    // Dimensions & Sizing
    DOM.cardPresetSelect = document.getElementById('cardPresetSelect');
    DOM.customCardDims = document.getElementById('customCardDims');
    DOM.cardCustomWidth = document.getElementById('cardCustomWidth');
    DOM.cardCustomHeight = document.getElementById('cardCustomHeight');
    DOM.cardResizeMode = document.getElementById('cardResizeMode');
    DOM.cardBorderRadius = document.getElementById('cardBorderRadius');

    // Paper & Layout
    DOM.paperOrientation = document.getElementById('paperOrientation');
    DOM.outputDpi = document.getElementById('outputDpi');
    DOM.topMarginMm = document.getElementById('topMarginMm');
    DOM.cardGapMm = document.getElementById('cardGapMm');
    DOM.cuttingGuideStyle = document.getElementById('cuttingGuideStyle');
    DOM.guideColor = document.getElementById('guideColor');

    // Watermark
    DOM.watermarkText = document.getElementById('watermarkText');
    DOM.watermarkPlacement = document.getElementById('watermarkPlacement');
    DOM.watermarkColor = document.getElementById('watermarkColor');
    DOM.watermarkOpacity = document.getElementById('watermarkOpacity');
    DOM.watermarkOpacityVal = document.getElementById('watermarkOpacityVal');
    DOM.watermarkSize = document.getElementById('watermarkSize');
    DOM.watermarkSizeVal = document.getElementById('watermarkSizeVal');

    // Preview
    DOM.previewCanvas = document.getElementById('previewCanvas');
    DOM.canvasStage = document.getElementById('canvasStage');
    DOM.canvasViewport = document.getElementById('canvasViewport');
    DOM.renderIndicator = document.getElementById('renderIndicator');
    DOM.btnFitPreview = document.getElementById('btnFitPreview');
    DOM.btnZoomIn = document.getElementById('btnZoomIn');
    DOM.btnZoomOut = document.getElementById('btnZoomOut');
    DOM.previewZoomText = document.getElementById('previewZoomText');

    // HUD
    DOM.hudPaper = document.getElementById('hudPaper');
    DOM.hudCardSize = document.getElementById('hudCardSize');
    DOM.hudDpi = document.getElementById('hudDpi');
    DOM.hudPixels = document.getElementById('hudPixels');
    DOM.hudLayout = document.getElementById('hudLayout');

    // Actions & Exports
    DOM.exportFilename = document.getElementById('exportFilename');
    DOM.btnRender = document.getElementById('btnRender');
    DOM.btnDownloadPdf = document.getElementById('btnDownloadPdf');
    DOM.btnDownloadJpg = document.getElementById('btnDownloadJpg');
    DOM.btnDownloadPng = document.getElementById('btnDownloadPng');
    DOM.btnPrint = document.getElementById('btnPrint');

    // Modal & Print
    DOM.printModal = document.getElementById('printModal');
    DOM.btnClosePrintModal = document.getElementById('btnClosePrintModal');
    DOM.btnCancelPrint = document.getElementById('btnCancelPrint');
    DOM.btnProceedPrint = document.getElementById('btnProceedPrint');
    DOM.printImage = document.getElementById('printImage');

    // Batch Controls
    DOM.batchFileInput = document.getElementById('batchFileInput');
    DOM.batchTableBody = document.getElementById('batchTableBody');
    DOM.btnClearBatch = document.getElementById('btnClearBatch');
    DOM.btnExportBatchZip = document.getElementById('btnExportBatchZip');
    DOM.btnExportBatchPdf = document.getElementById('btnExportBatchPdf');

    // Toast Container
    DOM.toastContainer = document.getElementById('toastContainer');
}

// ==========================================================================
// 3. INITIALIZATION & SETUP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    setupCanvas();
    bindEvents();
    // Initialise Aadhaar PDF mode (additive — runs after existing init)
    initAadhaarDOM();
    bindAadhaarEvents();
    // Initialise PDF password modal
    initPasswordModal();
    // Initialise PDF crop tool
    initCropModal();
    updateHUD();
    requestRender();
});

function setupCanvas() {
    previewCanvas = DOM.previewCanvas;
    previewCtx = previewCanvas.getContext('2d');

    // Create dedicated off-screen master high-res rendering canvas
    masterCanvas = document.createElement('canvas');
    masterCtx = masterCanvas.getContext('2d');
}

// ==========================================================================
// 4. EVENT BINDING
// ==========================================================================

function bindEvents() {
    // Mode Switch
    DOM.btnToggleBatch.addEventListener('click', toggleBatchMode);

    // Reset & Samples
    DOM.btnResetAll.addEventListener('click', () => {
        if (imageRegistry.front || imageRegistry.back || state.batchQueue.length > 0) {
            if (confirm('Are you sure you want to reset all images, settings, and queue?')) {
                resetTool();
            }
        } else {
            resetTool();
        }
    });

    DOM.btnLoadSample.addEventListener('click', loadSampleCards);

    // Single Upload Drag & Drop & Inputs
    setupDropZone('front', DOM.frontDropZone, DOM.inputFront, DOM.btnRemoveFront);
    setupDropZone('back', DOM.backDropZone, DOM.inputBack, DOM.btnRemoveBack);

    // Swap Cards
    DOM.btnSwapCards.addEventListener('click', swapCards);

    // Card Preset & Custom Dimensions
    DOM.cardPresetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        state.cardPreset = val;
        if (val === 'custom') {
            DOM.customCardDims.style.display = 'grid';
            state.cardWidthMm = parseFloat(DOM.cardCustomWidth.value) || 85.60;
            state.cardHeightMm = parseFloat(DOM.cardCustomHeight.value) || 53.98;
        } else {
            DOM.customCardDims.style.display = 'none';
            state.cardWidthMm = PRESETS[val].width;
            state.cardHeightMm = PRESETS[val].height;
        }
        updateHUD();
        requestRender();
    });

    DOM.cardCustomWidth.addEventListener('input', (e) => {
        state.cardWidthMm = Math.max(10, parseFloat(e.target.value) || 85.60);
        updateHUD();
        requestRender();
    });

    DOM.cardCustomHeight.addEventListener('input', (e) => {
        state.cardHeightMm = Math.max(10, parseFloat(e.target.value) || 53.98);
        updateHUD();
        requestRender();
    });

    DOM.cardResizeMode.addEventListener('change', (e) => {
        state.cardResizeMode = e.target.value;
        requestRender();
    });

    DOM.cardBorderRadius.addEventListener('change', (e) => {
        state.cardBorderRadiusMm = parseFloat(e.target.value) || 0;
        requestRender();
    });

    // Paper & Resolution
    DOM.paperOrientation.addEventListener('change', (e) => {
        state.paperOrientation = e.target.value;
        if (state.paperOrientation === 'portrait') {
            state.paperWidthMm = 210;
            state.paperHeightMm = 297;
        } else {
            state.paperWidthMm = 297;
            state.paperHeightMm = 210;
        }
        updateHUD();
        requestRender();
    });

    DOM.outputDpi.addEventListener('change', (e) => {
        state.outputDpi = parseInt(e.target.value, 10) || 300;
        updateHUD();
        requestRender();
    });

    DOM.topMarginMm.addEventListener('input', (e) => {
        state.topMarginMm = parseFloat(e.target.value) || 0;
        updateHUD();
        requestRender();
    });

    DOM.cardGapMm.addEventListener('input', (e) => {
        state.cardGapMm = parseFloat(e.target.value) || 0;
        updateHUD();
        requestRender();
    });

    DOM.cuttingGuideStyle.addEventListener('change', (e) => {
        state.cuttingGuideStyle = e.target.value;
        requestRender();
    });

    DOM.guideColor.addEventListener('change', (e) => {
        state.guideColor = e.target.value;
        requestRender();
    });

    // Watermark Tweaks
    DOM.watermarkPlacement.addEventListener('change', (e) => {
        state.watermarkPlacement = e.target.value;
        requestRender();
    });

    DOM.watermarkColor.addEventListener('change', (e) => {
        state.watermarkColor = e.target.value;
        requestRender();
    });

    DOM.watermarkOpacity.addEventListener('input', (e) => {
        state.watermarkOpacity = parseInt(e.target.value, 10) / 100;
        DOM.watermarkOpacityVal.textContent = `${e.target.value}%`;
        requestRender();
    });

    DOM.watermarkSize.addEventListener('input', (e) => {
        state.watermarkSizeScale = parseInt(e.target.value, 10) / 100;
        DOM.watermarkSizeVal.textContent = `${e.target.value}%`;
        requestRender();
    });

    // Per-Card Image Tweaks (Rotation, Zoom, Offsets)
    setupCardTweakListeners('front');
    setupCardTweakListeners('back');

    // Preview Canvas Navigation
    DOM.btnFitPreview.addEventListener('click', () => {
        setPreviewZoom(1.0);
        if (DOM.canvasViewport) {
            DOM.canvasViewport.scrollTop = 0;
            DOM.canvasViewport.scrollLeft = 0;
        }
    });
    DOM.btnZoomIn.addEventListener('click', () => setPreviewZoom(Math.min(previewZoomScale + 0.15, 2.5)));
    DOM.btnZoomOut.addEventListener('click', () => setPreviewZoom(Math.max(previewZoomScale - 0.15, 0.4)));

    // Re-fit / re-scale on window resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => requestRender(true), 100);
    });

    // Actions
    DOM.btnRender.addEventListener('click', () => requestRender(true));
    DOM.btnDownloadPdf.addEventListener('click', exportPDF);
    DOM.btnDownloadJpg.addEventListener('click', () => exportImage('jpeg'));
    DOM.btnDownloadPng.addEventListener('click', () => exportImage('png'));
    DOM.btnPrint.addEventListener('click', openPrintDialog);

    // Print Modal
    DOM.btnClosePrintModal.addEventListener('click', closePrintDialog);
    DOM.btnCancelPrint.addEventListener('click', closePrintDialog);
    DOM.btnProceedPrint.addEventListener('click', triggerBrowserPrint);

    // Batch Actions
    DOM.batchFileInput.addEventListener('change', handleBatchFiles);
    DOM.btnClearBatch.addEventListener('click', clearBatchQueue);
    DOM.btnExportBatchZip.addEventListener('click', exportBatchZip);
    DOM.btnExportBatchPdf.addEventListener('click', exportBatchPdf);
}

// ==========================================================================
// 5. DRAG & DROP AND FILE VALIDATION
// ==========================================================================

function setupDropZone(side, dropZone, fileInput, removeBtn) {
    const isFront = side === 'front';

    // Drag events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processCardFile(side, files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processCardFile(side, files[0]);
        }
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCardImage(side);
    });
}

function processCardFile(side, file) {
    // 1. Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
        showToast('Invalid file type! Please upload a JPG, PNG, or WebP image.', 'error');
        return;
    }

    const maxSize = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxSize) {
        showToast('File is too large! Maximum allowed size is 20 MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            imageRegistry[side] = img;
            state[side].file = file;
            state[side].name = file.name;
            state[side].sizeStr = formatFileSize(file.size);
            state[side].dimsStr = `${img.naturalWidth} × ${img.naturalHeight} px`;

            updateCardUploadUI(side);
            showToast(`${side.toUpperCase()} card image loaded successfully.`, 'success');
            requestRender();
        };
        img.onerror = () => {
            showToast('Failed to load image. File may be corrupted.', 'error');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function removeCardImage(side) {
    imageRegistry[side] = null;
    state[side].file = null;
    state[side].name = '';
    state[side].sizeStr = '';
    state[side].dimsStr = '';
    resetCardTweaks(side, false);

    // Reset input element
    const input = side === 'front' ? DOM.inputFront : DOM.inputBack;
    input.value = '';

    updateCardUploadUI(side);
    showToast(`${side.toUpperCase()} card image removed.`, 'info');
    requestRender();
}

function updateCardUploadUI(side) {
    const isFront = side === 'front';
    const dropZone = isFront ? DOM.frontDropZone : DOM.backDropZone;
    const dropContent = isFront ? DOM.frontDropContent : DOM.backDropContent;
    const metaInfo = isFront ? DOM.frontMetaInfo : DOM.backMetaInfo;
    const thumb = isFront ? DOM.frontThumb : DOM.backThumb;
    const nameEl = isFront ? DOM.frontName : DOM.backName;
    const dimsEl = isFront ? DOM.frontDims : DOM.backDims;
    const sizeEl = isFront ? DOM.frontSize : DOM.backSize;
    const removeBtn = isFront ? DOM.btnRemoveFront : DOM.btnRemoveBack;
    const tweaks = isFront ? DOM.frontTweaks : DOM.backTweaks;

    if (imageRegistry[side]) {
        dropZone.classList.add('has-file');
        dropContent.style.display = 'none';
        metaInfo.style.display = 'flex';
        removeBtn.style.display = 'inline-block';
        tweaks.style.display = 'block';

        thumb.src = imageRegistry[side].src;
        nameEl.textContent = state[side].name;
        dimsEl.textContent = state[side].dimsStr;
        sizeEl.textContent = state[side].sizeStr;
    } else {
        dropZone.classList.remove('has-file');
        dropContent.style.display = 'flex';
        metaInfo.style.display = 'none';
        removeBtn.style.display = 'none';
        tweaks.style.display = 'none';
        thumb.src = '';
    }
}

// ==========================================================================
// 6. CARD TWEAKS & CONTROLS (ROTATION, ZOOM, OFFSET)
// ==========================================================================

function setupCardTweakListeners(side) {
    const isFront = side === 'front';
    const tweaksContainer = isFront ? DOM.frontTweaks : DOM.backTweaks;
    const zoomSlider = isFront ? DOM.frontZoom : DOM.backZoom;
    const zoomVal = isFront ? DOM.frontZoomVal : DOM.backZoomVal;
    const offXSlider = isFront ? DOM.frontOffX : DOM.backOffX;
    const offXVal = isFront ? DOM.frontOffXVal : DOM.backOffXVal;
    const offYSlider = isFront ? DOM.frontOffY : DOM.backOffY;
    const offYVal = isFront ? DOM.frontOffYVal : DOM.backOffYVal;
    const resetBtn = isFront ? DOM.btnResetFrontTweaks : DOM.btnResetBackTweaks;

    // Rotation Buttons
    const rotBtns = tweaksContainer.querySelectorAll(`[data-target="${side}"][data-action="rot"]`);
    rotBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            rotBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state[side].rotation = parseInt(btn.getAttribute('data-val'), 10) || 0;
            requestRender();
        });
    });

    // Zoom
    zoomSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state[side].zoom = val / 100;
        zoomVal.textContent = `${val}%`;
        requestRender();
    });

    // Offsets
    offXSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state[side].offsetX = val;
        offXVal.textContent = `${val >= 0 ? '+' : ''}${val}mm`;
        requestRender();
    });

    offYSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state[side].offsetY = val;
        offYVal.textContent = `${val >= 0 ? '+' : ''}${val}mm`;
        requestRender();
    });

    resetBtn.addEventListener('click', () => {
        resetCardTweaks(side, true);
    });
}

function resetCardTweaks(side, triggerRender = true) {
    state[side].rotation = 0;
    state[side].zoom = 1.0;
    state[side].offsetX = 0;
    state[side].offsetY = 0;

    const isFront = side === 'front';
    const tweaksContainer = isFront ? DOM.frontTweaks : DOM.backTweaks;
    const zoomSlider = isFront ? DOM.frontZoom : DOM.backZoom;
    const zoomVal = isFront ? DOM.frontZoomVal : DOM.backZoomVal;
    const offXSlider = isFront ? DOM.frontOffX : DOM.backOffX;
    const offXVal = isFront ? DOM.frontOffXVal : DOM.backOffXVal;
    const offYSlider = isFront ? DOM.frontOffY : DOM.backOffY;
    const offYVal = isFront ? DOM.frontOffYVal : DOM.backOffYVal;

    zoomSlider.value = 100;
    zoomVal.textContent = '100%';
    offXSlider.value = 0;
    offXVal.textContent = '0mm';
    offYSlider.value = 0;
    offYVal.textContent = '0mm';

    const rotBtns = tweaksContainer.querySelectorAll(`[data-target="${side}"][data-action="rot"]`);
    rotBtns.forEach(btn => {
        if (btn.getAttribute('data-val') === '0') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (triggerRender) {
        requestRender();
    }
}

function swapCards() {
    if (!imageRegistry.front && !imageRegistry.back) {
        showToast('No images loaded to swap.', 'info');
        return;
    }

    // Swap images
    const tempImg = imageRegistry.front;
    imageRegistry.front = imageRegistry.back;
    imageRegistry.back = tempImg;

    // Swap state object data
    const tempState = JSON.parse(JSON.stringify(state.front));
    state.front = JSON.parse(JSON.stringify(state.back));
    state.back = tempState;

    updateCardUploadUI('front');
    updateCardUploadUI('back');

    showToast('Front and Back images swapped.', 'success');
    requestRender();
}

// ==========================================================================
// 7. CALCULATION & RENDERING ENGINE
// ==========================================================================

function requestRender(immediate = false) {
    if (renderDebounceTimer) {
        clearTimeout(renderDebounceTimer);
    }
    if (immediate) {
        renderAll();
    } else {
        renderDebounceTimer = setTimeout(renderAll, 30);
    }
}

function calculateLayout() {
    const dpi = state.outputDpi;
    const pxPerMm = (dpi / 25.4);

    const canvasWidthPx = Math.round(state.paperWidthMm * pxPerMm);
    const canvasHeightPx = Math.round(state.paperHeightMm * pxPerMm);

    const cardWidthPx = state.cardWidthMm * pxPerMm;
    const cardHeightPx = state.cardHeightMm * pxPerMm;
    const gapPx = state.cardGapMm * pxPerMm;
    const topMarginPx = state.topMarginMm * pxPerMm;

    // Total width of two side-by-side cards + gap
    const totalCardsWidthPx = (cardWidthPx * 2) + gapPx;
    // Horizontally centered
    const startXPx = (canvasWidthPx - totalCardsWidthPx) / 2;

    const frontRect = {
        x: startXPx,
        y: topMarginPx,
        width: cardWidthPx,
        height: cardHeightPx
    };

    const backRect = {
        x: startXPx + cardWidthPx + gapPx,
        y: topMarginPx,
        width: cardWidthPx,
        height: cardHeightPx
    };

    return {
        dpi,
        pxPerMm,
        canvasWidthPx,
        canvasHeightPx,
        frontRect,
        backRect,
        cardWidthPx,
        cardHeightPx,
        gapPx,
        topMarginPx
    };
}

function renderAll() {
    if (isRendering) return;
    isRendering = true;

    DOM.renderIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rendering...';

    const layout = calculateLayout();

    // 1. Prepare Master High-Resolution Offscreen Canvas
    masterCanvas.width = layout.canvasWidthPx;
    masterCanvas.height = layout.canvasHeightPx;

    masterCtx.imageSmoothingEnabled = true;
    masterCtx.imageSmoothingQuality = 'high';

    // Clear and draw white A4 sheet background
    masterCtx.fillStyle = '#ffffff';
    masterCtx.fillRect(0, 0, layout.canvasWidthPx, layout.canvasHeightPx);

    // 2. Draw Front and Back Cards
    drawCard(masterCtx, 'front', layout.frontRect, layout);
    drawCard(masterCtx, 'back', layout.backRect, layout);

    // 3. Draw Cutting Borders / Crop Marks
    drawCuttingGuides(masterCtx, layout.frontRect, layout);
    drawCuttingGuides(masterCtx, layout.backRect, layout);

    // 4. Draw Center Alignment Metric Guide Indicator
    drawCenterAlignmentMarkers(masterCtx, layout);

    // 5. Draw Mandatory Specimen Watermark Markings
    //    Skipped in Aadhaar PDF mode — the document is already an issued ID.
    if (sourceMode !== 'aadhaarPdf') {
        drawSpecimenWatermark(masterCtx, layout);
    }

    // 6. Draw Subtle Metadata Header/Footer on Paper for Operator Calibration (Removed per user request)
    // drawCalibrationMetadata(masterCtx, layout);

    // 7. Transfer Rendered Sheet to Live Preview Canvas
    updatePreviewDisplay(layout);

    DOM.renderIndicator.innerHTML = '<i class="fa-solid fa-circle-check"></i> Synchronized';
    isRendering = false;
}

/**
 * Draw single card inside defined bounding box with rotation, zoom, offset, and clip
 */
function drawCard(ctx, side, rect, layout) {
    const img = imageRegistry[side];
    const sideState = state[side];
    const pxPerMm = layout.pxPerMm;
    const cornerRadiusPx = (state.cardBorderRadiusMm || 0) * pxPerMm;

    ctx.save();

    // Clip to rounded card rectangle
    ctx.beginPath();
    if (cornerRadiusPx > 0) {
        roundRectPath(ctx, rect.x, rect.y, rect.width, rect.height, cornerRadiusPx);
    } else {
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
    }
    ctx.clip();

    if (img) {
        // Draw card image with transformations
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        // Calculate card center
        const cardCenterX = rect.x + rect.width / 2 + (sideState.offsetX * pxPerMm);
        const cardCenterY = rect.y + rect.height / 2 + (sideState.offsetY * pxPerMm);

        ctx.translate(cardCenterX, cardCenterY);

        // Apply rotation
        const rad = (sideState.rotation * Math.PI) / 180;
        ctx.rotate(rad);

        // Determine effective bounding dimensions after rotation
        const is90or270 = sideState.rotation === 90 || sideState.rotation === 270;
        const targetW = is90or270 ? rect.height : rect.width;
        const targetH = is90or270 ? rect.width : rect.height;

        let drawW = targetW;
        let drawH = targetH;

        if (state.cardResizeMode === 'cover') {
            const scale = Math.max(targetW / imgW, targetH / imgH) * sideState.zoom;
            drawW = imgW * scale;
            drawH = imgH * scale;
        } else if (state.cardResizeMode === 'contain') {
            const scale = Math.min(targetW / imgW, targetH / imgH) * sideState.zoom;
            drawW = imgW * scale;
            drawH = imgH * scale;
        } else if (state.cardResizeMode === 'stretch') {
            drawW = targetW * sideState.zoom;
            drawH = targetH * sideState.zoom;
        }

        // Draw image centered with maximum high-quality bicubic smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    } else {
        // Draw Empty Placeholder Guide Card
        ctx.fillStyle = side === 'front' ? '#f1f5f9' : '#f8fafc';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        // Placeholder graphic & text
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontSize = Math.round(rect.height * 0.09);
        ctx.font = `600 ${fontSize}px 'Poppins', sans-serif`;
        ctx.fillText(`${side.toUpperCase()} SIDE SPECIMEN`, rect.x + rect.width / 2, rect.y + rect.height / 2 - fontSize * 0.7);

        const subFontSize = Math.round(fontSize * 0.65);
        ctx.font = `400 ${subFontSize}px 'Poppins', sans-serif`;
        ctx.fillText(`Drop or upload ${side} card image`, rect.x + rect.width / 2, rect.y + rect.height / 2 + fontSize * 0.5);

        // Show target size in mm
        ctx.font = `500 ${subFontSize * 0.9}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${state.cardWidthMm.toFixed(2)} × ${state.cardHeightMm.toFixed(2)} mm`, rect.x + rect.width / 2, rect.y + rect.height / 2 + fontSize * 1.5);
    }

    ctx.restore();
}

/**
 * Draw cutting borders, corner crop tick marks, or dashed guides
 */
function drawCuttingGuides(ctx, rect, layout) {
    const style = state.cuttingGuideStyle;
    if (style === 'none') return;

    const pxPerMm = layout.pxPerMm;
    const cornerRadiusPx = (state.cardBorderRadiusMm || 0) * pxPerMm;

    ctx.save();
    ctx.strokeStyle = state.guideColor;
    ctx.lineWidth = Math.max(1, 0.2 * pxPerMm); // 0.2 mm thin guide

    if (style === 'dashed') {
        ctx.setLineDash([4 * (layout.dpi / 300), 4 * (layout.dpi / 300)]);
        ctx.beginPath();
        if (cornerRadiusPx > 0) {
            roundRectPath(ctx, rect.x, rect.y, rect.width, rect.height, cornerRadiusPx);
        } else {
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
        }
        ctx.stroke();
    } else if (style === 'solid') {
        ctx.setLineDash([]);
        ctx.beginPath();
        if (cornerRadiusPx > 0) {
            roundRectPath(ctx, rect.x, rect.y, rect.width, rect.height, cornerRadiusPx);
        } else {
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
        }
        ctx.stroke();
    } else if (style === 'cropmarks') {
        ctx.setLineDash([]);
        const markLen = 5 * pxPerMm; // 5 mm crop mark
        const offset = 2 * pxPerMm;  // 2 mm gap from card edge

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(rect.x - offset - markLen, rect.y);
        ctx.lineTo(rect.x - offset, rect.y);
        ctx.moveTo(rect.x, rect.y - offset - markLen);
        ctx.lineTo(rect.x, rect.y - offset);

        // Top-Right
        ctx.moveTo(rect.x + rect.width + offset, rect.y);
        ctx.lineTo(rect.x + rect.width + offset + markLen, rect.y);
        ctx.moveTo(rect.x + rect.width, rect.y - offset - markLen);
        ctx.lineTo(rect.x + rect.width, rect.y - offset);

        // Bottom-Left
        ctx.moveTo(rect.x - offset - markLen, rect.y + rect.height);
        ctx.lineTo(rect.x - offset, rect.y + rect.height);
        ctx.moveTo(rect.x, rect.y + rect.height + offset);
        ctx.lineTo(rect.x, rect.y + rect.height + offset + markLen);

        // Bottom-Right
        ctx.moveTo(rect.x + rect.width + offset, rect.y + rect.height);
        ctx.lineTo(rect.x + rect.width + offset + markLen, rect.y + rect.height);
        ctx.moveTo(rect.x + rect.width, rect.y + rect.height + offset);
        ctx.lineTo(rect.x + rect.width, rect.y + rect.height + offset + markLen);

        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw Center Alignment Marker & Gap Indicator between cards
 */
function drawCenterAlignmentMarkers(ctx, layout) {
    const pxPerMm = layout.pxPerMm;
    const centerX = layout.canvasWidthPx / 2;
    const topY = layout.topMarginPx - (6 * pxPerMm);
    const botY = layout.topMarginPx + layout.cardHeightPx + (6 * pxPerMm);

    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Top center tick
    ctx.beginPath();
    ctx.moveTo(centerX, topY - (4 * pxPerMm));
    ctx.lineTo(centerX, topY);
    ctx.stroke();

    // Bottom center tick
    ctx.beginPath();
    ctx.moveTo(centerX, botY);
    ctx.lineTo(centerX, botY + (4 * pxPerMm));
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw Mandatory Specimen Watermark
 * Strictly enforces "SAMPLE / NOT VALID FOR IDENTIFICATION"
 */
function drawSpecimenWatermark(ctx, layout) {
    const text = state.watermarkText || 'SAMPLE / NOT VALID FOR IDENTIFICATION';
    const pxPerMm = layout.pxPerMm;
    const placement = state.watermarkPlacement;
    const opacity = Math.max(0.3, Math.min(1.0, state.watermarkOpacity));
    const sizeScale = state.watermarkSizeScale || 1.0;

    // Resolve color
    let colorRgb = '220, 38, 38'; // Crimson Red
    if (state.watermarkColor === 'dark_slate') colorRgb = '51, 65, 85';
    if (state.watermarkColor === 'navy_blue') colorRgb = '30, 58, 138';
    if (state.watermarkColor === 'solid_black') colorRgb = '0, 0, 0';

    ctx.save();
    ctx.fillStyle = `rgba(${colorRgb}, ${opacity})`;
    ctx.strokeStyle = `rgba(${colorRgb}, ${opacity * 0.8})`;

    if (placement === 'bottom_banner') {
        // Banner directly beneath the cards
        const bannerY = layout.topMarginPx + layout.cardHeightPx + (14 * pxPerMm);
        const bannerW = (layout.cardWidthPx * 2) + layout.gapPx;
        const bannerH = 12 * pxPerMm * sizeScale;
        const bannerX = layout.frontRect.x;

        // Security Hatch Background Box
        ctx.fillStyle = `rgba(${colorRgb}, ${opacity * 0.08})`;
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        
        ctx.lineWidth = Math.max(1, 0.3 * pxPerMm);
        ctx.strokeStyle = `rgba(${colorRgb}, ${opacity * 0.7})`;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        // Bold Specimen Text
        const fontSize = Math.round(5.5 * pxPerMm * sizeScale);
        ctx.font = `700 ${fontSize}px 'Poppins', -apple-system, sans-serif`;
        ctx.fillStyle = `rgba(${colorRgb}, ${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, layout.canvasWidthPx / 2, bannerY + bannerH / 2);

    } else if (placement === 'diagonal_overlay') {
        // Large diagonal stamp across both cards
        const fontSize = Math.round(11 * pxPerMm * sizeScale);
        ctx.font = `800 ${fontSize}px 'Poppins', -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Stamp on Front Card
        ctx.save();
        ctx.translate(layout.frontRect.x + layout.frontRect.width / 2, layout.frontRect.y + layout.frontRect.height / 2);
        ctx.rotate(-28 * Math.PI / 180);
        ctx.fillText('SPECIMEN', 0, -fontSize * 0.5);
        ctx.font = `700 ${fontSize * 0.38}px 'Poppins', sans-serif`;
        ctx.fillText(text, 0, fontSize * 0.5);
        ctx.restore();

        // Stamp on Back Card
        ctx.save();
        ctx.translate(layout.backRect.x + layout.backRect.width / 2, layout.backRect.y + layout.backRect.height / 2);
        ctx.rotate(-28 * Math.PI / 180);
        ctx.font = `800 ${fontSize}px 'Poppins', -apple-system, sans-serif`;
        ctx.fillText('SPECIMEN', 0, -fontSize * 0.5);
        ctx.font = `700 ${fontSize * 0.38}px 'Poppins', sans-serif`;
        ctx.fillText(text, 0, fontSize * 0.5);
        ctx.restore();

    } else if (placement === 'top_bottom_dual') {
        // Dual Top Header & Bottom Banner
        const fontSize = Math.round(5 * pxPerMm * sizeScale);
        ctx.font = `700 ${fontSize}px 'Poppins', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Top Banner
        const topY = layout.topMarginPx - (10 * pxPerMm);
        ctx.fillText(`★ ${text} ★`, layout.canvasWidthPx / 2, Math.max(fontSize, topY));

        // Bottom Banner
        const botY = layout.topMarginPx + layout.cardHeightPx + (16 * pxPerMm);
        ctx.fillText(`★ ${text} ★`, layout.canvasWidthPx / 2, botY);

    } else if (placement === 'subtle_card_stamp') {
        // Centered stamp inside both cards and bottom notice
        const fontSize = Math.round(4.8 * pxPerMm * sizeScale);
        ctx.font = `700 ${fontSize}px 'Poppins', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Front card bottom strip
        ctx.fillText(text, layout.frontRect.x + layout.frontRect.width / 2, layout.frontRect.y + layout.frontRect.height - (4 * pxPerMm));
        // Back card bottom strip
        ctx.fillText(text, layout.backRect.x + layout.backRect.width / 2, layout.backRect.y + layout.backRect.height - (4 * pxPerMm));

        // Sheet footer notice
        const footerY = layout.topMarginPx + layout.cardHeightPx + (15 * pxPerMm);
        ctx.font = `600 ${fontSize * 1.1}px 'Poppins', sans-serif`;
        ctx.fillText(`★ ${text} ★`, layout.canvasWidthPx / 2, footerY);
    }

    ctx.restore();
}

/**
 * Draw Calibration and Layout Metadata on A4 sheet margin (Removed per user request)
 */
function drawCalibrationMetadata(ctx, layout) {
    // Disabled: Calibration metadata and test ruler removed per user request
    return;
}

/**
 * Transfers High-Res Master Canvas to Live Responsive Preview Canvas
 */
function updatePreviewDisplay(layout) {
    const vp = DOM.canvasViewport;
    const stageWidth = Math.max(200, (vp ? vp.clientWidth : 800) - 48);
    const stageHeight = Math.max(200, (vp ? vp.clientHeight : 600) - 48);

    // Calculate fit-to-screen scale
    const scaleFactor = Math.min(
        stageWidth / layout.canvasWidthPx,
        stageHeight / layout.canvasHeightPx,
        0.45 // Max default zoom cap for display crispness
    );

    const displayW = Math.round(layout.canvasWidthPx * scaleFactor);
    const displayH = Math.round(layout.canvasHeightPx * scaleFactor);

    previewCanvas.width = displayW;
    previewCanvas.height = displayH;

    previewCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingQuality = 'high';

    // Draw downscaled representation to preview canvas
    previewCtx.drawImage(masterCanvas, 0, 0, displayW, displayH);
}

function setPreviewZoom(scale) {
    previewZoomScale = Math.max(0.3, Math.min(3.0, scale));
    DOM.canvasStage.style.transform = `scale(${previewZoomScale})`;
    DOM.previewZoomText.textContent = `${Math.round(previewZoomScale * 100)}%`;
}

function updateHUD() {
    const layout = calculateLayout();

    DOM.hudPaper.textContent = `A4 ${state.paperOrientation.toUpperCase()} (${state.paperWidthMm} × ${state.paperHeightMm} mm)`;
    DOM.hudCardSize.textContent = `${state.cardWidthMm.toFixed(2)} × ${state.cardHeightMm.toFixed(2)} mm`;
    DOM.hudDpi.textContent = `${state.outputDpi} DPI`;
    DOM.hudPixels.textContent = `${layout.canvasWidthPx} × ${layout.canvasHeightPx} px`;
    DOM.hudLayout.textContent = `Gap: ${state.cardGapMm}mm | Top: ${state.topMarginMm}mm`;
}

// ==========================================================================
// 8. SAMPLE CARDS GENERATOR (INSTANT SPECIMEN TESTING)
// ==========================================================================

function loadSampleCards() {
    showToast('Generating sample specimen cards...', 'info');

    // Create high-res mock front card
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = 1011; // 85.6mm @ 300 DPI
    frontCanvas.height = 638;
    const fctx = frontCanvas.getContext('2d');

    // Front Card Background Gradient
    const fGrad = fctx.createLinearGradient(0, 0, 1011, 638);
    fGrad.addColorStop(0, '#1e3a8a');
    fGrad.addColorStop(0.6, '#1e40af');
    fGrad.addColorStop(1, '#0284c7');
    fctx.fillStyle = fGrad;
    fctx.fillRect(0, 0, 1011, 638);

    // Front Card Header
    fctx.fillStyle = '#ffffff';
    fctx.font = "bold 38px 'Poppins', sans-serif";
    fctx.fillText('ACADEMIC SPECIMEN CARD', 50, 70);

    fctx.fillStyle = '#93c5fd';
    fctx.font = "500 24px 'Poppins', sans-serif";
    fctx.fillText('Authorized Research & Training Facility', 50, 105);

    // Photo Box Placeholder
    fctx.fillStyle = '#e2e8f0';
    fctx.fillRect(50, 140, 260, 340);
    fctx.strokeStyle = '#38bdf8';
    fctx.lineWidth = 4;
    fctx.strokeRect(50, 140, 260, 340);

    fctx.fillStyle = '#64748b';
    fctx.font = "600 28px 'Poppins', sans-serif";
    fctx.textAlign = 'center';
    fctx.fillText('SPECIMEN', 180, 290);
    fctx.font = "400 20px 'Poppins', sans-serif";
    fctx.fillText('PHOTO', 180, 325);

    // Member Details
    fctx.textAlign = 'left';
    fctx.fillStyle = '#ffffff';
    fctx.font = "bold 32px 'Poppins', sans-serif";
    fctx.fillText('JANE DOE (SPECIMEN)', 340, 200);

    fctx.fillStyle = '#bfdbfe';
    fctx.font = "500 22px 'Poppins', sans-serif";
    fctx.fillText('ROLE: Research Fellow (Internal Testing)', 340, 245);
    fctx.fillText('ID NO: SPEC-2026-8849', 340, 290);
    fctx.fillText('VALID THRU: 12/2028', 340, 335);

    // Front Security Specimen Strip
    fctx.fillStyle = '#dc2626';
    fctx.fillRect(0, 560, 1011, 78);
    fctx.fillStyle = '#ffffff';
    fctx.font = "bold 26px 'Poppins', sans-serif";
    fctx.textAlign = 'center';
    fctx.fillText('★ SAMPLE / NOT VALID FOR IDENTIFICATION ★', 505, 610);

    // Create high-res mock back card
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 1011;
    backCanvas.height = 638;
    const bctx = backCanvas.getContext('2d');

    // Back Card Background
    bctx.fillStyle = '#f8fafc';
    bctx.fillRect(0, 0, 1011, 638);

    // Magnetic Strip
    bctx.fillStyle = '#0f172a';
    bctx.fillRect(0, 50, 1011, 100);

    // Terms / Information
    bctx.fillStyle = '#334155';
    bctx.font = "600 22px 'Poppins', sans-serif";
    bctx.textAlign = 'left';
    bctx.fillText('AUTHORIZED SPECIMEN CONDITIONS & TERMS', 50, 200);

    bctx.font = "400 18px 'Poppins', sans-serif";
    bctx.fillStyle = '#64748b';
    bctx.fillText('1. This specimen document is issued strictly for layout testing and educational verification.', 50, 240);
    bctx.fillText('2. Unauthorized reproduction as an official credential is strictly prohibited.', 50, 275);
    bctx.fillText('3. If found, return to authorized departmental office immediately.', 50, 310);

    // Signature Area
    bctx.fillStyle = '#e2e8f0';
    bctx.fillRect(50, 360, 500, 90);
    bctx.fillStyle = '#475569';
    bctx.font = "italic 24px 'Poppins', sans-serif";
    bctx.fillText('Authorized Signature Specimen', 70, 415);

    // Barcode Mock
    bctx.fillStyle = '#0f172a';
    for (let x = 600; x < 960; x += 10) {
        const barW = (x % 20 === 0) ? 6 : 3;
        bctx.fillRect(x, 360, barW, 90);
    }

    // Back Security Specimen Strip
    bctx.fillStyle = '#dc2626';
    bctx.fillRect(0, 560, 1011, 78);
    bctx.fillStyle = '#ffffff';
    bctx.font = "bold 26px 'Poppins', sans-serif";
    bctx.textAlign = 'center';
    bctx.fillText('★ SAMPLE / NOT VALID FOR IDENTIFICATION ★', 505, 610);

    // Convert sample canvases to Image objects
    const frontImg = new Image();
    frontImg.onload = () => {
        imageRegistry.front = frontImg;
        state.front.name = 'sample_specimen_front.png';
        state.front.dimsStr = '1011 × 638 px';
        state.front.sizeStr = '340 KB';
        updateCardUploadUI('front');

        const backImg = new Image();
        backImg.onload = () => {
            imageRegistry.back = backImg;
            state.back.name = 'sample_specimen_back.png';
            state.back.dimsStr = '1011 × 638 px';
            state.back.sizeStr = '290 KB';
            updateCardUploadUI('back');

            showToast('Sample specimen cards loaded successfully!', 'success');
            requestRender();
        };
        backImg.src = backCanvas.toDataURL('image/png');
    };
    frontImg.src = frontCanvas.toDataURL('image/png');
}

// ==========================================================================
// 9. EXPORT ENGINE: PDF, JPG, PNG & PRINT
// ==========================================================================

function getExportFilename(extension) {
    const raw = DOM.exportFilename.value.trim();
    const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_') || `ID_Card_Specimen_A4_${state.outputDpi}DPI`;
    return `${clean}.${extension}`;
}

/**
 * High-Precision Vector / Raster jsPDF Exporter
 * Preserves 100% physical millimeters: 210 × 297 mm
 */
function exportPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('jsPDF library failed to load from CDN. Check connection.', 'error');
        return;
    }

    showToast('Generating millimeter-accurate PDF...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const orientation = state.paperOrientation === 'portrait' ? 'p' : 'l';

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        // Ensure canvas is rendered at full output resolution
        renderAll();

        const imgData = masterCanvas.toDataURL('image/jpeg', 0.95);

        // Place image using exact physical millimeter dimensions
        pdf.addImage(
            imgData,
            'JPEG',
            0,
            0,
            state.paperWidthMm,
            state.paperHeightMm,
            undefined,
            'FAST'
        );

        const filename = getExportFilename('pdf');
        pdf.save(filename);

        showToast(`PDF saved as "${filename}"`, 'success');
    } catch (err) {
        console.error('PDF Export Error:', err);
        showToast('PDF generation failed: ' + err.message, 'error');
    }
}

/**
 * High-Resolution JPG / PNG Exporter
 */
function exportImage(format) {
    showToast(`Generating high-resolution ${format.toUpperCase()} image...`, 'info');

    try {
        renderAll();

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'png' ? undefined : 0.96;

        masterCanvas.toBlob((blob) => {
            if (!blob) {
                showToast('Failed to generate image blob.', 'error');
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getExportFilename(format === 'png' ? 'png' : 'jpg');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`${format.toUpperCase()} exported successfully!`, 'success');
        }, mimeType, quality);

    } catch (err) {
        console.error('Image Export Error:', err);
        showToast('Image export failed: ' + err.message, 'error');
    }
}

/**
 * Open 1:1 Scale Print Checklist Modal
 */
function openPrintDialog() {
    DOM.printModal.style.display = 'flex';
}

function closePrintDialog() {
    DOM.printModal.style.display = 'none';
}

function triggerBrowserPrint() {
    closePrintDialog();
    showToast('Preparing 1:1 scale print sheet...', 'info');

    renderAll();

    masterCanvas.toBlob((blob) => {
        if (!blob) {
            showToast('Failed to prepare print canvas.', 'error');
            return;
        }

        const url = URL.createObjectURL(blob);
        DOM.printImage.onload = () => {
            setTimeout(() => {
                window.print();
                URL.revokeObjectURL(url);
            }, 300);
        };
        DOM.printImage.src = url;
    }, 'image/png');
}

// ==========================================================================
// 10. BATCH MODE PROCESSING ENGINE
// ==========================================================================

function toggleBatchMode() {
    if (state.mode === 'single') {
        state.mode = 'batch';
        DOM.singleModeSection.style.display = 'none';
        DOM.batchModeSection.style.display = 'block';
        DOM.batchBtnText.textContent = 'Single Mode';
        DOM.btnToggleBatch.classList.add('btn-primary');
        DOM.btnToggleBatch.classList.remove('btn-outline');
        showToast('Switched to Batch Specimen Mode.', 'info');
    } else {
        state.mode = 'single';
        DOM.singleModeSection.style.display = 'block';
        DOM.batchModeSection.style.display = 'none';
        DOM.batchBtnText.textContent = 'Batch Mode';
        DOM.btnToggleBatch.classList.remove('btn-primary');
        DOM.btnToggleBatch.classList.add('btn-outline');
        showToast('Switched to Single Card Mode.', 'info');
    }
}

function handleBatchFiles(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    showToast(`Processing ${files.length} uploaded files for batch queue...`, 'info');

    // Group files by pairing heuristics (e.g. card1_front / card1_back or sequential pairs)
    const pairsMap = {};

    files.forEach(file => {
        const name = file.name.toLowerCase();
        // Remove front/back/_/- markers to get card base name key
        const baseKey = name
            .replace(/[_-]?(front|back|f|b|side1|side2)[_-]?/gi, '')
            .replace(/\.[^/.]+$/, '');

        if (!pairsMap[baseKey]) {
            pairsMap[baseKey] = { front: null, back: null };
        }

        if (name.includes('back') || name.includes('_b.') || name.includes('-b.')) {
            pairsMap[baseKey].back = file;
        } else if (name.includes('front') || name.includes('_f.') || name.includes('-f.')) {
            pairsMap[baseKey].front = file;
        } else {
            // Default first to front, then back
            if (!pairsMap[baseKey].front) {
                pairsMap[baseKey].front = file;
            } else {
                pairsMap[baseKey].back = file;
            }
        }
    });

    // Populate Batch Queue
    Object.keys(pairsMap).forEach((key, index) => {
        const item = pairsMap[key];
        state.batchQueue.push({
            id: 'batch_' + Date.now() + '_' + index,
            baseName: key,
            frontFile: item.front,
            backFile: item.back,
            frontImg: null,
            backImg: null,
            status: (item.front && item.back) ? 'Ready' : (item.front ? 'Missing Back' : 'Missing Front')
        });
    });

    renderBatchTable();
    updateBatchButtons();
    DOM.batchFileInput.value = '';
}

function renderBatchTable() {
    if (state.batchQueue.length === 0) {
        DOM.batchTableBody.innerHTML = `<tr><td colspan="5" class="empty-table-msg">No batch items loaded. Click above to add card images.</td></tr>`;
        return;
    }

    DOM.batchTableBody.innerHTML = '';
    state.batchQueue.forEach((item, index) => {
        const tr = document.createElement('tr');

        const isReady = item.frontFile && item.backFile;
        const statusClass = isReady ? 'batch-status-ready' : 'batch-status-missing';
        const statusIcon = isReady ? '<i class="fa-solid fa-check-circle"></i> Ready' : '<i class="fa-solid fa-triangle-exclamation"></i> ' + item.status;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.frontFile ? item.frontFile.name : '<span class="text-danger">None</span>'}</strong></td>
            <td><strong>${item.backFile ? item.backFile.name : '<span class="text-danger">None</span>'}</strong></td>
            <td class="${statusClass}">${statusIcon}</td>
            <td>
                <button class="btn btn-xs btn-outline" onclick="loadBatchItemToPreview(${index})" title="Preview this card pair">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn btn-xs btn-danger-outline" onclick="removeBatchItem(${index})" title="Remove item">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        DOM.batchTableBody.appendChild(tr);
    });
}

window.loadBatchItemToPreview = function(index) {
    const item = state.batchQueue[index];
    if (!item) return;

    if (item.frontFile) {
        processCardFile('front', item.frontFile);
    }
    if (item.backFile) {
        processCardFile('back', item.backFile);
    }

    showToast(`Loaded item #${index + 1} (${item.baseName}) into single preview.`, 'info');
};

window.removeBatchItem = function(index) {
    state.batchQueue.splice(index, 1);
    renderBatchTable();
    updateBatchButtons();
};

function clearBatchQueue() {
    state.batchQueue = [];
    renderBatchTable();
    updateBatchButtons();
    showToast('Batch queue cleared.', 'info');
}

function updateBatchButtons() {
    const readyItems = state.batchQueue.filter(i => i.frontFile && i.backFile);
    const hasReady = readyItems.length > 0;

    DOM.btnExportBatchZip.disabled = !hasReady;
    DOM.btnExportBatchPdf.disabled = !hasReady;
}

/**
 * Generate Multi-Page PDF from Batch Queue
 */
async function exportBatchPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('jsPDF library missing.', 'error');
        return;
    }

    const readyItems = state.batchQueue.filter(i => i.frontFile && i.backFile);
    if (readyItems.length === 0) {
        showToast('No ready front & back pairs in batch queue.', 'error');
        return;
    }

    showToast(`Generating multi-page PDF for ${readyItems.length} specimen sheets...`, 'info');

    try {
        const { jsPDF } = window.jspdf;
        const orientation = state.paperOrientation === 'portrait' ? 'p' : 'l';
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        for (let i = 0; i < readyItems.length; i++) {
            const item = readyItems[i];
            const frontImg = await loadImageFromFile(item.frontFile);
            const backImg = await loadImageFromFile(item.backFile);

            // Temporarily mount images in registry to render
            imageRegistry.front = frontImg;
            imageRegistry.back = backImg;
            renderAll();

            const imgData = masterCanvas.toDataURL('image/jpeg', 0.95);

            if (i > 0) {
                pdf.addPage('a4', orientation);
            }

            pdf.addImage(imgData, 'JPEG', 0, 0, state.paperWidthMm, state.paperHeightMm, undefined, 'FAST');
        }

        const filename = `Batch_ID_Specimens_${readyItems.length}_Pages.pdf`;
        pdf.save(filename);
        showToast(`Batch PDF saved (${readyItems.length} pages)!`, 'success');

    } catch (err) {
        console.error('Batch PDF Error:', err);
        showToast('Batch PDF generation failed: ' + err.message, 'error');
    }
}

/**
 * Generate ZIP containing all rendered A4 JPG specimen sheets
 */
async function exportBatchZip() {
    if (!window.JSZip) {
        showToast('JSZip library missing.', 'error');
        return;
    }

    const readyItems = state.batchQueue.filter(i => i.frontFile && i.backFile);
    if (readyItems.length === 0) {
        showToast('No ready front & back pairs in batch queue.', 'error');
        return;
    }

    showToast(`Packaging ${readyItems.length} specimen sheets into ZIP...`, 'info');

    try {
        const zip = new JSZip();

        for (let i = 0; i < readyItems.length; i++) {
            const item = readyItems[i];
            const frontImg = await loadImageFromFile(item.frontFile);
            const backImg = await loadImageFromFile(item.backFile);

            imageRegistry.front = frontImg;
            imageRegistry.back = backImg;
            renderAll();

            const dataUrl = masterCanvas.toDataURL('image/jpeg', 0.95);
            const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

            const sheetName = `Specimen_Sheet_${String(i + 1).padStart(2, '0')}_${item.baseName}.jpg`;
            zip.file(sheetName, base64Data, { base64: true });
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ID_Card_Specimens_Batch_${readyItems.length}_Sheets.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`ZIP package downloaded successfully!`, 'success');

    } catch (err) {
        console.error('Batch ZIP Error:', err);
        showToast('Batch ZIP export failed: ' + err.message, 'error');
    }
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==========================================================================
// 11. UTILITY FUNCTIONS & HELPERS
// ==========================================================================

function resetTool() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    imageRegistry.front = null;
    imageRegistry.back = null;

    DOM.inputFront.value = '';
    DOM.inputBack.value = '';

    updateCardUploadUI('front');
    updateCardUploadUI('back');

    // Restore UI Inputs
    DOM.cardPresetSelect.value = 'id1';
    DOM.customCardDims.style.display = 'none';
    DOM.cardCustomWidth.value = '85.60';
    DOM.cardCustomHeight.value = '53.98';
    DOM.cardResizeMode.value = 'cover';
    DOM.cardBorderRadius.value = '3.18';

    DOM.paperOrientation.value = 'portrait';
    DOM.outputDpi.value = '300';
    DOM.topMarginMm.value = '25';
    DOM.cardGapMm.value = '5';
    DOM.cuttingGuideStyle.value = 'dashed';
    DOM.guideColor.value = '#94a3b8';

    DOM.watermarkPlacement.value = 'bottom_banner';
    DOM.watermarkColor.value = 'crimson';
    DOM.watermarkOpacity.value = '70';
    DOM.watermarkOpacityVal.textContent = '70%';
    DOM.watermarkSize.value = '100';
    DOM.watermarkSizeVal.textContent = '100%';

    DOM.exportFilename.value = 'ID_Card_Specimen_A4_300DPI';

    clearBatchQueue();
    setPreviewZoom(1.0);
    // Reset Aadhaar PDF state and return to Image mode
    resetAadhaarState();
    updateHUD();
    requestRender(true);

    showToast('Tool and all settings reset to defaults.', 'info');
}

/**
 * Custom Canvas Rounded Rectangle Path Helper
 */
function roundRectPath(ctx, x, y, width, height, radius) {
    radius = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================================================
// 12. AADHAAR PDF MODE
//     "PDF Input Adapter" — renders PDF pages into imageRegistry so the
//     existing drawCard / calculateLayout / exportPDF engine needs no changes.
// ==========================================================================

// --- Aadhaar State (separate from DEFAULT_STATE to avoid interference) -----

let sourceMode = 'image'; // 'image' | 'aadhaarPdf'

let aadhaarState = {
    file: null,
    name: '',
    pageCount: 0,
    printMode: 'frontback',       // 'single' | 'frontback' (default: frontback)
    selectedFrontPage: 1,
    selectedBackPage: 1,
    renderedFrontImg: null,
    renderedBackImg: null
};

// --- PDF.js Worker config (CDN worker, matches the CDN version) -----------

const PDFJS_WORKER_SRC =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- Additional DOM references for Aadhaar UI ----------------------------

const ADOM = {};

function initAadhaarDOM() {
    ADOM.srcTabImage     = document.getElementById('srcTabImage');
    ADOM.srcTabAadhaar   = document.getElementById('srcTabAadhaar');
    ADOM.aadhaarPanel    = document.getElementById('aadhaarPanel');

    // Image-mode upload section (the existing Card Images panel-section)
    // We locate it via the existing DOM.frontDropZone's closest .panel-section
    ADOM.imageUploadSection = DOM.frontDropZone
        ? DOM.frontDropZone.closest('.panel-section')
        : null;

    ADOM.aadhaarDropZone     = document.getElementById('aadhaarDropZone');
    ADOM.aadhaarDropContent  = document.getElementById('aadhaarDropContent');
    ADOM.aadhaarFileInput    = document.getElementById('aadhaarFileInput');
    ADOM.aadhaarFileInfo     = document.getElementById('aadhaarFileInfo');
    ADOM.aadhaarFileName     = document.getElementById('aadhaarFileName');
    ADOM.aadhaarFilePages    = document.getElementById('aadhaarFilePages');
    ADOM.btnRemoveAadhaar    = document.getElementById('btnRemoveAadhaar');

    ADOM.aadhaarLoading      = document.getElementById('aadhaarLoading');
    ADOM.aadhaarLoadingText  = document.getElementById('aadhaarLoadingText');

    ADOM.aadhaarPageGrid     = document.getElementById('aadhaarPageGrid');
    ADOM.aadhaarPageThumbs   = document.getElementById('aadhaarPageThumbs');

    ADOM.aadhaarPrintModeSection = document.getElementById('aadhaarPrintModeSection');
    ADOM.pdfModeSingle           = document.getElementById('pdfModeSingle');
    ADOM.pdfModeFrontBack        = document.getElementById('pdfModeFrontBack');

    ADOM.aadhaarSinglePageRow   = document.getElementById('aadhaarSinglePageRow');
    ADOM.aadhaarFrontBackRows   = document.getElementById('aadhaarFrontBackRows');
    ADOM.aadhaarFrontPageSelect  = document.getElementById('aadhaarFrontPageSelect');
    ADOM.aadhaarFrontPageSelect2 = document.getElementById('aadhaarFrontPageSelect2');
    ADOM.aadhaarBackPageSelect   = document.getElementById('aadhaarBackPageSelect');

    ADOM.btnAutoCrop              = document.getElementById('btnAutoCropAadhaar');
    ADOM.btnApplyAadhaar          = document.getElementById('btnApplyAadhaar');
    ADOM.btnResetAadhaarPosition  = document.getElementById('btnResetAadhaarPosition');
    ADOM.btnOpenManualCropAlert   = document.getElementById('btnOpenManualCropAlert');
    ADOM.btnResetAadhaarCropCoords = document.getElementById('btnResetAadhaarCropCoords');
    ADOM.btnApplyCustomAadhaarCrop = document.getElementById('btnApplyCustomAadhaarCrop');

    // Configure PDF.js worker now that the DOM + scripts are ready
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
    }
}

// --- Event Binding --------------------------------------------------------

function bindAadhaarEvents() {
    // Source type tabs
    ADOM.srcTabImage.addEventListener('click', () => switchSourceMode('image'));
    ADOM.srcTabAadhaar.addEventListener('click', () => switchSourceMode('aadhaarPdf'));

    // PDF file picker
    ADOM.aadhaarFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleAadhaarFileSelect(file);
        e.target.value = ''; // reset so same file can be re-selected
    });

    // PDF drag & drop
    ['dragenter', 'dragover'].forEach(ev => {
        ADOM.aadhaarDropZone.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            ADOM.aadhaarDropZone.classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach(ev => {
        ADOM.aadhaarDropZone.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            ADOM.aadhaarDropZone.classList.remove('dragover');
        });
    });
    ADOM.aadhaarDropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleAadhaarFileSelect(file);
    });

    // Remove PDF
    ADOM.btnRemoveAadhaar.addEventListener('click', (e) => {
        e.stopPropagation();
        clearAadhaarPdf();
    });

    // Print mode toggle
    ADOM.pdfModeSingle.addEventListener('click', () => setAadhaarPrintMode('single'));
    ADOM.pdfModeFrontBack.addEventListener('click', () => setAadhaarPrintMode('frontback'));

    // Page selector changes — update thumbnail highlights
    ADOM.aadhaarFrontPageSelect.addEventListener('change', () => {
        aadhaarState.selectedFrontPage = parseInt(ADOM.aadhaarFrontPageSelect.value, 10);
        updateThumbnailHighlights();
    });
    ADOM.aadhaarFrontPageSelect2.addEventListener('change', () => {
        aadhaarState.selectedFrontPage = parseInt(ADOM.aadhaarFrontPageSelect2.value, 10);
        updateThumbnailHighlights();
    });
    ADOM.aadhaarBackPageSelect.addEventListener('change', () => {
        aadhaarState.selectedBackPage = parseInt(ADOM.aadhaarBackPageSelect.value, 10);
        updateThumbnailHighlights();
    });

    // Auto Crop & Apply buttons
    ADOM.btnAutoCrop?.addEventListener('click', () => {
        setAadhaarPrintMode('frontback');
        autoCropAadhaarPanels({ silent: false, forceBoth: true });
    });
    ADOM.btnApplyAadhaar?.addEventListener('click', () => autoCropAadhaarPanels({ silent: false }));
    ADOM.btnOpenManualCropAlert?.addEventListener('click', () => openCropModal(aadhaarState.selectedFrontPage || 1));
    ADOM.btnResetAadhaarCropCoords?.addEventListener('click', _resetAadhaarCropInputs);
    ADOM.btnApplyCustomAadhaarCrop?.addEventListener('click', () => autoCropAadhaarPanels({ silent: false }));

    // Quick reset Aadhaar position
    ADOM.btnResetAadhaarPosition.addEventListener('click', () => {
        resetCardTweaks('front', false);
        resetCardTweaks('back', false);
        requestRender();
        showToast('Aadhaar card position reset.', 'info');
    });
}

// --- Source Mode Switch ---------------------------------------------------

function switchSourceMode(mode) {
    sourceMode = mode;

    const isAadhaar = (mode === 'aadhaarPdf');

    // Update tab active states
    ADOM.srcTabImage.classList.toggle('active', !isAadhaar);
    ADOM.srcTabAadhaar.classList.toggle('active', isAadhaar);

    // Show / hide panels
    if (ADOM.imageUploadSection) {
        ADOM.imageUploadSection.style.display = isAadhaar ? 'none' : '';
    }
    ADOM.aadhaarPanel.style.display = isAadhaar ? '' : 'none';

    if (!isAadhaar) {
        // Returning to image mode — clear aadhaar-injected images if present
        if (aadhaarState.renderedFrontImg || aadhaarState.renderedBackImg) {
            imageRegistry.front = null;
            imageRegistry.back  = null;
            updateCardUploadUI('front');
            updateCardUploadUI('back');
            aadhaarState.renderedFrontImg = null;
            aadhaarState.renderedBackImg  = null;
            requestRender();
        }
    }
}

// --- PDF Loading ----------------------------------------------------------

async function handleAadhaarFileSelect(file) {
    showLoading('Loading PDF...');

    try {
        const result = await AadhaarPDF.load(file, {
            onPasswordNeeded: _onPasswordNeeded
        });

        aadhaarState.file      = file;
        aadhaarState.name      = file.name;
        aadhaarState.pageCount = result.pageCount;
        aadhaarState.printMode = 'frontback';
        aadhaarState.selectedFrontPage = 1;
        aadhaarState.selectedBackPage  = (result.pageCount >= 2) ? 2 : 1;

        // Update file info display
        ADOM.aadhaarDropContent.style.display = 'none';
        ADOM.aadhaarFileInfo.style.display    = '';
        ADOM.aadhaarFileName.textContent  = file.name;
        ADOM.aadhaarFilePages.textContent = `Pages: ${result.pageCount}`;

        // Populate page selectors
        populatePageSelectors(result.pageCount);

        showLoading('Rendering thumbnails...');

        // Render thumbnails in sequence (not parallel, to avoid OOM on large PDFs)
        await renderAadhaarThumbnails(result.pageCount);

        hideLoading();

        // Show grid and print mode section
        ADOM.aadhaarPageGrid.style.display        = '';
        ADOM.aadhaarPrintModeSection.style.display = '';

        // Ensure Front + Back mode is active in UI
        setAadhaarPrintMode('frontback');

        // Immediately auto-crop bottom panels into Front & Back ID cards
        await autoCropAadhaarPanels({ silent: true, forceBoth: true });

        if (DOM.canvasViewport) {
            DOM.canvasViewport.scrollTop = 0;
            DOM.canvasViewport.scrollLeft = 0;
        }

        showToast(`PDF loaded — Auto-cropped Aadhaar panels into Front & Back cards!`, 'success');

    } catch (err) {
        hideLoading();
        clearAadhaarPdf(true); // silent clear
        showToast(err.message || 'Failed to load PDF.', 'error');
        console.error('[AadhaarPDF] Load error:', err);
    }
}

async function renderAadhaarThumbnails(pageCount) {
    ADOM.aadhaarPageThumbs.innerHTML = '';

    for (let p = 1; p <= pageCount; p++) {
        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'pdf-page-thumb';
        thumbWrapper.dataset.page = p;

        // Placeholder while rendering
        thumbWrapper.innerHTML = `
            <div style="height:80px;display:flex;align-items:center;justify-content:center;color:#94a3b8;">
                <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            <div class="pdf-page-thumb-label">Page ${p}</div>
        `;
        ADOM.aadhaarPageThumbs.appendChild(thumbWrapper);

        // Click to select
        thumbWrapper.addEventListener('click', () => onThumbnailClick(p));

        // Render thumbnail asynchronously
        try {
            const img = await AadhaarPDF.renderThumbnail(p, 110);
            thumbWrapper.innerHTML = `
                <img src="${img.src}" alt="Page ${p}">
                <div class="pdf-page-thumb-label">Page ${p}</div>
                <button class="thumb-crop-btn" title="Crop this page"><i class="fa-solid fa-crop-simple"></i> Crop</button>
            `;
            // Re-attach click + crop listeners after innerHTML reset
            thumbWrapper.addEventListener('click', (e) => {
                if (!e.target.closest('.thumb-crop-btn')) onThumbnailClick(p);
            });
            const cropBtn = thumbWrapper.querySelector('.thumb-crop-btn');
            if (cropBtn) cropBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCropModal(p);
            });
        } catch (e) {
            thumbWrapper.innerHTML = `
                <div style="height:80px;display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:0.7rem;">Error</div>
                <div class="pdf-page-thumb-label">Page ${p}</div>
            `;
        }
    }

    updateThumbnailHighlights();
}

function onThumbnailClick(pageNum) {
    if (aadhaarState.printMode === 'single') {
        aadhaarState.selectedFrontPage = pageNum;
        ADOM.aadhaarFrontPageSelect.value = pageNum;
    } else {
        // In front+back mode: first click sets front, second click sets back
        if (pageNum !== aadhaarState.selectedFrontPage) {
            aadhaarState.selectedBackPage = pageNum;
            ADOM.aadhaarBackPageSelect.value = pageNum;
            if (ADOM.aadhaarFrontPageSelect2) ADOM.aadhaarFrontPageSelect2.value = aadhaarState.selectedFrontPage;
        } else {
            aadhaarState.selectedFrontPage = pageNum;
            if (ADOM.aadhaarFrontPageSelect2) ADOM.aadhaarFrontPageSelect2.value = pageNum;
        }
    }
    updateThumbnailHighlights();
}

function updateThumbnailHighlights() {
    const thumbs = ADOM.aadhaarPageThumbs.querySelectorAll('.pdf-page-thumb');
    thumbs.forEach(thumb => {
        const p = parseInt(thumb.dataset.page, 10);
        thumb.classList.remove('selected-front', 'selected-back');

        // Remove existing badges
        const existing = thumb.querySelectorAll('.thumb-selection-badge');
        existing.forEach(b => b.remove());

        if (aadhaarState.printMode === 'single') {
            if (p === aadhaarState.selectedFrontPage) {
                thumb.classList.add('selected-front');
                const badge = document.createElement('span');
                badge.className = 'thumb-selection-badge badge-front';
                badge.textContent = 'Front Only';
                thumb.appendChild(badge);
            }
        } else {
            if (p === aadhaarState.selectedFrontPage && p === aadhaarState.selectedBackPage) {
                thumb.classList.add('selected-front');
                const badge = document.createElement('span');
                badge.className = 'thumb-selection-badge badge-front';
                badge.textContent = 'Front + Back';
                thumb.appendChild(badge);
            } else if (p === aadhaarState.selectedFrontPage) {
                thumb.classList.add('selected-front');
                const badge = document.createElement('span');
                badge.className = 'thumb-selection-badge badge-front';
                badge.textContent = 'Front';
                thumb.appendChild(badge);
            } else if (p === aadhaarState.selectedBackPage) {
                thumb.classList.add('selected-back');
                const badge = document.createElement('span');
                badge.className = 'thumb-selection-badge badge-back';
                badge.textContent = 'Back';
                thumb.appendChild(badge);
            }
        }
    });
}

function populatePageSelectors(pageCount) {
    const selectors = [
        ADOM.aadhaarFrontPageSelect,
        ADOM.aadhaarFrontPageSelect2,
        ADOM.aadhaarBackPageSelect
    ];

    selectors.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        for (let p = 1; p <= pageCount; p++) {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = `Page ${p}`;
            sel.appendChild(opt);
        }
    });

    ADOM.aadhaarFrontPageSelect.value  = 1;
    ADOM.aadhaarFrontPageSelect2.value = 1;
    ADOM.aadhaarBackPageSelect.value   = Math.min(2, pageCount);
}

function setAadhaarPrintMode(mode) {
    aadhaarState.printMode = mode;

    const isFrontBack = (mode === 'frontback');

    ADOM.pdfModeSingle.classList.toggle('active', !isFrontBack);
    ADOM.pdfModeFrontBack.classList.toggle('active', isFrontBack);

    ADOM.aadhaarSinglePageRow.style.display   = isFrontBack ? 'none' : '';
    ADOM.aadhaarFrontBackRows.style.display   = isFrontBack ? '' : 'none';

    // Sync selectedBackPage from select when switching to front+back
    if (isFrontBack) {
        aadhaarState.selectedBackPage = parseInt(ADOM.aadhaarBackPageSelect?.value, 10) || (aadhaarState.pageCount >= 2 ? 2 : 1);
        if (aadhaarState.renderedBackImg) {
            imageRegistry.back = aadhaarState.renderedBackImg;
            state.back.name    = `${aadhaarState.name} — Back Panel`;
            state.back.dimsStr = `${aadhaarState.renderedBackImg.naturalWidth} \u00d7 ${aadhaarState.renderedBackImg.naturalHeight} px`;
            updateCardUploadUI('back');
        }
    } else {
        imageRegistry.back = null;
        state.back.name    = '';
        state.back.dimsStr = '';
        state.back.sizeStr = '';
        updateCardUploadUI('back');
    }

    const backPreviewCard = document.getElementById('aadhaarBackPreviewCard');
    if (backPreviewCard) {
        backPreviewCard.style.display = isFrontBack ? 'flex' : 'none';
        if (isFrontBack && aadhaarState.renderedBackImg) {
            const backPreviewImg = document.getElementById('aadhaarBackPreviewImg');
            if (backPreviewImg) backPreviewImg.src = aadhaarState.renderedBackImg.src;
            const backDimsBadge = document.getElementById('aadhaarBackDimsBadge');
            if (backDimsBadge) backDimsBadge.textContent = `${aadhaarState.renderedBackImg.naturalWidth} \u00d7 ${aadhaarState.renderedBackImg.naturalHeight} px`;
        }
    }

    updateThumbnailHighlights();
    requestRender();
}

// --- Auto-Crop Aadhaar Bottom Panels (Exact Template Geometry) ---------

async function autoCropAadhaarPanels(options = {}) {
    if (!aadhaarState.file) {
        if (!options.silent) showToast('No Aadhaar PDF loaded.', 'error');
        return;
    }

    const frontPage = aadhaarState.selectedFrontPage || 1;
    const backPage  = (aadhaarState.printMode === 'single') ? frontPage : (aadhaarState.selectedBackPage || 1);

    // Read coordinates from inputs (defaults or user-adjusted)
    const customCrops = {
        front: {
            x: parseFloat(document.getElementById('cropFrontX')?.value) || 47.7,
            y: parseFloat(document.getElementById('cropFrontY')?.value) || 569.25,
            width: parseFloat(document.getElementById('cropFrontW')?.value) || 253.575,
            height: parseFloat(document.getElementById('cropFrontH')?.value) || 165.15
        },
        back: {
            x: parseFloat(document.getElementById('cropBackX')?.value) || 311.25,
            y: parseFloat(document.getElementById('cropBackY')?.value) || 569.25,
            width: parseFloat(document.getElementById('cropBackW')?.value) || 253.575,
            height: parseFloat(document.getElementById('cropBackH')?.value) || 165.15
        }
    };

    const dpi = 600; // Ultra HD for pristine vector clarity

    showLoading('Auto-cropping Aadhaar bottom panels at 600 DPI...');
    if (ADOM.btnAutoCrop) ADOM.btnAutoCrop.disabled = true;
    if (ADOM.btnApplyAadhaar) ADOM.btnApplyAadhaar.disabled = true;

    try {
        let frontImg, backImg, frontDims, backDims;
        let isTemplateMatched = false;
        let pdfWidth = 612, pdfHeight = 792;

        if (frontPage === backPage) {
            const result = await AadhaarPDF.extractAadhaarPanels(frontPage, customCrops, dpi);
            isTemplateMatched = result.isTemplateMatched;
            pdfWidth = result.pdfWidth;
            pdfHeight = result.pdfHeight;
            frontImg = result.front.img;
            frontDims = `${result.front.width} × ${result.front.height} px`;
            backImg = result.back.img;
            backDims = `${result.back.width} × ${result.back.height} px`;
        } else {
            const resFront = await AadhaarPDF.extractAadhaarPanels(frontPage, customCrops, dpi);
            const resBack  = await AadhaarPDF.extractAadhaarPanels(backPage, customCrops, dpi);
            isTemplateMatched = resFront.isTemplateMatched;
            pdfWidth = resFront.pdfWidth;
            pdfHeight = resFront.pdfHeight;
            frontImg = resFront.front.img;
            frontDims = `${resFront.front.width} × ${resFront.front.height} px`;
            backImg = resBack.back.img;
            backDims = `${resBack.back.width} × ${resBack.back.height} px`;
        }

        // Update Template Detection UI
        const nameEl = document.getElementById('aadhaarTemplateName');
        const alertEl = document.getElementById('aadhaarLayoutMismatchAlert');
        const mismatchTextEl = document.getElementById('aadhaarMismatchText');

        if (isTemplateMatched) {
            if (nameEl) nameEl.textContent = '612 × 792 pt (Auto-Detected Template)';
            if (alertEl) alertEl.style.display = 'none';
        } else {
            if (nameEl) nameEl.textContent = `${Math.round(pdfWidth)} × ${Math.round(pdfHeight)} pt`;
            if (alertEl) alertEl.style.display = 'flex';
            if (mismatchTextEl) mismatchTextEl.textContent = `Different Aadhaar PDF layout detected (${Math.round(pdfWidth)} × ${Math.round(pdfHeight)} pt).`;
        }

        // Always cache both rendered images in aadhaarState
        aadhaarState.renderedFrontImg = frontImg;
        aadhaarState.renderedBackImg  = backImg;

        // Front Panel
        imageRegistry.front = frontImg;
        state.front.name    = `${aadhaarState.name} — Front Panel`;
        state.front.dimsStr = frontDims;
        state.front.sizeStr = '';
        updateCardUploadUI('front');

        // Back Panel
        const isSingle = (aadhaarState.printMode === 'single' && !options.forceBoth);
        if (isSingle) {
            imageRegistry.back = null;
            state.back.name    = '';
            state.back.dimsStr = '';
            state.back.sizeStr = '';
            updateCardUploadUI('back');
        } else {
            imageRegistry.back = backImg;
            state.back.name    = `${aadhaarState.name} — Back Panel`;
            state.back.dimsStr = backDims;
            state.back.sizeStr = '';
            updateCardUploadUI('back');
        }

        // Ensure standard ID-1 card dimensions and fit/contain mode (do NOT stretch)
        state.cardResizeMode = 'contain';
        if (DOM.cardResizeMode) DOM.cardResizeMode.value = 'contain';
        state.cardPreset = 'id1';
        if (DOM.cardPresetSelect) DOM.cardPresetSelect.value = 'id1';
        if (DOM.customCardDims) DOM.customCardDims.style.display = 'none';
        state.cardWidthMm = 85.60;
        state.cardHeightMm = 53.98;
        updateHUD();

        // Update Bottom Panels Preview
        const panelsPreview = document.getElementById('aadhaarPanelsPreview');
        const frontPreviewImg = document.getElementById('aadhaarFrontPreviewImg');
        const backPreviewImg = document.getElementById('aadhaarBackPreviewImg');
        const backPreviewCard = document.getElementById('aadhaarBackPreviewCard');
        const frontDimsBadge = document.getElementById('aadhaarFrontDimsBadge');
        const backDimsBadge = document.getElementById('aadhaarBackDimsBadge');

        if (panelsPreview) panelsPreview.style.display = 'block';
        if (frontPreviewImg && frontImg) frontPreviewImg.src = frontImg.src;
        if (frontDimsBadge && frontImg) frontDimsBadge.textContent = `${frontImg.naturalWidth} \u00d7 ${frontImg.naturalHeight} px`;

        if (backPreviewCard) {
            if (isSingle) {
                backPreviewCard.style.display = 'none';
            } else {
                backPreviewCard.style.display = 'flex';
                if (backPreviewImg && backImg) backPreviewImg.src = backImg.src;
                if (backDimsBadge && backImg) backDimsBadge.textContent = `${backImg.naturalWidth} \u00d7 ${backImg.naturalHeight} px`;
            }
        }

        hideLoading();
        requestRender();

        if (DOM.canvasViewport) {
            DOM.canvasViewport.scrollTop = 0;
            DOM.canvasViewport.scrollLeft = 0;
        }

        if (!options.silent) {
            showToast('Aadhaar bottom panels auto-cropped into Front & Back cards!', 'success');
        }
    } catch (err) {
        hideLoading();
        console.error('[Aadhaar Auto-Crop] Error:', err);
        showToast('Auto crop failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
        if (ADOM.btnAutoCrop) ADOM.btnAutoCrop.disabled = false;
        if (ADOM.btnApplyAadhaar) ADOM.btnApplyAadhaar.disabled = false;
    }
}

// Reset custom coordinate input boxes to default template points
function _resetAadhaarCropInputs() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('cropFrontX', '47.7');
    setVal('cropFrontY', '569.25');
    setVal('cropFrontW', '253.575');
    setVal('cropFrontH', '165.15');
    setVal('cropBackX',  '311.25');
    setVal('cropBackY',  '569.25');
    setVal('cropBackW',  '253.575');
    setVal('cropBackH',  '165.15');
    showToast('Aadhaar crop coordinates reset to template defaults.', 'info');
}

async function applyAadhaarToCard() {
    return autoCropAadhaarPanels({ silent: false });
}

// --- Clear PDF -----------------------------------------------------------

function clearAadhaarPdf(silent) {
    AadhaarPDF.cleanup();

    aadhaarState.file              = null;
    aadhaarState.name              = '';
    aadhaarState.pageCount         = 0;
    aadhaarState.selectedFrontPage = 1;
    aadhaarState.selectedBackPage  = 1;
    aadhaarState.renderedFrontImg  = null;
    aadhaarState.renderedBackImg   = null;
    aadhaarState.printMode         = 'frontback';

    // Clear injected images from registry
    if (imageRegistry.front && imageRegistry.front === aadhaarState.renderedFrontImg) {
        imageRegistry.front = null;
    }
    if (imageRegistry.back && imageRegistry.back === aadhaarState.renderedBackImg) {
        imageRegistry.back = null;
    }
    // Safe clear — always clear both when removing PDF
    imageRegistry.front = null;
    imageRegistry.back  = null;
    updateCardUploadUI('front');
    updateCardUploadUI('back');

    // Reset UI
    ADOM.aadhaarDropContent.style.display     = '';
    ADOM.aadhaarFileInfo.style.display        = 'none';
    ADOM.aadhaarPageGrid.style.display        = 'none';
    ADOM.aadhaarPrintModeSection.style.display = 'none';
    ADOM.aadhaarLoading.style.display         = 'none';
    const panelsPreview = document.getElementById('aadhaarPanelsPreview');
    if (panelsPreview) panelsPreview.style.display = 'none';
    const frontPreviewImg = document.getElementById('aadhaarFrontPreviewImg');
    if (frontPreviewImg) frontPreviewImg.src = '';
    const backPreviewImg = document.getElementById('aadhaarBackPreviewImg');
    if (backPreviewImg) backPreviewImg.src = '';
    // Close crop modal if open
    if (CDOM.overlay && CDOM.overlay.style.display !== 'none') closeCropModal();

    if (ADOM.aadhaarPageThumbs) ADOM.aadhaarPageThumbs.innerHTML = '';
    if (ADOM.aadhaarFrontPageSelect) ADOM.aadhaarFrontPageSelect.innerHTML = '';
    if (ADOM.aadhaarFrontPageSelect2) ADOM.aadhaarFrontPageSelect2.innerHTML = '';
    if (ADOM.aadhaarBackPageSelect) ADOM.aadhaarBackPageSelect.innerHTML = '';

    // Reset print mode tabs to Front + Back default
    ADOM.pdfModeSingle.classList.remove('active');
    ADOM.pdfModeFrontBack.classList.add('active');
    ADOM.aadhaarSinglePageRow.style.display = 'none';
    ADOM.aadhaarFrontBackRows.style.display = '';

    requestRender();

    if (!silent) {
        showToast('Aadhaar PDF removed.', 'info');
    }
}

function resetAadhaarState() {
    clearAadhaarPdf(true);
    switchSourceMode('image');
}

// --- Loading indicator helpers -------------------------------------------

function showLoading(text) {
    ADOM.aadhaarLoading.style.display = 'flex';
    ADOM.aadhaarLoadingText.textContent = text || 'Loading...';
}

function hideLoading() {
    ADOM.aadhaarLoading.style.display = 'none';
}

// ==========================================================================
// 13. PDF PASSWORD MODAL
// ==========================================================================

const PWDOM = {};
let _pdfPasswordResolve = null; // Holds the PDF.js updateCallback function

function initPasswordModal() {
    PWDOM.overlay      = document.getElementById('pdfPasswordOverlay');
    PWDOM.input        = document.getElementById('pdfPasswordInput');
    PWDOM.btnSubmit    = document.getElementById('btnSubmitPdfPassword');
    PWDOM.btnCancel    = document.getElementById('btnCancelPdfPassword');
    PWDOM.btnToggle    = document.getElementById('btnTogglePdfPassword');
    PWDOM.eyeIcon      = document.getElementById('pdfPasswordEyeIcon');
    PWDOM.errorMsg     = document.getElementById('pdfPasswordError');
    PWDOM.msg          = document.getElementById('pdfPasswordMsg');

    // Submit password
    PWDOM.btnSubmit.addEventListener('click', _submitPassword);

    // Cancel
    PWDOM.btnCancel.addEventListener('click', _cancelPassword);

    // Enter key submits, Escape cancels
    PWDOM.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { e.preventDefault(); _submitPassword(); }
        if (e.key === 'Escape') { e.preventDefault(); _cancelPassword(); }
    });

    // Show / hide password toggle
    PWDOM.btnToggle.addEventListener('click', () => {
        const isPassword = PWDOM.input.type === 'password';
        PWDOM.input.type = isPassword ? 'text' : 'password';
        PWDOM.eyeIcon.className = isPassword
            ? 'fa-solid fa-eye-slash'
            : 'fa-solid fa-eye';
    });

    // Click outside modal card to cancel
    PWDOM.overlay.addEventListener('click', (e) => {
        if (e.target === PWDOM.overlay) _cancelPassword();
    });
}

function _openPasswordModal(isRetry) {
    PWDOM.input.value = '';
    PWDOM.input.type  = 'password';
    PWDOM.eyeIcon.className = 'fa-solid fa-eye';
    PWDOM.errorMsg.style.display = isRetry ? 'flex' : 'none';
    PWDOM.msg.textContent = isRetry
        ? 'Incorrect password. Please try again.'
        : 'This Aadhaar PDF is password protected. Enter the password to unlock it.';

    PWDOM.overlay.style.display = 'flex';
    setTimeout(() => PWDOM.input.focus(), 80);
}

function _closePasswordModal() {
    PWDOM.overlay.style.display = 'none';
    PWDOM.input.value = '';
    PWDOM.errorMsg.style.display = 'none';
    _pdfPasswordResolve = null;
}

function _submitPassword() {
    const pwd = PWDOM.input.value;
    if (!pwd) {
        PWDOM.input.focus();
        return;
    }
    if (typeof _pdfPasswordResolve === 'function') {
        _pdfPasswordResolve(pwd);
        _pdfPasswordResolve = null;
    }
    PWDOM.overlay.style.display = 'none';
}

function _cancelPassword() {
    if (typeof _pdfPasswordResolve === 'function') {
        _pdfPasswordResolve(''); // empty string signals cancel to PDF.js
        _pdfPasswordResolve = null;
    }
    _closePasswordModal();
    clearAadhaarPdf(true);
    hideLoading();
    showToast('PDF loading cancelled.', 'info');
}

/**
 * The callback given to AadhaarPDF.load() as onPasswordNeeded.
 * PDF.js calls this with (updateCallback, reason):
 *   reason 1 = first password request
 *   reason 2 = wrong password, try again
 */
function _onPasswordNeeded(updateCallback, reason) {
    _pdfPasswordResolve = updateCallback;
    const isRetry = (reason === 2);
    _openPasswordModal(isRetry);
    if (isRetry) {
        PWDOM.errorMsg.style.display = 'flex';
    }
}

// ==========================================================================
// 14. PDF CROP TOOL
//     Renders a PDF page into a canvas, lets the user drag to select a region,
//     then crops that region at full print DPI and injects into imageRegistry.
// ==========================================================================

const CDOM = {};  // Crop modal DOM refs

// Crop interaction state
const cropState = {
    pageNum: null,
    hasSelection: false,
    rect: { x: 0, y: 0, w: 0, h: 0 },
    // Interaction mode: null | 'drawing' | 'moving' | 'resizing'
    mode: null,
    resizeHandle: null, // 'nw'|'ne'|'se'|'sw'|'n'|'s'|'e'|'w'
    dragStartPos: { x: 0, y: 0 },
    dragStartRect: { x: 0, y: 0, w: 0, h: 0 },
    activePreset: null
};

// Standard ID-1 card aspect ratio (85.60 mm / 53.98 mm)
const ID1_CARD_RATIO = 85.60 / 53.98; // ~1.58577...

// -----------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------
function initCropModal() {
    CDOM.overlay        = document.getElementById('pdfCropOverlay');
    CDOM.pageLabel      = document.getElementById('cropPageLabel');
    CDOM.displayCanvas  = document.getElementById('cropDisplayCanvas');
    CDOM.overlayCanvas  = document.getElementById('cropOverlayCanvas');
    CDOM.selectionInfo  = document.getElementById('cropSelectionInfo');
    CDOM.btnClose       = document.getElementById('btnCloseCropModal');
    CDOM.btnClose2      = document.getElementById('btnCloseCropModal2');
    CDOM.btnReset       = document.getElementById('btnResetCropSelection');
    CDOM.btnFront       = document.getElementById('btnCropApplyFront');
    CDOM.btnBack        = document.getElementById('btnCropApplyBack');

    // Preset buttons, clarity & ratio toggle
    CDOM.btnPresetFront  = document.getElementById('btnPresetAadhaarFront');
    CDOM.btnPresetBack   = document.getElementById('btnPresetAadhaarBack');
    CDOM.btnPresetCenter = document.getElementById('btnPresetCenter');
    CDOM.btnPresetFull   = document.getElementById('btnPresetBottomFull');
    CDOM.claritySelect   = document.getElementById('cropClaritySelect');
    CDOM.chkLockRatio    = document.getElementById('chkCropLockRatio');

    // Header / footer buttons
    CDOM.btnClose?.addEventListener('click', closeCropModal);
    CDOM.btnClose2?.addEventListener('click', closeCropModal);
    CDOM.btnReset?.addEventListener('click', resetCropSelection);
    CDOM.btnFront?.addEventListener('click', () => applyCropToSide('front'));
    CDOM.btnBack?.addEventListener('click',  () => applyCropToSide('back'));

    // Layout Preset buttons
    CDOM.btnPresetFront?.addEventListener('click',  () => applyCropPreset('aadhaar-front'));
    CDOM.btnPresetBack?.addEventListener('click',   () => applyCropPreset('aadhaar-back'));
    CDOM.btnPresetCenter?.addEventListener('click', () => applyCropPreset('center'));
    CDOM.btnPresetFull?.addEventListener('click',   () => applyCropPreset('bottom-full'));

    CDOM.claritySelect?.addEventListener('change', () => {
        if (cropState.hasSelection) _updateSelectionInfo(true);
    });

    CDOM.chkLockRatio?.addEventListener('change', () => {
        if (cropState.hasSelection && CDOM.chkLockRatio.checked) {
            _enforceCardRatioOnCurrentRect();
        }
    });

    // Click backdrop to close
    CDOM.overlay?.addEventListener('click', (e) => {
        if (e.target === CDOM.overlay) closeCropModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && CDOM.overlay && CDOM.overlay.style.display !== 'none') {
            closeCropModal();
        }
    });

    // Mouse events on overlay canvas
    CDOM.overlayCanvas?.addEventListener('mousedown',  _onCropMouseDown);
    CDOM.overlayCanvas?.addEventListener('mousemove',  _onCropMouseMove);
    CDOM.overlayCanvas?.addEventListener('mouseup',    _onCropMouseUp);
    CDOM.overlayCanvas?.addEventListener('mouseleave', _onCropMouseLeave);

    // Touch events (mobile)
    CDOM.overlayCanvas?.addEventListener('touchstart', _onCropTouchStart, { passive: false });
    CDOM.overlayCanvas?.addEventListener('touchmove',  _onCropTouchMove,  { passive: false });
    CDOM.overlayCanvas?.addEventListener('touchend',   _onCropMouseUp);
}

// -----------------------------------------------------------------------
// Open / Close / Reset
// -----------------------------------------------------------------------
async function openCropModal(pageNum) {
    if (!aadhaarState.file) {
        showToast('No PDF loaded.', 'error');
        return;
    }

    // Reset interaction state
    cropState.pageNum      = pageNum;
    cropState.mode         = null;
    cropState.hasSelection = false;

    CDOM.pageLabel.textContent = pageNum;
    _resetCropUI();
    CDOM.overlay.style.display = 'flex';

    // Render the page at a comfortable display width for crop selection
    showLoading('Loading page for crop...');

    try {
        // 700px wide — enough detail for accurate crop selection
        const img = await AadhaarPDF.renderThumbnail(pageNum, 700);

        const dCanvas = CDOM.displayCanvas;
        const oCanvas = CDOM.overlayCanvas;

        dCanvas.width  = img.naturalWidth;
        dCanvas.height = img.naturalHeight;
        oCanvas.width  = img.naturalWidth;
        oCanvas.height = img.naturalHeight;

        const dCtx = dCanvas.getContext('2d');
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        dCtx.drawImage(img, 0, 0);

        // Clear overlay
        const oCtx = oCanvas.getContext('2d');
        oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);

        // Apply default layout of crop box immediately!
        applyCropPreset('aadhaar-front');

        hideLoading();
    } catch (err) {
        hideLoading();
        closeCropModal();
        showToast('Could not load page for crop: ' + (err.message || 'Unknown error'), 'error');
    }
}

function closeCropModal() {
    CDOM.overlay.style.display = 'none';
    cropState.mode         = null;
    cropState.hasSelection = false;

    // Clear canvases to free memory
    const oCtx = CDOM.overlayCanvas?.getContext('2d');
    if (oCtx) oCtx.clearRect(0, 0, CDOM.overlayCanvas.width, CDOM.overlayCanvas.height);
}

function resetCropSelection() {
    // Reset to default crop layout for ease of use
    applyCropPreset('aadhaar-front');
    showToast('Reset to default card layout.', 'info');
}

function _resetCropUI() {
    CDOM.selectionInfo.innerHTML = '<i class="fa-regular fa-square-dashed"></i> No selection &mdash; click a layout preset or drag on the page';
    CDOM.selectionInfo.classList.remove('has-selection');
    CDOM.btnFront.disabled = true;
    CDOM.btnBack.disabled  = true;
}

// -----------------------------------------------------------------------
// Presets
// -----------------------------------------------------------------------

/**
 * Apply a preset card layout box to the overlay
 * @param {'aadhaar-front'|'aadhaar-back'|'center'|'bottom-full'} presetName
 */
function applyCropPreset(presetName) {
    const canvas = CDOM.overlayCanvas;
    if (!canvas || !canvas.width || !canvas.height) return;

    let x, y, w, h;

    if (presetName === 'aadhaar-front') {
        // Exact Aadhaar PDF Template Geometry: Bottom-Left Front Panel
        // X1=47.7pt, Y1=569.25pt, W=253.575pt, H=165.15pt on 612x792 MediaBox
        x = Math.round(canvas.width * (47.7 / 612));
        y = Math.round(canvas.height * (569.25 / 792));
        w = Math.round(canvas.width * (253.575 / 612));
        h = Math.round(canvas.height * (165.15 / 792));
    } else if (presetName === 'aadhaar-back') {
        // Exact Aadhaar PDF Template Geometry: Bottom-Right Back Panel
        // Horizontally aligned with Front Panel at Y=569.25pt, H=165.15pt
        x = Math.round(canvas.width * (311.25 / 612));
        y = Math.round(canvas.height * (569.25 / 792));
        w = Math.round(canvas.width * (253.575 / 612));
        h = Math.round(canvas.height * (165.15 / 792));
    } else if (presetName === 'center') {
        // Centered ID-1 card box
        w = Math.round(canvas.width * 0.62);
        h = Math.round(w / ID1_CARD_RATIO);
        x = Math.round((canvas.width - w) / 2);
        y = Math.round((canvas.height - h) / 2);
    } else if (presetName === 'bottom-full') {
        // Bottom region covering both panels
        x = Math.round(canvas.width * (47.7 / 612));
        y = Math.round(canvas.height * (569.25 / 792));
        w = Math.round(canvas.width * ((564.825 - 47.7) / 612));
        h = Math.round(canvas.height * (165.15 / 792));
    }

    setCropSelectionRect(x, y, w, h);
    _updateActivePresetBtn(presetName);
}

function _updateActivePresetBtn(presetName) {
    const map = {
        'aadhaar-front': CDOM.btnPresetFront,
        'aadhaar-back':  CDOM.btnPresetBack,
        'center':        CDOM.btnPresetCenter,
        'bottom-full':   CDOM.btnPresetFull
    };
    Object.keys(map).forEach(key => {
        if (map[key]) {
            if (key === presetName) {
                map[key].classList.add('active');
            } else {
                map[key].classList.remove('active');
            }
        }
    });
    cropState.activePreset = presetName;
}

function setCropSelectionRect(x, y, w, h) {
    const canvas = CDOM.overlayCanvas;
    w = Math.max(20, Math.min(canvas.width, Math.round(w)));
    h = Math.max(20, Math.min(canvas.height, Math.round(h)));
    x = Math.max(0, Math.min(canvas.width - w, Math.round(x)));
    y = Math.max(0, Math.min(canvas.height - h, Math.round(y)));

    cropState.rect = { x, y, w, h };
    cropState.hasSelection = true;
    cropState.mode = null;
    cropState.resizeHandle = null;

    _drawCropOverlay();
    _updateSelectionInfo(true);
    CDOM.btnFront.disabled = false;
    CDOM.btnBack.disabled  = false;
}

function _enforceCardRatioOnCurrentRect() {
    if (!cropState.hasSelection) return;
    const canvas = CDOM.overlayCanvas;
    let { x, y, w } = cropState.rect;
    let h = Math.round(w / ID1_CARD_RATIO);
    if (y + h > canvas.height) {
        h = canvas.height - y;
        w = Math.round(h * ID1_CARD_RATIO);
    }
    setCropSelectionRect(x, y, w, h);
}

// -----------------------------------------------------------------------
// Mouse / Touch Interaction & Hit Testing
// -----------------------------------------------------------------------

/** Convert clientX/clientY to canvas internal pixel coordinates */
function _getCanvasPos(canvas, clientX, clientY) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top)  * scaleY
    };
}

/** Normalized crop rect */
function _getNormalizedRect() {
    return {
        x: Math.round(cropState.rect.x || 0),
        y: Math.round(cropState.rect.y || 0),
        w: Math.round(cropState.rect.w || 0),
        h: Math.round(cropState.rect.h || 0)
    };
}

/** 8 resize handles around the box */
function _getCropHandles(r) {
    const { x, y, w, h } = r;
    return [
        { id: 'nw', x: x,         y: y,         cursor: 'nwse-resize' },
        { id: 'ne', x: x + w,     y: y,         cursor: 'nesw-resize' },
        { id: 'se', x: x + w,     y: y + h,     cursor: 'nwse-resize' },
        { id: 'sw', x: x,         y: y + h,     cursor: 'nesw-resize' },
        { id: 'n',  x: x + w / 2, y: y,         cursor: 'ns-resize' },
        { id: 's',  x: x + w / 2, y: y + h,     cursor: 'ns-resize' },
        { id: 'w',  x: x,         y: y + h / 2, cursor: 'ew-resize' },
        { id: 'e',  x: x + w,     y: y + h / 2, cursor: 'ew-resize' }
    ];
}

function _hitTestCrop(pos) {
    if (!cropState.hasSelection) return { type: 'outside', cursor: 'crosshair' };

    const r = cropState.rect;
    const canvas = CDOM.overlayCanvas;
    const domRect = canvas.getBoundingClientRect();
    const scale = domRect.width > 0 ? (canvas.width / domRect.width) : 1;
    // Comfortable hit radius in canvas coords (~15 CSS px)
    const hitRadius = Math.max(14, 14 * scale);

    const handles = _getCropHandles(r);
    for (const h of handles) {
        if (Math.hypot(pos.x - h.x, pos.y - h.y) <= hitRadius) {
            return { type: 'handle', handle: h.id, cursor: h.cursor };
        }
    }

    if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
        return { type: 'inside', cursor: 'move' };
    }

    return { type: 'outside', cursor: 'crosshair' };
}

function _onCropMouseDown(e) {
    e.preventDefault();
    const pos = _getCanvasPos(CDOM.overlayCanvas, e.clientX, e.clientY);

    if (cropState.hasSelection) {
        const hit = _hitTestCrop(pos);
        if (hit.type === 'handle') {
            cropState.mode = 'resizing';
            cropState.resizeHandle = hit.handle;
            cropState.dragStartPos = { ...pos };
            cropState.dragStartRect = { ...cropState.rect };
            _updateActivePresetBtn(null);
            return;
        }
        if (hit.type === 'inside') {
            cropState.mode = 'moving';
            cropState.dragStartPos = { ...pos };
            cropState.dragStartRect = { ...cropState.rect };
            _updateActivePresetBtn(null);
            return;
        }
    }

    // Outside or drawing new rect
    cropState.mode = 'drawing';
    cropState.dragStartPos = { ...pos };
    cropState.rect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    cropState.hasSelection = false;
    _updateActivePresetBtn(null);
    _resetCropUI();
}

function _onCropMouseMove(e) {
    const pos = _getCanvasPos(CDOM.overlayCanvas, e.clientX, e.clientY);
    const canvas = CDOM.overlayCanvas;
    const lockRatio = CDOM.chkLockRatio ? CDOM.chkLockRatio.checked : true;

    // Hover cursor updates when not actively dragging
    if (!cropState.mode) {
        if (cropState.hasSelection) {
            const hit = _hitTestCrop(pos);
            canvas.style.cursor = hit.cursor;
        } else {
            canvas.style.cursor = 'crosshair';
        }
        return;
    }

    e.preventDefault();

    // 1. Moving entire crop box
    if (cropState.mode === 'moving') {
        const dx = pos.x - cropState.dragStartPos.x;
        const dy = pos.y - cropState.dragStartPos.y;
        const orig = cropState.dragStartRect;
        const newX = Math.max(0, Math.min(canvas.width - orig.w, orig.x + dx));
        const newY = Math.max(0, Math.min(canvas.height - orig.h, orig.y + dy));

        cropState.rect.x = Math.round(newX);
        cropState.rect.y = Math.round(newY);
        cropState.hasSelection = true;
        _drawCropOverlay();
        _updateSelectionInfo(false);
        return;
    }

    // 2. Resizing with handles
    if (cropState.mode === 'resizing') {
        const dx = pos.x - cropState.dragStartPos.x;
        const dy = pos.y - cropState.dragStartPos.y;
        const orig = cropState.dragStartRect;
        const handle = cropState.resizeHandle;

        let newX = orig.x;
        let newY = orig.y;
        let newW = orig.w;
        let newH = orig.h;

        if (handle === 'se') {
            newW = Math.max(24, orig.w + dx);
            newH = lockRatio ? newW / ID1_CARD_RATIO : Math.max(24, orig.h + dy);
        } else if (handle === 'sw') {
            newW = Math.max(24, orig.w - dx);
            newH = lockRatio ? newW / ID1_CARD_RATIO : Math.max(24, orig.h + dy);
            newX = orig.x + orig.w - newW;
        } else if (handle === 'ne') {
            newW = Math.max(24, orig.w + dx);
            newH = lockRatio ? newW / ID1_CARD_RATIO : Math.max(24, orig.h - dy);
            newY = orig.y + orig.h - newH;
        } else if (handle === 'nw') {
            newW = Math.max(24, orig.w - dx);
            newH = lockRatio ? newW / ID1_CARD_RATIO : Math.max(24, orig.h - dy);
            newX = orig.x + orig.w - newW;
            newY = orig.y + orig.h - newH;
        } else if (handle === 'e') {
            newW = Math.max(24, orig.w + dx);
            if (lockRatio) {
                newH = newW / ID1_CARD_RATIO;
                newY = orig.y + (orig.h - newH) / 2;
            }
        } else if (handle === 'w') {
            newW = Math.max(24, orig.w - dx);
            newX = orig.x + orig.w - newW;
            if (lockRatio) {
                newH = newW / ID1_CARD_RATIO;
                newY = orig.y + (orig.h - newH) / 2;
            }
        } else if (handle === 's') {
            newH = Math.max(24, orig.h + dy);
            if (lockRatio) {
                newW = newH * ID1_CARD_RATIO;
                newX = orig.x + (orig.w - newW) / 2;
            }
        } else if (handle === 'n') {
            newH = Math.max(24, orig.h - dy);
            newY = orig.y + orig.h - newH;
            if (lockRatio) {
                newW = newH * ID1_CARD_RATIO;
                newX = orig.x + (orig.w - newW) / 2;
            }
        }

        // Clamp inside canvas boundary
        if (newX < 0) {
            newW += newX;
            newX = 0;
            if (lockRatio) newH = newW / ID1_CARD_RATIO;
        }
        if (newY < 0) {
            newH += newY;
            newY = 0;
            if (lockRatio) newW = newH * ID1_CARD_RATIO;
        }
        if (newX + newW > canvas.width) {
            newW = canvas.width - newX;
            if (lockRatio) newH = newW / ID1_CARD_RATIO;
        }
        if (newY + newH > canvas.height) {
            newH = canvas.height - newY;
            if (lockRatio) newW = newH * ID1_CARD_RATIO;
        }

        cropState.rect = {
            x: Math.round(newX),
            y: Math.round(newY),
            w: Math.round(newW),
            h: Math.round(newH)
        };
        cropState.hasSelection = true;
        _drawCropOverlay();
        _updateSelectionInfo(false);
        return;
    }

    // 3. Drawing new selection box from scratch
    if (cropState.mode === 'drawing') {
        const startX = cropState.dragStartPos.x;
        const startY = cropState.dragStartPos.y;
        const curX   = Math.max(0, Math.min(canvas.width, pos.x));
        const curY   = Math.max(0, Math.min(canvas.height, pos.y));
        let rawW     = Math.abs(curX - startX);
        let rawH     = Math.abs(curY - startY);
        let x        = Math.min(startX, curX);
        let y        = Math.min(startY, curY);

        if (lockRatio && rawW > 6) {
            rawH = rawW / ID1_CARD_RATIO;
            if (curY < startY) y = startY - rawH;
        }

        cropState.rect = {
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(rawW),
            h: Math.round(rawH)
        };
        _drawCropOverlay();
        _updateSelectionInfo(false);
    }
}

function _onCropMouseUp(e) {
    if (!cropState.mode) return;

    if (cropState.mode === 'drawing') {
        if (cropState.rect.w > 15 && cropState.rect.h > 15) {
            cropState.hasSelection = true;
        } else {
            // Revert to default card layout if drawn area was too tiny
            applyCropPreset('aadhaar-front');
        }
    } else {
        cropState.hasSelection = (cropState.rect.w > 15 && cropState.rect.h > 15);
    }

    cropState.mode = null;
    cropState.resizeHandle = null;

    if (cropState.hasSelection) {
        _drawCropOverlay();
        _updateSelectionInfo(true);
        CDOM.btnFront.disabled = false;
        CDOM.btnBack.disabled  = false;
    }
}

function _onCropMouseLeave(e) {
    if (cropState.mode) {
        _onCropMouseUp(e);
    }
    CDOM.overlayCanvas.style.cursor = 'crosshair';
}

function _onCropTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    _onCropMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
}

function _onCropTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    _onCropMouseMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
}

// -----------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------

function _drawCropOverlay() {
    const canvas = CDOM.overlayCanvas;
    const ctx    = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!cropState.hasSelection) return;

    const { x, y, w, h } = _getNormalizedRect();
    if (w < 4 || h < 4) return;

    // 1. Dark semi-transparent shade covering entire page
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Clear out selection to reveal the page cleanly
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';

    // 3. Card outline border
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Inner bright border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // 4. Subtle grid lines (Rule of Thirds / card alignment guides)
    if (w > 60 && h > 60) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        // Verticals
        ctx.moveTo(x + w / 3, y);
        ctx.lineTo(x + w / 3, y + h);
        ctx.moveTo(x + (2 * w) / 3, y);
        ctx.lineTo(x + (2 * w) / 3, y + h);
        // Horizontals
        ctx.moveTo(x, y + h / 3);
        ctx.lineTo(x + w, y + h / 3);
        ctx.moveTo(x, y + (2 * h) / 3);
        ctx.lineTo(x + w, y + (2 * h) / 3);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 5. Center alignment crosshair
    if (w > 80 && h > 80) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx + 7, cy);
        ctx.moveTo(cx, cy - 7);
        ctx.lineTo(cx, cy + 7);
        ctx.stroke();
    }

    // 6. Corner and mid-edge resize handles
    const domRect = canvas.getBoundingClientRect();
    const scale = domRect.width > 0 ? (canvas.width / domRect.width) : 1;
    const HS = Math.max(5.5, 5.5 * scale); // handle radius

    const handles = _getCropHandles({ x, y, w, h });
    handles.forEach(hItem => {
        ctx.fillStyle   = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth   = Math.max(2, 2 * scale);

        ctx.beginPath();
        ctx.arc(hItem.x, hItem.y, HS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // 7. Dimension and ID Card indicator badge
    if (w > 90 && h > 35) {
        const isStandard = Math.abs(w / h - ID1_CARD_RATIO) < 0.08;
        const label = isStandard
            ? `ID-1 Card (85.6 \u00d7 54 mm) \u2022 ${Math.round(w)} \u00d7 ${Math.round(h)} px`
            : `${Math.round(w)} \u00d7 ${Math.round(h)} px`;

        const fontSize = Math.max(11, Math.min(13, Math.round(12 * scale)));
        ctx.font = `600 ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const badgeW = textWidth + 16;
        const badgeH = fontSize + 12;

        let badgeX = x + (w - badgeW) / 2;
        let badgeY = y - badgeH - 6;
        if (badgeY < 4) {
            badgeY = y + 8; // Inside if near top edge
        }

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
        } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, badgeX + badgeW / 2, badgeY + badgeH / 2);
    }
}

function _updateSelectionInfo(isFinal) {
    if (!cropState.hasSelection) {
        _resetCropUI();
        return;
    }
    const { w, h } = _getNormalizedRect();
    const isStandard = Math.abs(w / h - ID1_CARD_RATIO) < 0.08;
    const targetDpi = parseInt(CDOM.claritySelect?.value || '600', 10);

    // Physical card is 85.6 mm (3.37 in). Compute target pixel dimensions:
    const cardPhysicalWidthInches = 85.60 / 25.4;
    const estPixelsW = Math.round(cardPhysicalWidthInches * targetDpi);
    const estPixelsH = Math.round(estPixelsW / (w / h));

    if (isFinal) {
        CDOM.selectionInfo.innerHTML =
            `<i class="fa-solid fa-crop-simple"></i> ` +
            `Card: <strong>${Math.round(w)} \u00d7 ${Math.round(h)} px</strong> ` +
            (isStandard ? `<span style="color:var(--success);font-weight:600;">(ID-1 Ratio)</span> ` : ``) +
            `&bull; Output: <strong style="color:var(--primary);"><i class="fa-solid fa-gem"></i> ${estPixelsW} \u00d7 ${estPixelsH} px @ ${targetDpi} DPI (Original Clarity)</strong>`;
        CDOM.selectionInfo.classList.add('has-selection');
    } else {
        CDOM.selectionInfo.innerHTML =
            `<i class="fa-solid fa-crop-simple"></i> ` +
            `${Math.round(w)} \u00d7 ${Math.round(h)} px &bull; ${targetDpi} DPI Ultra HD`;
        CDOM.selectionInfo.classList.remove('has-selection');
    }
}

// -----------------------------------------------------------------------
// Apply Crop with Original Vector Clarity
// -----------------------------------------------------------------------
async function applyCropToSide(side) {
    if (!cropState.hasSelection) {
        showToast('Select a card crop area first.', 'error');
        return;
    }

    if (!aadhaarState.file) {
        showToast('No PDF loaded.', 'error');
        return;
    }

    const { x, y, w, h } = _getNormalizedRect();
    const displayW = CDOM.overlayCanvas.width;
    const displayH = CDOM.overlayCanvas.height;

    // Convert selection to exact 0..1 floating point ratios relative to page
    const ratioX = x / displayW;
    const ratioY = y / displayH;
    const ratioW = w / displayW;
    const ratioH = h / displayH;

    // Desired card DPI (600 DPI by default for true original vector clarity)
    const targetDpi = parseInt(CDOM.claritySelect?.value || '600', 10);

    CDOM.btnFront.disabled = true;
    CDOM.btnBack.disabled  = true;
    showLoading(`Extracting with Original Vector Clarity (${targetDpi} DPI)...`);

    try {
        // 1. Render cropped region directly from PDF vector model at full target DPI
        const result = await AadhaarPDF.renderCroppedRegion(
            cropState.pageNum,
            { ratioX, ratioY, ratioW, ratioH },
            targetDpi
        );

        const croppedImg = result.img;
        const srcW = result.width;
        const srcH = result.height;

        // 2. Inject into imageRegistry + update card state
        imageRegistry[side] = croppedImg;
        const label = `${aadhaarState.name} — Pg ${cropState.pageNum} (${targetDpi} DPI HD)`;
        const dims  = `${srcW} \u00d7 ${srcH} px (${targetDpi} DPI HD)`;

        if (side === 'front') {
            aadhaarState.renderedFrontImg = croppedImg;
            state.front.name    = label;
            state.front.dimsStr = dims;
            state.front.sizeStr = '';
        } else {
            aadhaarState.renderedBackImg = croppedImg;
            state.back.name    = label;
            state.back.dimsStr = dims;
            state.back.sizeStr = '';
        }

        updateCardUploadUI(side);

        // Auto-set contain mode so the cropped region fits cleanly without distortion
        if (state.cardResizeMode !== 'contain') {
            state.cardResizeMode = 'contain';
            if (DOM.cardResizeMode) DOM.cardResizeMode.value = 'contain';
        }

        hideLoading();
        requestRender();
        closeCropModal();

        const sideName = side === 'front' ? 'Front' : 'Back';
        showToast(`Original Clarity Card (${targetDpi} DPI) set as ${sideName}!`, 'success');

    } catch (err) {
        hideLoading();
        console.error('[Crop] Apply error:', err);
        showToast('Crop failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
        CDOM.btnFront.disabled = !cropState.hasSelection;
        CDOM.btnBack.disabled  = !cropState.hasSelection;
    }
}

