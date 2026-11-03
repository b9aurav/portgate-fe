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
    total_cartons_declared: 100,
    total_cartons: 110,
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
      [520.0, 490.0], // ← ERR-03: Line 3 net (520) > gross (490)
    ],
    pl: [
      [380.0, 420.0],
      [410.0, 450.0],
      [520.0, 490.0],
    ],
  },
  cartons: {
    inv: [40, 30, 30],
    pl: [40, 30, 40],
  },
  items: [
    {
      id: "DISC-CARTONS",
      rule_id: "RULE-D01-CARTON-SYNC",
      sev: "crit",
      severity: "CRITICAL",
      category: "DETERMINISTIC_CONFLICT",
      resolution_state: "UNRESOLVED",
      title: "Carton Count Mismatch (Invoice vs. Packing List)",
      cells: ["inv-ctns", "pl-ctns"],
      locs: [
        ["inv", "Commercial Invoice"],
        ["pl", "Packing List"],
      ],
      body: "Commercial Invoice declares 100 cartons, but Packing List totals 110 cartons (10 carton variance). Both documents must agree before shipping bill and customs manifest generation.",
      impact: "Mismatched carton counts trigger mandatory physical container exams and customs holds.",
      fix: "Regenerate invoice or packing list in exporter ERP so total carton count is identical.",
      recommended_actions: [
        "Verify physical warehouse tally sheet",
        "Regenerate either Tally Invoice or Packing List so carton counts match",
      ],
    },
    {
      id: "DISC-WEIGHT-INV",
      rule_id: "RULE-D02-WEIGHT-PHYSICS",
      sev: "crit",
      severity: "CRITICAL",
      category: "DETERMINISTIC_CONFLICT",
      resolution_state: "UNRESOLVED",
      title: "Line #3: Physical Weight Inversion (Net 520.0 kg > Gross 490.0 kg)",
      cells: ["pl-net3", "pl-gross3", "inv-net3", "inv-gross3"],
      locs: [
        ["pl", "Packing List"],
        ["inv", "Commercial Invoice"],
      ],
      body: "Line #3 (Cartons 71-110: HEAVYWEIGHT FLEECE PULLOVER HOODIE): Inverted weights declared on Packing List — Net Weight (520.0 kg) exceeds Gross Weight (490.0 kg) by 30.0 kg. Net cargo weight cannot physically exceed carton gross weight.",
      impact: "CBP ACE entry summary rejection. Cargo will be held at port of entry for scale re-weigh and manifest examination.",
      fix: "Re-scale Line #3 cartons and swap inverted Net (520.0 kg) vs Gross (490.0 kg) weights.",
      recommended_actions: [
        "Request corrected Packing List with accurate tare weights",
        "Re-scale carton weights at factory before container stuffing",
      ],
    },
    {
      id: "DISC-PRICE2",
      rule_id: "RULE-V01-PRICE-MATCH",
      sev: "crit",
      severity: "CRITICAL",
      category: "COMMERCIAL_VARIANCE",
      resolution_state: "UNRESOLVED",
      title: "Unit Price Mismatch (Line 2)",
      cells: ["po-price2", "inv-rate2"],
      locs: [
        ["inv", "Commercial Invoice"],
        ["po", "Buyer PO"],
      ],
      body: "Line #2: Commercial Invoice unit rate ($6.40) exceeds agreed Purchase Order unit price ($6.00) by +$0.40/PCS (+6.7% over agreed contract rate).",
      impact: "Over-billing variance triggers AP payment block and buyer debit memo.",
      fix: "Supplier must re-issue Commercial Invoice adjusting unit price to $6.00.",
      recommended_actions: [
        "Buyer signs off on unit price discrepancy note",
        "Supplier re-issues Commercial Invoice with corrected unit price $6.00",
      ],
    },
    {
      id: "DISC-QTY2",
      rule_id: "RULE-V02-QTY-TOLERANCE",
      sev: "warn",
      severity: "WARNING",
      category: "COMMERCIAL_VARIANCE",
      resolution_state: "UNRESOLVED",
      title: "Split-Shipment Quantity Variance (Line 2)",
      cells: ["po-open2", "inv-qty2"],
      locs: [
        ["inv", "Commercial Invoice"],
        ["po", "Buyer PO"],
      ],
      body: "Line #2: Invoiced quantity 2,050 PCS exceeds PO remaining open balance 2,000 PCS by +50 PCS (+2.5%), within allowed +/-5.0% tolerance window.",
      impact: "Non-critical quantity variance within commercial contractual tolerance.",
      fix: "Buyer can accept exception or record over-delivery against next replenishment order.",
      recommended_actions: [
        "Buyer accepts over-shipment within tolerance",
        "Adjust remaining PO balance to 0",
      ],
    },
    {
      id: "DISC-HSN1",
      rule_id: "RULE-C01-HSN-HTS-ROOT",
      sev: "crit",
      severity: "CRITICAL",
      category: "COMPLIANCE_ADVISORY",
      resolution_state: "UNRESOLVED",
      title: "HSN / HTS Classification Mismatch (Line 1)",
      cells: ["po-hts1", "inv-hsn1"],
      locs: [
        ["inv", "Commercial Invoice"],
        ["po", "Buyer PO"],
      ],
      body: "Line #1: 6-digit HS root mismatch between Commercial Invoice HSN (6205.20) and Buyer PO HTS (6109.10). International 6-digit tariff root must agree across trade corridor documents.",
      impact: "Customs declaration will trigger tariff misclassification hold and duty rate reassessment.",
      fix: "Exporter must amend invoice HSN to match agreed Buyer PO HTS root 6109.10.",
      recommended_actions: [
        "Amend Commercial Invoice HSN code to 6109.10.00",
        "Request broker advisory classification ruling",
      ],
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
    "Line 3 quantity matches PO (1,000 PCS)",
    "Line 3 unit price matches PO ($11.00)",
  ],
  summary: {
    status: "ACTION_REQUIRED",
    critical_count: 4,
    warning_count: 1,
    passed_count: 10,
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

  // Fix metadata: fill LUT ARN if missing, align incoterm, sync declared cartons
  const fixedMetadata = {
    ...packet.metadata,
    total_cartons_declared: packet.metadata.total_cartons || 110,
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
