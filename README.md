# A4 ID Card Specimen Layout & Print Tool

A modern, browser-based, client-side application for generating high-precision **A4 ID card specimen sheets** formatted for authorized internal testing, design validation, proofing, and educational printing.

---

## 🔒 Security & Privacy Policy

* **100% Client-Side Privacy:** All image processing, canvas transformations, and PDF generation happen strictly inside your web browser. No photos, files, or metadata are ever transmitted to any external server or third-party cloud service.
* **Authorized Specimen Marking:** In accordance with compliance standards, every generated output automatically and unconditionally includes the specimen watermark:
  > **`SAMPLE / NOT VALID FOR IDENTIFICATION`**
  This tool is built solely for legitimate layout testing, specimen printing, and educational demonstrations.

---

## ✨ Features

- **Side-by-Side A4 Layout:** Automatically places front and back card images side-by-side on an A4 page, centered horizontally.
- **True Physical Sizing:**
  - Standard **ID-1 / CR80** (`85.60 × 53.98 mm`).
  - Driving License / Badges (`85.60 × 53.98 mm`).
  - Business Cards (`90.00 × 50.00 mm`).
  - ID-2 Specimen (`105.00 × 74.00 mm`).
  - Custom user-specified millimeter dimensions.
- **High-Resolution Engine:**
  - 150 DPI (Fast / Draft)
  - 300 DPI (Standard High-Resolution Print — *2480 × 3508 px for A4*)
  - 600 DPI (Ultra-sharp Pro Master)
- **Millimeter-Accurate PDF Export:** Generates exact vector millimeter-scaled A4 PDFs using `jsPDF` (`210 × 297 mm`).
- **Lossless & High-Quality Image Export:** Download high-DPI JPG or lossless PNG.
- **Direct 1:1 Browser Print:** Custom `@media print` CSS with `@page { size: A4 portrait; margin: 0; }`.
- **Cutting Guides & Alignment:**
  - Thin dashed cutting outline (0.2 mm)
  - Thin solid border
  - Corner crop marks
  - On-sheet 50mm test calibration ruler for physical ruler verification
- **Image Adjustments:**
  - Independent 0° / 90° / 180° / 270° rotation per card
  - Zoom (50% to 200%)
  - X / Y millimeter positioning offsets
  - Crop to Fill, Fit Inside, or Stretch modes
  - Swap Front & Back button
- **Batch Processing Mode:** Upload multiple front/back cards, auto-pair by filename, preview pairs, and export as a multi-page PDF or a single ZIP package.
- **Instant Sample Cards:** Single-click "Load Sample Cards" button to test the tool immediately without uploading custom files.

---

## 🚀 How to Run

No web server or build process required! Simply:

1. Double-click or open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari, Brave).
2. (Optional) Run with any local server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

---

## 🖨️ Important 1:1 Physical Printing Guide

To ensure that printed cards measure **exactly 85.60 × 53.98 mm** on physical paper:

1. Click **Print A4 Sheet** or open the exported PDF in Acrobat/Reader.
2. In the printer dialog, verify these settings:
   - **Paper Size:** `A4 (210 × 297 mm)`
   - **Scale:** **`100%`** or **`Actual Size`** (*Do NOT select "Fit to Printable Area" or "Shrink to Fit"*)
   - **Margins:** `None` or `Default 0`
   - **Double-sided / Duplex:** `Off` (Single-sided)
3. **Physical Ruler Check:** Use a ruler to measure the printed 50 mm calibration bar or card outline before cutting.

---

## 📐 Mathematical Formulation

$$\text{pixels} = \frac{\text{millimeters}}{25.4} \times \text{DPI}$$

| Element | Millimeters | 150 DPI | 300 DPI | 600 DPI |
| :--- | :--- | :--- | :--- | :--- |
| **A4 Paper** | $210 \times 297\text{ mm}$ | $1240 \times 1754\text{ px}$ | $2480 \times 3508\text{ px}$ | $4961 \times 7016\text{ px}$ |
| **ID-1 Card** | $85.60 \times 53.98\text{ mm}$ | $506 \times 319\text{ px}$ | $1011 \times 638\text{ px}$ | $2022 \times 1275\text{ px}$ |
| **5 mm Gap** | $5.00\text{ mm}$ | $30\text{ px}$ | $59\text{ px}$ | $118\text{ px}$ |
| **25 mm Top Margin** | $25.00\text{ mm}$ | $148\text{ px}$ | $295\text{ px}$ | $591\text{ px}$ |

---

## 📁 File Structure

```text
id-card-specimen-tool/
├── index.html        # Main semantic markup & layout structure
├── style.css         # Modern styling, responsive design & print rules
├── app.js            # Math calculations, canvas engine, PDF & batch export
├── pdf-loader.js     # PDF.js wrapper for Aadhaar PDF mode (client-side only)
└── README.md         # Documentation and printer calibration manual
```

---

## 🇮🇳 Aadhaar PDF Mode

Print a pocket-sized physical card from your Aadhaar PDF — entirely inside your browser.

### Privacy Guarantee

> 🔒 **Your Aadhaar PDF is processed 100% locally inside the browser.**
> It is never uploaded to any server, API, cloud, or third-party service.
> No data is stored in localStorage, sessionStorage, or URLs.

### How It Works

```
Your Aadhaar PDF (downloaded from UIDAI)
           ↓
    Select "Aadhaar PDF" tab
           ↓
    Drop or Choose PDF file
           ↓
    PDF.js renders pages in-browser
           ↓
    Select page(s) to print
           ↓
    Click "Apply to Card Layout"
           ↓
    Existing ID-1 card engine (85.60 × 53.98 mm)
           ↓
    A4 print layout — same engine as Image Mode
           ↓
    Print / PDF / JPG / PNG export
```

### Step-by-Step Usage

1. Open the application in a modern browser.
2. Click the **Aadhaar PDF** tab at the top of the left panel.
3. Drag & Drop or **Select Aadhaar PDF** — the file never leaves your device.
4. Page thumbnails appear automatically.
5. Choose **Single Side** or **Front + Back** print mode.
6. Select the page number(s) for front (and back if applicable).
7. Click **Apply to Card Layout** — the page is rendered at your selected DPI.
8. Adjust rotation, zoom, or offsets in the "Adjust Front/Back Image" accordion if needed.
9. Click **Reset Aadhaar Position** to restore default alignment.
10. Set Card Standard to **ID-1 Standard — 85.60 × 53.98 mm**.
11. Export as **PDF**, **JPG**, **PNG**, or use **Print A4 Sheet**.

### Print Settings

For accurate physical card size:

- **Paper:** A4 (210 × 297 mm)
- **Scale:** 100% / Actual Size — **do not use Fit to Page or Shrink to Fit**
- **Margins:** None
- Verify with a physical ruler before cutting.

### Card Controls Available in Aadhaar Mode

All existing image controls continue to work after applying a PDF page:

| Control | Available |
|---|---|
| Rotation (0° / 90° / 180° / 270°) | ✅ |
| Zoom (50%–200%) | ✅ |
| Offset X / Y | ✅ |
| Fit / Contain / Stretch | ✅ |
| Corner cut radius | ✅ |
| Cutting guides & crop marks | ✅ |
| Calibration ruler | ✅ |
| PDF export | ✅ |
| JPG / PNG export | ✅ |
| Browser print | ✅ |

### Watermark Behaviour

Aadhaar mode **does not add** the specimen watermark — the Aadhaar document
is an already-issued official identity document, not a specimen. Image Mode
retains its mandatory specimen watermark as before.

### Supported PDF Types

- Standard Aadhaar eKYC PDFs from UIDAI (m-Aadhaar / DigiLocker)
- Any PDF up to **50 MB**
- **Password-protected PDFs:** The app will prompt you for the password automatically.
  UIDAI Aadhaar PDF password format: **first 4 letters of your name in CAPS + birth year**
  *(e.g. `RAHU1990` for Rahul born in 1990)*

### ✂️ Interactive Card Crop Tool with Default Layouts

Easily crop the pocket card portion directly from your Aadhaar PDF page:

- **Automatic Default Crop Box:** Opening the crop tool immediately places a default crop box formatted to standard ID-1 card dimensions (`85.60 × 53.98 mm`), positioned over the typical Aadhaar card region.
- **Move & Drag:** Simply click and drag inside the crop box to position it over your card.
- **Resize Handles:** 8 interactive resize handles (4 corners + 4 mid-edges) allow fine-tuning the crop boundary.
- **Quick Preset Layouts:**
  - 🪪 **Aadhaar Front:** Instantly snaps crop box to bottom-left front card.
  - 🪪 **Aadhaar Back:** Instantly snaps crop box to bottom-right back card.
  - 🎯 **Center Card:** Centers the ID-1 card box on the page.
  - 📐 **Both Cards:** Covers the entire lower card section.
- **Lock Card Ratio:** Automatically maintains standard 85.6 × 54 mm proportions while resizing so the card never distorts.
- **Original PDF Vector Clarity (600 / 800 DPI):** The crop extraction engine calculates exact vector scale equations directly from the PDF model to rasterize the card at 600 DPI (over 2000 × 1275 px), ensuring text, QR codes, emblems, and photos retain 100% original crisp vector clarity with zero blur or degradation.
- **1-Click Apply:** Directly apply the crop to either **Front** or **Back** card slot at full print DPI.

### Technical Details

- Uses [PDF.js](https://mozilla.github.io/pdf.js/) (Mozilla) for rendering
- Thumbnails rendered at ~110 px width for fast UI display
- Full-resolution render uses the **outputDpi** setting (150 / 300 / 600 DPI)
- Memory is released when you remove the PDF or reset the tool
- For offline/PWA use: self-host `pdf.worker.min.js` from
  `node_modules/pdfjs-dist/build/` and update `PDFJS_WORKER_SRC` in `app.js`
