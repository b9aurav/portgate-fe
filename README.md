# PortGate Frontend

**Pre-Shipment 3-Way Customs Compliance Engine** — Production-ready Next.js (App Router, TypeScript, Tailwind CSS) frontend for the India→US trade corridor.

## Architecture

- **Framework:** Next.js 16.4+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State:** React Context API (HighlightContext)
- **Backend:** FastAPI (portgate-be)

## Project Structure

```
portgate-fe/
├── src/
│   ├── types/
│   │   └── audit.ts           # TypeScript interfaces mirroring portgate-be/schemas.py
│   ├── lib/
│   │   └── defaultPacket.ts   # Golden dataset + applySupplierFix() function
│   ├── context/
│   │   └── HighlightContext.tsx # Interactive cell highlighting state
│   └── components/
│       ├── HighlightCell.tsx   # <Hl> wrapper for cell highlighting
│       ├── DocumentViewer.tsx  # Left-pane tabbed document viewer (PO/Invoice/PL)
│       ├── AuditSidebar.tsx    # Right-pane compliance engine control center
│       ├── UploadModal.tsx     # PDF upload modal (multipart/form-data)
│       └── ExportModal.tsx     # ISF (10+2) + CargoWise CSV export
├── app/
│   ├── page.tsx                # Main dashboard (split-screen workspace)
│   ├── layout.tsx              # Root layout with metadata
│   └── globals.css             # Tailwind imports + custom styles
├── .env.local                  # Local environment config (NEXT_PUBLIC_API_URL)
├── .env.local.example          # Environment template
└── package.json
```

## Setup

### 1. Install Dependencies

```bash
cd portgate-fe
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set the backend URL:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features

### Interactive Cell Highlighting

When you click a discrepancy item (`ERR-01`, `WARN-01`, etc.) in the right sidebar:

1. The relevant document tab is automatically switched
2. All affected cells are highlighted (red for `crit`, amber for `warn`)
3. The view smoothly scrolls to the highlighted cell

This uses:
- `<Hl id="inv-hsn1">` wrapper components
- `HighlightContext` for global state
- `data-hl="1"` attribute for scroll targeting

### Supplier Fix Simulation

The `🔧 Simulate Supplier Fix in Tally` button applies the following transformations to ANY loaded packet:

- Aligns HSN codes to match PO HTS 6-digit roots
- Corrects unit prices to match PO
- Adjusts over-quantities to compliant levels
- Syncs invoice weights and cartons to packing list
- Fills missing LUT ARN
- Aligns incoterm if mismatched

**Implementation:** `applySupplierFix()` in `src/lib/defaultPacket.ts` — a pure function that never mutates the original packet.

### Compliance Certificate

When `isFixed === true` or `summary.status === "CLEAR"`, the Invoice document displays a green **PortGate Compliance Certificate** with:

- Shipment Ref + MID Code
- SHA-256 hash (computed via `crypto.subtle.digest`)
- "CLEAR" status badge

### Export Modal

Two views:

1. **ISF (10+2) Preview:** Displays all required fields for US CBP Importer Security Filing
2. **CargoWise CSV:** Shows and downloads the generated CSV table (`portgate_${shipment_ref}_cargowise.csv`)

## Backend Integration

All API calls use `process.env.NEXT_PUBLIC_API_URL`:

- `GET /api/health` — Backend health check (polled on mount)
- `POST /api/audit` — 3-way compliance audit (multipart/form-data with `po_pdf`, `inv_pdf`, `pl_pdf`, `tolerance_pct`, `mock`)

### Upload Modal

Supports two modes:

1. **Live Gemini Extraction** (`mock=false`): Uploads 3 PDFs to backend for multimodal LLM extraction
2. **Backend Mock Mode** (`mock=true`): Uses the backend's built-in sabotaged packet (Shreeji Textiles `SHP-2026-8841`) — useful for testing without consuming Gemini tokens

## Golden Dataset

The default packet loaded on mount is `DEFAULT_AUDIT_PACKET` from `src/lib/defaultPacket.ts`, which mirrors the exact output of `run_audit(_build_mock_packet())` from `portgate-be/linter.py`:

- **Shipment Ref:** `SHP-2026-8841`
- **Exporter:** Shreeji Textiles & Apparel Pvt. Ltd. (Surat, Gujarat, IN)
- **Importer:** Pacific Coast Retail Group LLC (Los Angeles, CA)
- **MID Code:** `INSHRTEX2301SUR`
- **Status:** `BLOCKED` (3 critical, 1 warning)

### Sabotaged Errors

- `ERR-01`: HS root clash on Line 1 (6205.20 vs 6109.10)
- `ERR-02`: Unit price overcharge on Line 2 ($6.40 vs $6.00)
- `ERR-03`: Weight inversion + carton drift on Line 3 (net 680kg > gross 620kg, 30 vs 38 CTNS)
- `WARN-01`: Over-quantity within tolerance on Line 2 (2,050 vs 2,000 @ ±5%)

## Zero-Crash Guarantee

All `<button>` elements explicitly include `type="button"` to prevent accidental form submissions that cause Chrome tab crashes. All modal callbacks are safely guarded.

## Build for Production

```bash
npm run build
npm start
```

## Deployment

Deploy to Vercel, Netlify, or any Node.js host. Ensure `NEXT_PUBLIC_API_URL` points to your production FastAPI backend.

## License

Proprietary — PortGate is a closed-source compliance tool for India→US export shipments.
