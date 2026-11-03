import type { AuditResponse, DiscrepancyItem, ShipmentListItem } from "./types";

/**
 * Extracts a concise, human-readable comparison detail from a discrepancy item.
 * E.g.: "Invoice (100 CTNS) vs. Packing List (110 CTNS)"
 * E.g.: "Printed $4,850.00 vs. Calculated $4,750.00"
 */
function extractComparisonDetail(item: DiscrepancyItem): string {
  // 1. Direct source values if present
  if (item.source_val_a && item.source_val_b) {
    const docA = item.source_doc_a || "Doc A";
    const docB = item.source_doc_b || "Doc B";
    return `${docA} (${item.source_val_a}) vs. ${docB} (${item.source_val_b})`;
  }

  // 2. Specific known rules patterns
  const desc = item.description || item.body || "";

  // Carton Mismatch pattern
  const cartonMatch = desc.match(/declares\s+(\d+)\s+cartons?.*?totals\s+(\d+)\s+cartons?/i);
  if (cartonMatch) {
    return `Invoice (${cartonMatch[1]} CTNS) vs. Packing List (${cartonMatch[2]} CTNS)`;
  }

  // Weight Inversion pattern
  const weightMatch = desc.match(/Net\s+Weight\s*\(([0-9.]+)\s*kg\).*?Gross\s+Weight\s*\(([0-9.]+)\s*kg\)/i);
  if (weightMatch) {
    return `Net (${weightMatch[1]} kg) vs. Gross (${weightMatch[2]} kg)`;
  }

  // Arithmetic / Rate pattern
  const priceMatch = desc.match(/(\$[0-9,.]+).*?vs.*?(\$[0-9,.]+)/i);
  if (priceMatch) {
    return `Printed ${priceMatch[1]} vs. Calculated ${priceMatch[2]}`;
  }

  // 3. Fallback to first sentence of body/description
  if (desc) {
    const firstSentence = desc.split(". ")[0].trim();
    return firstSentence.endsWith(".") ? firstSentence.slice(0, -1) : firstSentence;
  }

  return "";
}

/**
 * Formats a single discrepancy bullet for the Message / Email brief:
 * • [CRITICAL] Carton Count Mismatch: Invoice (100 CTNS) vs. Packing List (110 CTNS)
 */
function formatBullet(item: DiscrepancyItem): string {
  const isCrit = item.sev === "crit" || item.severity === "CRITICAL";
  const sevTag = isCrit ? "[CRITICAL]" : "[WARNING]";

  // Clean title: remove redundant trailing parentheticals like "(Invoice vs. Packing List)"
  let cleanTitle = item.title
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/^Line #\d+:\s*/, (match) => match.replace(":", ""))
    .trim();

  const detail = extractComparisonDetail(item);

  if (detail && !cleanTitle.toLowerCase().includes(detail.toLowerCase())) {
    return `• ${sevTag} ${cleanTitle}: ${detail}`;
  }
  return `• ${sevTag} ${item.title}`;
}

/**
 * Generates a clean, high-urgency Message / Email Discrepancy Brief
 * matching the exact enterprise format expected by suppliers.
 */
export function generateDiscrepancyBrief(
  audit?: AuditResponse | null,
  row?: ShipmentListItem | null,
  origin?: string
): string {
  const m = audit?.metadata || ({} as any);
  const shipmentId =
    audit?.packet?.shipment_id ||
    audit?.shipment_ref ||
    row?.shipment_id ||
    "SHP-UNKNOWN";

  const poNumber =
    audit?.packet?.buyer_po?.po_number ||
    m?.po_number ||
    row?.po_number ||
    "PO-UNKNOWN";

  const invoiceNumber =
    audit?.packet?.commercial_invoice?.invoice_number ||
    m?.invoice_no ||
    row?.invoice_number ||
    "INV-UNKNOWN";

  const rev = audit?.revision_number || row?.revision_number || 1;
  const token = audit?.session_token || row?.session_token || "";
  const host =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const revisionUrl = `${host}/upload/${token}`;

  const allItems: DiscrepancyItem[] = audit?.discrepancies || audit?.items || [];
  const unresolved = allItems.filter(
    (d) =>
      !d.resolution_state ||
      d.resolution_state === "UNRESOLVED" ||
      d.resolution_state === "REVISION_REQUESTED"
  );

  const hardConflicts = unresolved.filter(
    (d) => d.category === "DETERMINISTIC_CONFLICT" || d.sev === "crit" || d.severity === "CRITICAL"
  );
  const variances = unresolved.filter(
    (d) => d.category === "COMMERCIAL_VARIANCE"
  );
  const advisories = unresolved.filter(
    (d) => d.category === "COMPLIANCE_ADVISORY"
  );

  // If no detailed items are available (e.g. from row summary only)
  const detCount = hardConflicts.length || row?.deterministic_conflict_count || 0;
  const varCount = variances.length || row?.commercial_variance_count || 0;
  const advCount = advisories.length || row?.compliance_advisory_count || 0;

  const lines: string[] = [];

  if (detCount > 0) {
    lines.push(`⚠️ PortGate Pre-Shipment Hold: #${shipmentId} (${poNumber})`);
    lines.push(`Invoice: ${invoiceNumber} (Rev v${rev})`);
    lines.push("");
    lines.push(
      `${detCount} Hard Conflict${detCount > 1 ? "s" : ""} require Tally correction before shipping bill/customs filing:`
    );

    if (hardConflicts.length > 0) {
      for (const item of hardConflicts) {
        lines.push(formatBullet(item));
      }
    } else {
      lines.push("• [CRITICAL] Deterministic document mismatch detected across Invoice and Packing List.");
    }
  } else if (varCount > 0 || advCount > 0) {
    const totalReview = varCount + advCount;
    lines.push(`📋 PortGate Pre-Shipment Review: #${shipmentId} (${poNumber})`);
    lines.push(`Invoice: ${invoiceNumber} (Rev v${rev})`);
    lines.push("");
    lines.push(
      `${totalReview} Commercial Decision${totalReview > 1 ? "s" : ""} flagged for buyer review:`
    );

    const nonHard = [...variances, ...advisories];
    if (nonHard.length > 0) {
      for (const item of nonHard) {
        lines.push(formatBullet(item));
      }
    } else {
      lines.push("• [WARNING] Commercial price or quantity variance requires authorization.");
    }
  } else {
    lines.push(`✅ PortGate Pre-Shipment Clearance: #${shipmentId} (${poNumber})`);
    lines.push(`Invoice: ${invoiceNumber} (Rev v${rev})`);
    lines.push("");
    lines.push("All 3-way compliance checks passed. Packet cleared for customs filing.");
  }

  lines.push("");
  lines.push("Upload corrected Commercial Invoice / Packing List here (No login required):");
  lines.push(revisionUrl);

  return lines.join("\n");
}

