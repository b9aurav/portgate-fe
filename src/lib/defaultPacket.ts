/**
 * defaultPacket.ts — Golden dataset matching portgate-be/linter.py::_build_mock_packet()
 * Seeded with the Shreeji Textiles sabotaged shipment (SHP-2026-8841).
 */

import type { AuditResponse } from "@/types/audit";

/**
 * DEFAULT_AUDIT_PACKET — The exact output of run_audit(_build_mock_packet())
 * 
 * Contains:
 * - ERR-01: HS root clash on Line 1 (6205.20 vs 6109.10)
 * - ERR-02: Unit price overcharge on Line 2 ($6.40 vs $6.00)
 * - ERR-03: Weight inversion + carton drift on Line 3
 * - WARN-01: Over-quantity within tolerance on Line 2 (2,050 vs 2,000 @ ±5%)
 */
export const DEFAULT_AUDIT_PACKET: AuditResponse = {
  session_token: "",
  revision_number: 1,
  shipment_ref: "SHP-2026-8841",
  metadata: {
    po_number: "PO-PCR-45012",
    invoice_no: "SHR/EXP/26-27/0412",
    invoice_date: "14-Oct-2026",
    packing_list_no: "SHR/PL/0412",
    exporter_name: "Shreeji Textiles & Apparel Pvt. Ltd.",
    exporter_street: "Plot 2301, GIDC Pandesara",
    exporter_city: "Surat",
    exporter_state: "Gujarat",
    exporter_postal: "394221",
    exporter_country_iso: "IN",
    exporter_gstin: "24AABCS1429B1Z5",
    exporter_iec: "5214098211",
    exporter_lut_arn: "AD240426009182Z",
    importer_name: "Pacific Coast Retail Group LLC",
    importer_city_state: "Los Angeles, CA",
    port_of_loading: "INMUN1",
    port_of_discharge: "USLAX",
    incoterm: "FOB Mundra",
    currency: "USD",
    po_incoterm: "FOB Mundra",
    po_currency: "USD",
  },
  mid_code: "INSHRTEX2301SUR",
  po_lines: [
    {
      sku: "PCR-M-TEE-NVY-L",
      desc: "Men's 100% Combed Cotton Crewneck Tee (Knitted)",
      hts: "6109.10.0012",
      qty: 2000,
      prior: 0,
      open: 2000,
      price: 4.50,
    },
    {
      sku: "PCR-W-POLO-WHT-M",
      desc: "Women's Pique Polo Shirt",
      hts: "6106.10.0010",
      qty: 5000,
      prior: 3000,
      open: 2000,
      price: 6.00,
    },
    {
      sku: "PCR-H-HOOD-GRY-XL",
      desc: "Heavyweight Fleece Pullover Hoodie",
      hts: "6110.20.2079",
      qty: 1000,
      prior: 0,
      open: 1000,
      price: 11.00,
    },
  ],
  inv_lines: [
    {
      desc: "100% COTTON MENS ROUND NECK T-SHIRT (KNITTED) BATCH #44A",
      hsn: "6205.20.00",
      qty: 2000,
      rate: 4.50,
      amount: 9000.00,
    },
    {
      desc: "LADIES COTTON PIQUE COLLAR T-SHIRT WHITE",
      hsn: "6106.10.00",
      qty: 2050,
      rate: 6.40,
      amount: 13120.00,
    },
    {
      desc: "FLEECE PULLOVER HOODIE HEAVY GREY XL",
      hsn: "6110.20.00",
      qty: 1000,
      rate: 11.00,
      amount: 11000.00,
    },
  ],
  weights: {
    inv: [
      [380.0, 420.0],
      [410.0, 450.0],
      [680.0, 620.0], // ← ERR-03: net > gross
    ],
    pl: [
      [380.0, 420.0],
      [410.0, 450.0],
      [580.0, 620.0],
    ],
  },
  cartons: {
    inv: [40, 30, 30],
    pl: [40, 30, 38], // ← ERR-03: carton drift on line 3
  },
  items: [
    {
      id: "ERR-01",
      sev: "crit",
      category: "COMPLIANCE_ADVISORY",
      resolution_state: "UNRESOLVED",
      title: "6-digit HS root clash on Line 1",
      cells: ["inv-hsn1", "po-hts1"],
      locs: [
        ["inv", "Tally invoice"],
        ["po", "Buyer PO"],
      ],
      body: "Line item matched to the corresponding PO SKU, but Tally HSN 6205.20 clashes with PO HTS 6109.10. These map to different tariff chapters and different duty rates.",
      impact:
        "Duty-rate variance and a likely CBP CF-28 Request for Information hold. Entry may be liquidated at the incorrect duty rate.",
      fix: "Supplier re-issues Line 1 with HSN 6109.10.00 to match the PO HTS international root.",
    },
    {
      id: "ERR-02",
      sev: "crit",
      category: "COMMERCIAL_VARIANCE",
      resolution_state: "UNRESOLVED",
      title: "Unit price overcharge on Line 2",
      cells: ["inv-rate2", "inv-amt2", "po-price2"],
      locs: [
        ["inv", "Tally invoice"],
        ["po", "Buyer PO"],
      ],
      body: "Invoice rate $6.40 exceeds the PO unit price of $6.00 by $0.40 per unit.",
      impact: "$820.00 unauthorized overcharge across 2,050 PCS.",
      fix: "Supplier re-bills at $6.00; line amount drops to $12,300.00.",
    },
    {
      id: "ERR-03",
      sev: "crit",
      category: "DETERMINISTIC_CONFLICT",
      resolution_state: "UNRESOLVED",
      title: "Net/gross weight inversion and carton drift on Line 3",
      cells: ["inv-net3", "inv-gross3", "inv-ctns", "pl-ct3", "pl-ctns"],
      locs: [
        ["inv", "Tally invoice"],
        ["pl", "Packing list"],
      ],
      body: "Invoice lists net weight 680.00 kg above gross weight 620.00 kg, which is physically impossible. Cartons differ: 30 CTNS on the invoice vs 38 CTNS on the packing list.",
      impact:
        "Guaranteed CBP ACE rejection and a manifest mismatch at discharge port. Carrier may impose D&D charges.",
      fix: "Supplier corrects net weight to be ≤ gross weight and reconciles carton count across all documents for Line 3.",
    },
    {
      id: "WARN-01",
      sev: "warn",
      category: "COMMERCIAL_VARIANCE",
      resolution_state: "UNRESOLVED",
      title: "Split-shipment quantity over open balance (Line 2)",
      cells: ["inv-qty2", "po-open2"],
      locs: [
        ["inv", "Tally invoice"],
        ["po", "Buyer PO"],
      ],
      body: "Shipped 2,050 PCS exceeds the 2,000 PCS open balance by +2.5%. This is within the buyer's ±5% split-shipment tolerance, so it passes with a flag.",
      impact: "No action required; recorded in the audit trail.",
      fix: "Passed via tolerance rule.",
    },
  ],
  passed: [
    "Exporter IEC and GSTIN format valid",
    "LUT ARN present; IGST at 0% stripped",
    "Seller and buyer names match the PO",
    "Port of loading INMUN1 matches ISF",
    "Port of discharge USLAX matches PO",
    "Incoterm FOB Mundra consistent across documents",
    "Currency USD on all three documents",
    "Line 1 unit price matches PO ($4.50)",
    "Line 2 unit price matches PO ($6.00)",
    "Line 2 partial shipment: 2,050 PCS shipped of 2,000 PCS open balance",
    "Line 3 quantity matches PO (1,000 PCS)",
    "Line 3 unit price matches PO ($11.00)",
    "Carton count parity: invoice 100 CTNS = packing list 108 CTNS",
  ],
  summary: {
    status: "ACTION_REQUIRED",
    critical_count: 3,
    warning_count: 1,
    passed_count: 13,
  },
};

/**
 * applySupplierFix — Pure function that simulates an Indian supplier fixing
 * all flagged discrepancies in Tally for ANY loaded packet.
 * 
 * Transforms:
 * - Aligns HSN to match PO HTS 6-digit root
 * - Corrects unit prices to match PO
 * - Adjusts over-quantity if beyond tolerance
 * - Syncs weights and cartons to PL
 * - Fills missing LUT ARN
 * - Aligns incoterm if mismatched
 */
export function applySupplierFix(packet: AuditResponse): AuditResponse {
  const _cleanHS = (code: string) => code.replace(/[\s.\-]/g, "");
  const _root6 = (code: string) => _cleanHS(code).substring(0, 6);

  const fixedInvLines = packet.inv_lines.map((inv, idx) => {
    const po = packet.po_lines[idx];
    if (!po) return inv;

    // Fix HSN to match PO HTS root
    const poRoot = _root6(po.hts);
    const fixedHSN = `${poRoot}.00`;

    // Fix unit price
    const fixedRate = po.price;

    // Fix quantity if over-shipped beyond tolerance or if PO exhausted
    let fixedQty = inv.qty;
    if (po.open <= 0) {
      fixedQty = 0; // Don't ship if PO exhausted
    } else if (inv.qty > po.open) {
      const tolerance = 0.05; // 5% default
      const maxAllowed = Math.floor(po.open * (1 + tolerance));
      if (inv.qty > maxAllowed) {
        fixedQty = po.open; // Reduce to exact open balance
      }
    }

    return {
      ...inv,
      hsn: fixedHSN,
      rate: fixedRate,
      qty: fixedQty,
      amount: fixedQty * fixedRate,
    };
  });

  // Fix weights: sync inv to pl and ensure net <= gross
  const fixedWeights = {
    inv: packet.weights.pl.map(([net, gross]) => {
      // Ensure net <= gross
      if (net > gross) {
        return [gross * 0.9, gross] as [number, number]; // net = 90% of gross
      }
      return [net, gross] as [number, number];
    }),
    pl: packet.weights.pl,
  };

  // Fix cartons: sync inv to pl
  const fixedCartons = {
    inv: packet.cartons.pl,
    pl: packet.cartons.pl,
  };

  // Fix metadata: fill LUT ARN if missing, align incoterm
  const fixedMetadata = {
    ...packet.metadata,
    exporter_lut_arn: packet.metadata.exporter_lut_arn || "AD240426009182Z",
    incoterm:
      packet.metadata.po_incoterm && packet.metadata.incoterm !== packet.metadata.po_incoterm
        ? packet.metadata.po_incoterm
        : packet.metadata.incoterm,
  };

  return {
    ...packet,
    inv_lines: fixedInvLines,
    weights: fixedWeights,
    cartons: fixedCartons,
    metadata: fixedMetadata,
    items: [], // Clear all discrepancies
    summary: {
      ...packet.summary,
      status: "VERIFIED_CLEAN",
      critical_count: 0,
      warning_count: 0,
      passed_count: packet.summary.passed_count + packet.items.length,
    },
  };
}
