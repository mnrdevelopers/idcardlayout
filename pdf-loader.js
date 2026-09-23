/**
 * pdf-loader.js
 * PDF.js wrapper for Aadhaar PDF Print Mode.
 * All processing is 100% client-side — the PDF never leaves the browser.
 *
 * Public API:
 *   AadhaarPDF.load(file)                      → Promise<{ pageCount }>
 *   AadhaarPDF.renderThumbnail(pageNum, width)  → Promise<HTMLImageElement>
 *   AadhaarPDF.renderPageAtDpi(pageNum, dpi)    → Promise<HTMLImageElement>
 *   AadhaarPDF.cleanup()                        → void
 */

const AadhaarPDF = (() => {
    'use strict';

    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
    const ALLOWED_MIME = 'application/pdf';

    let _pdfDoc = null;         // PDF.js PDFDocumentProxy
    let _pageCache = new Map(); // cacheKey → HTMLImageElement

    // -----------------------------------------------------------------------
    // Public: load
    // -----------------------------------------------------------------------
    async function load(file, options) {
        options = options || {};
        if (!file) throw new Error('No file provided.');

        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(
                `File is too large (max 50 MB). This PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB.`
            );
        }

        const lowerName = (file.name || '').toLowerCase();
        const isMimePdf  = (file.type === ALLOWED_MIME);
        const isExtPdf   = lowerName.endsWith('.pdf');

        if (!isMimePdf && !isExtPdf) {
            throw new Error('Invalid file type. Please select a PDF file (.pdf).');
        }

        // Cleanup any previously loaded document
        cleanup();

        if (typeof pdfjsLib === 'undefined') {
            throw new Error(
                'PDF.js library is not loaded. Check your internet connection and reload the page.'
            );
        }

        // Read file into ArrayBuffer — stays entirely in browser memory
        const arrayBuffer = await _readFileAsArrayBuffer(file);

        let loadingTask;
        try {
            loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        } catch (e) {
            throw new Error('Unable to read this PDF. Please download the document again and try again.');
        }

        // Handle password-protected PDFs via callback (so the UI can prompt the user)
        loadingTask.onPassword = function (updateCallback, reason) {
            if (typeof options.onPasswordNeeded === 'function') {
                // Delegate to caller — they will call updateCallback(password) or updateCallback('') to cancel
                options.onPasswordNeeded(updateCallback, reason);
            } else {
                // No handler provided — cancel gracefully
                updateCallback('');
            }
        };

        try {
            _pdfDoc = await loadingTask.promise;
        } catch (e) {
            // PasswordException is now handled via onPassword; this catch covers other failures
            if (e && (e.name === 'PasswordException' || (e.message && e.message.toLowerCase().includes('password')))) {
                throw new Error('Password entry was cancelled or failed.');
            }
            throw new Error('Unable to read this PDF. Please download the document again and try again.');
        }

        _pageCache.clear();

        return { pageCount: _pdfDoc.numPages };
    }

    // -----------------------------------------------------------------------
    // Public: renderThumbnail — low-res for the UI thumbnail grid
    // -----------------------------------------------------------------------
    async function renderThumbnail(pageNum, targetWidthPx) {
        targetWidthPx = targetWidthPx || 120;
        _assertLoaded();

        const cacheKey = `thumb_${pageNum}_${targetWidthPx}`;
        if (_pageCache.has(cacheKey)) {
            return _pageCache.get(cacheKey);
        }

        const img = await _renderPageToImage(pageNum, null, targetWidthPx);
        _pageCache.set(cacheKey, img);
        return img;
    }

    // -----------------------------------------------------------------------
    // Public: renderPageAtDpi — full-resolution for card injection
    // -----------------------------------------------------------------------
    async function renderPageAtDpi(pageNum, dpi) {
        dpi = dpi || 300;
        _assertLoaded();

        // Do NOT cache full-res renders to conserve memory
        return _renderPageToImage(pageNum, dpi, null);
    }

    // -----------------------------------------------------------------------
    // Public: cleanup — release all resources
    // -----------------------------------------------------------------------
    function cleanup() {
        if (_pdfDoc) {
            try { _pdfDoc.destroy(); } catch (e) { /* ignore */ }
            _pdfDoc = null;
        }
        _pageCache.clear();
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    function _assertLoaded() {
        if (!_pdfDoc) {
            throw new Error('No PDF loaded. Call AadhaarPDF.load() first.');
        }
    }

    function _readFileAsArrayBuffer(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload  = function (e) { resolve(e.target.result); };
            reader.onerror = function () { reject(new Error('Failed to read PDF file.')); };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Core render: renders PDF page to an HTMLImageElement.
     * Pass `dpi` for full-resolution, or `targetWidthPx` for thumbnail.
     */
    async function _renderPageToImage(pageNum, dpi, targetWidthPx) {
        const page = await _pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1.0 });

        let scale;
        if (dpi) {
            // PDF.js base unit = 72 dpi → scale to target dpi
            scale = dpi / 72;
        } else {
            scale = targetWidthPx / baseViewport.width;
        }

        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(scaledViewport.width);
        canvas.height = Math.round(scaledViewport.height);

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        // Release the PDF.js page reference immediately
        page.cleanup();

        const dataUrl = canvas.toDataURL('image/png');

        // Free canvas memory
        canvas.width  = 0;
        canvas.height = 0;

        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload  = function () { resolve(img); };
            img.onerror = function () {
                reject(new Error('Failed to convert PDF page ' + pageNum + ' to image.'));
            };
            img.src = dataUrl;
        });
    }

    /**
     * Render a sub-region (crop) directly from the PDF vector model at original clarity.
     * Guarantees the cropped card has full physical DPI (e.g. 600 or 800 DPI).
     * @param {number} pageNum
     * @param {{ ratioX: number, ratioY: number, ratioW: number, ratioH: number }} cropRatio
     * @param {number} cardDpi - Effective target DPI for the physical card (default 600)
     */
    async function renderCroppedRegion(pageNum, cropRatio, cardDpi) {
        cardDpi = cardDpi || 600;
        _assertLoaded();

        const page = await _pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Physical width of standard ID-1 card is 85.60 mm (3.3700787 in)
        // We compute target pixel width for the cropped card to achieve cardDpi:
        const cardPhysicalWidthInches = 85.60 / 25.4;
        const targetCardPixelsW = Math.max(900, Math.round(cardPhysicalWidthInches * cardDpi));

        // Sub-region width in PDF points
        const cropPointsW = Math.max(10, (cropRatio.ratioW || 0.44) * baseViewport.width);

        // Vector scale factor for PDF.js to rasterize at full target cardDpi
        const scale = targetCardPixelsW / cropPointsW;

        const scaledViewport = page.getViewport({ scale });
        const canvasW = Math.round(scaledViewport.width);
        const canvasH = Math.round(scaledViewport.height);

        const canvas = document.createElement('canvas');
        canvas.width  = canvasW;
        canvas.height = canvasH;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        page.cleanup();

        // Pixel coordinates of crop region on this ultra-res canvas
        const srcX = Math.max(0, Math.min(canvasW - 10, Math.round(cropRatio.ratioX * canvasW)));
        const srcY = Math.max(0, Math.min(canvasH - 10, Math.round(cropRatio.ratioY * canvasH)));
        const srcW = Math.max(20, Math.min(canvasW - srcX, Math.round(cropRatio.ratioW * canvasW)));
        const srcH = Math.max(20, Math.min(canvasH - srcY, Math.round(cropRatio.ratioH * canvasH)));

        // Extract crop region
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width  = srcW;
        cropCanvas.height = srcH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.imageSmoothingEnabled = true;
        cropCtx.imageSmoothingQuality = 'high';
        cropCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

        // Immediately release the large full-page canvas
        canvas.width  = 0;
        canvas.height = 0;

        const dataUrl = cropCanvas.toDataURL('image/png');
        cropCanvas.width  = 0;
        cropCanvas.height = 0;

        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload  = function () {
                resolve({ img, width: srcW, height: srcH, dpi: cardDpi });
            };
            img.onerror = function () {
                reject(new Error('Failed to create cropped card image at ' + cardDpi + ' DPI.'));
            };
            img.src = dataUrl;
        });
    }

    /**
     * Get the dimensions of a PDF page in points.
     */
    async function getPageDimensions(pageNum) {
        _assertLoaded();
        const page = await _pdfDoc.getPage(pageNum || 1);
        const vp = page.getViewport({ scale: 1.0 });
        const dims = { width: vp.width, height: vp.height };
        page.cleanup();
        return dims;
    }

    /**
     * Extract the two bottom panels from the known Aadhaar PDF template.
     * Front panel (Bottom-Left):  X=47.7,   Y=569.25, W=253.575, H=165.15 pt
     * Back panel (Bottom-Right): X=311.25, Y=569.25, W=253.575, H=165.15 pt
     *
     * @param {number} pageNum
     * @param {object} [customCrops] - Optional overrides for front and back crops in PDF points
     * @param {number} [dpi=300] - Render resolution
     */
    async function extractAadhaarPanels(pageNum, customCrops, dpi) {
        _assertLoaded();
        pageNum = pageNum || 1;
        dpi = dpi || 300;

        const page = await _pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1.0 });
        const pdfW = baseViewport.width;
        const pdfH = baseViewport.height;

        // Check if page matches 612 × 792 pt template (within ±25 pt)
        const isTemplateMatched = (Math.abs(pdfW - 612) <= 25 && Math.abs(pdfH - 792) <= 25);

        // Exact template coordinates (Front and Back are horizontally aligned at Y=569.25, H=165.15)
        const crops = customCrops || {
            front: { x: 47.7,   y: 569.25, width: 253.575, height: 165.15 },
            back:  { x: 311.25, y: 569.25, width: 253.575, height: 165.15 }
        };

        // Render page at high resolution
        const scale = dpi / 72;
        const scaledViewport = page.getViewport({ scale });
        const canvasW = Math.round(scaledViewport.width);
        const canvasH = Math.round(scaledViewport.height);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width  = canvasW;
        pageCanvas.height = canvasH;

        const ctx = pageCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        page.cleanup();

        // Convert PDF coordinates to canvas coordinates:
        const baseW = isTemplateMatched ? 612 : pdfW;
        const baseH = isTemplateMatched ? 792 : pdfH;

        function _slicePanel(crop) {
            const ratioX = crop.x / baseW;
            const ratioY = crop.y / baseH;
            const ratioW = crop.width / baseW;
            const ratioH = crop.height / baseH;

            const sx = Math.max(0, Math.min(canvasW - 10, Math.round(ratioX * canvasW)));
            const sy = Math.max(0, Math.min(canvasH - 10, Math.round(ratioY * canvasH)));
            const sw = Math.max(20, Math.min(canvasW - sx, Math.round(ratioW * canvasW)));
            const sh = Math.max(20, Math.min(canvasH - sy, Math.round(ratioH * canvasH)));

            const cCanvas = document.createElement('canvas');
            cCanvas.width  = sw;
            cCanvas.height = sh;
            const cCtx = cCanvas.getContext('2d');
            cCtx.imageSmoothingEnabled = true;
            cCtx.imageSmoothingQuality = 'high';
            cCtx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

            const dataUrl = cCanvas.toDataURL('image/png');
            cCanvas.width = 0;
            cCanvas.height = 0;

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload  = () => resolve({ img, width: sw, height: sh, dataUrl });
                img.onerror = () => reject(new Error('Failed to create panel image.'));
                img.src = dataUrl;
            });
        }

        const [frontPanel, backPanel] = await Promise.all([
            _slicePanel(crops.front),
            _slicePanel(crops.back)
        ]);

        // Clean up full-page canvas
        pageCanvas.width  = 0;
        pageCanvas.height = 0;

        return {
            isTemplateMatched,
            pdfWidth: pdfW,
            pdfHeight: pdfH,
            front: frontPanel,
            back: backPanel
        };
    }

    // -----------------------------------------------------------------------
    // Expose public API
    // -----------------------------------------------------------------------
    return { load, renderThumbnail, renderPageAtDpi, renderCroppedRegion, extractAadhaarPanels, getPageDimensions, cleanup };

})();
