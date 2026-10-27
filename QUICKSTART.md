# PortGate Frontend — Quick Start Guide

## Prerequisites

- Node.js 20+ (for Next.js 16)
- Backend API running at `http://localhost:8000` (see `../portgate-be`)

## Installation

```bash
cd portgate-fe
npm install
```

## Configuration

The `.env.local` file is already configured with:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If your backend runs on a different port, edit `.env.local` accordingly.

## Development

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First Run

On first load, you'll see:

1. **Top Navigation:**
   - Shipment Ref: `SHP-2026-8841`
   - Route: `INMUN1 → USLAX`
   - Status badge: `BLOCKED` (red)
   - Backend health indicator

2. **Left Pane (Document Viewer):**
   - Three tabs: `1 · Buyer PO`, `2 · Tally Invoice`, `3 · Packing List`
   - Currently showing the **US Buyer Purchase Order** from Pacific Coast Retail Group
   - Paper-styled ERP document with realistic formatting

3. **Right Pane (Audit Sidebar):**
   - Status summary: `🚫 BLOCKED` (3 critical, 1 warning, 13 passed)
   - Action buttons:
     - `🔧 Simulate Supplier Fix in Tally` — Click to see auto-correction
     - `📦 Export CargoWise CSV & ISF (10+2)` — Disabled until fixed
   - Discrepancy cards:
     - `ERR-01`: HS root clash on Line 1
     - `ERR-02`: Unit price overcharge on Line 2
     - `ERR-03`: Weight inversion + carton drift on Line 3
     - `WARN-01`: Over-quantity within tolerance on Line 2
   - Passed checks list

## Interactive Cell Highlighting

Click any discrepancy card (e.g., `ERR-01`):

1. The relevant document tab automatically switches (e.g., to `2 · Tally Invoice`)
2. The affected cells are highlighted in **red** (critical) or **amber** (warning)
3. The view smoothly scrolls to the highlighted cell
4. Location pills at the bottom of each card allow direct navigation between documents

Example: Click `ERR-01` → switches to Invoice tab → highlights `inv-hsn1` (6205.20.00) in red → click the `Buyer PO` pill → switches to PO tab → highlights `po-hts1` (6109.10.0012) in red.

## Supplier Fix Simulation

Click `🔧 Simulate Supplier Fix in Tally` to see:

1. All 3 critical errors and 1 warning automatically resolved
2. Status changes from `BLOCKED` to `CLEAR`
3. Green **PortGate Compliance Certificate** appears at the bottom of the Invoice
4. Export button becomes enabled

The fix applies these transformations:
- HSN `6205.20.00` → `6109.10.00` (Line 1)
- Unit price `$6.40` → `$6.00` (Line 2)
- Qty `2,050` → `2,000` (Line 2, within tolerance)
- Net weight `680.0 kg` → `580.0 kg`, Cartons `30` → `38` (Line 3)

## Upload Custom Packet

Click `+ Upload Custom Packet` in the top navigation or `📄 Upload Custom PDF Packet` in the right sidebar:

1. **Backend Mock Mode** (checkbox): Uses the backend's built-in sabotaged packet without uploading files
2. **Live Gemini Extraction** (unchecked): Upload your own PO/Invoice/Packing List PDFs for multimodal LLM extraction
3. **Split-Shipment Tolerance (%)**: Adjust the tolerance (default 5.0%)
4. Click `⚡ Run Audit` to submit

The UI enters "run" phase (dark terminal animation) for ~2.5 seconds, then transitions to "done" phase with the new audit results.

## Export Documents

After fixing discrepancies (or if the packet is already `CLEAR`), click `📦 Export CargoWise CSV & ISF (10+2)`:

1. **ISF (10+2) Preview** tab:
   - Shows all required fields for US CBP Importer Security Filing
   - Seller, Buyer, MID Code, Country of Origin, Ports, 6-Digit HS/HTS codes
2. **CargoWise CSV** tab:
   - Preview the generated CSV table
   - Click `⬇️ Download CSV` to save `portgate_${shipment_ref}_cargowise.csv`

## Backend Integration

The frontend communicates with the FastAPI backend via:

- `GET /api/health` — Health check (polled on mount)
- `POST /api/audit` — 3-way compliance audit (multipart/form-data)

If the backend is not running, you'll see a grey "Backend: UNKNOWN" badge in the top navigation.

## Troubleshooting

### "Backend: UNKNOWN" badge

The backend is not reachable at `http://localhost:8000`. Ensure the FastAPI server is running:

```bash
cd ../portgate-be
uvicorn main:app --reload --port 8000
```

### "Audit failed: 404 NOT_FOUND"

The backend is running, but the `/api/audit` endpoint returned 404. Check that:
1. You're running the latest version of `portgate-be`
2. The backend's `main.py` defines `POST /api/audit`
3. The backend's `GOOGLE_API_KEY` is set in `.env` (if using live Gemini extraction)

### "Failed to fetch" error

CORS issue. The backend must allow `http://localhost:3000` as an origin. Check `portgate-be/main.py`:

```python
allowed_origins = ["*"]  # or ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, ...)
```

## Production Build

```bash
npm run build
npm start
```

The production build will be available at [http://localhost:3000](http://localhost:3000).

## Next Steps

1. Try clicking different discrepancy cards to see interactive highlighting
2. Simulate the supplier fix and observe the green compliance certificate
3. Export the ISF (10+2) and CargoWise CSV
4. Upload your own custom PDF packet (if you have test files)
5. Adjust the split-shipment tolerance and re-run the audit

---

**Need help?** Check `README.md` for detailed architecture documentation.
