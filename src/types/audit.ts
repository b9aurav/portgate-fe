/**
 * audit.ts — TypeScript interfaces mirroring portgate-be/models.py
 * Single source of truth for all audit response types, decision logging, and session state.
 */

export type Severity = "crit" | "warn";

export type FindingCategory =
  | "DETERMINISTIC_CONFLICT"
  | "COMMERCIAL_VARIANCE"
  | "COMPLIANCE_ADVISORY";

export type SeverityLevel = "CRITICAL" | "WARNING" | "INFO";

export type ResolutionState =
  | "UNRESOLVED"
  | "REVISION_REQUESTED"
  | "ACCEPTED_EXCEPTION"
  | "ESCALATED_TO_BROKER";

export type AuditOverallStatus =
  | "ACTION_REQUIRED"
  | "CLEARED_WITH_EXCEPTIONS"
  | "VERIFIED_CLEAN"
  | "BLOCKED"
  | "CLEAR";

export type WorkspaceRole = "SUPPLIER_PORTAL" | "BUYER_WORKBENCH";

export interface DiscrepancyItem {
  id: string; // e.g. "ERR-01", "WARN-01", "RULE-D01-CARTON-COUNT"
  rule_id?: string;
  category?: FindingCategory;
  severity?: SeverityLevel;
  sev: Severity; // "crit" | "warn"
  title: string;
  description?: string;
  source_doc_a?: string;
  source_field_a?: string;
  source_val_a?: string;
  source_doc_b?: string;
  source_field_b?: string;
  source_val_b?: string;
  highlight_cells?: string[];
  cells: string[]; // Cell IDs to highlight, e.g. ["inv-hsn1", "po-hts1"]
  locs: [string, string][]; // [[tab_key, human_label], ...]
  body: string;
  impact: string;
  fix: string;
  financial_impact_note?: string;
  recommended_actions?: string[];
  resolution_state?: ResolutionState;
  resolution_reason_chip?: string;
  resolution_note?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export interface AuditDecisionLogEntry {
  id: string;
  discrepancy_id: string;
  title: string;
  previous_state: ResolutionState;
  new_state: ResolutionState;
  action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER";
  reason_chip: string;
  note?: string;
  actor_role: WorkspaceRole;
  actor_name: string;
  timestamp: string;
}

export interface AuditSummary {
  status: string; // "ACTION_REQUIRED" | "CLEARED_WITH_EXCEPTIONS" | "VERIFIED_CLEAN" | "BLOCKED" | "CLEAR"
  audit_mode?: string;
  ruleset_version?: string;
  total_findings?: number;
  deterministic_conflicts?: number;
  commercial_variances?: number;
  compliance_advisories?: number;
  unresolved_count?: number;
  critical_count: number;
  warning_count: number;
  passed_count: number;
}

export interface POLineOut {
  sku: string;
  desc: string;
  hts: string;
  qty: number;
  prior: number;
  open: number;
  price: number;
}

export interface InvLineOut {
  desc: string;
  hsn: string;
  qty: number;
  rate: number;
  amount?: number;
}

export interface WeightsOut {
  inv: [number, number][]; // [[net_kg, gross_kg], ...]
  pl: [number, number][];
}

export interface CartonsOut {
  inv: number[];
  pl: number[];
}

export interface MetadataOut {
  po_number: string;
  invoice_no: string;
  invoice_date: string;
  packing_list_no: string;
  exporter_name: string;
  exporter_street?: string;
  exporter_city?: string;
  exporter_state?: string;
  exporter_postal?: string;
  exporter_country_iso?: string;
  exporter_gstin?: string;
  exporter_iec?: string;
  exporter_lut_arn?: string;
  importer_name: string;
  importer_city_state?: string;
  port_of_loading: string;
  port_of_discharge: string;
  incoterm: string;
  currency: string;
  po_incoterm?: string;
  po_currency?: string;
  [key: string]: any;
}

// ────────────────────────────────────────────────────────────────────────────
// Structured Shipment Packet types (mirrors portgate-be/models.py)
// ────────────────────────────────────────────────────────────────────────────

export interface POLineItem {
  line_no: number;
  sku?: string;
  description: string;
  hts_code: string;
  quantity: number;
  uom: string;
  unit_price_usd: number;
  total_usd: number;
}

export interface BuyerPO {
  po_number: string;
  buyer_name: string;
  po_date: string;
  incoterms: string;
  quantity_tolerance_pct: number;
  line_items: POLineItem[];
  total_po_value_usd: number;
}

export interface InvoiceLineItem {
  line_no: number;
  po_line_ref?: number;
  description: string;
  hsn_code: string;
  quantity: number;
  uom: string;
  unit_price_usd: number;
  total_usd: number;
  match_confidence?: "HIGH" | "MEDIUM" | "REVIEW_REQUIRED";
}

export interface CommercialInvoice {
  invoice_number: string;
  invoice_date: string;
  exporter_name: string;
  exporter_gstin?: string;
  export_tax_route?: string;
  lut_arn_number?: string;
  igst_amount_usd?: number;
  buyer_po_ref?: string;
  total_cartons_declared: number;
  total_net_weight_kg: number;
  total_gross_weight_kg: number;
  total_invoice_value_usd: number;
  line_items: InvoiceLineItem[];
}

export interface PackingListCartonGroup {
  line_no: number;
  description: string;
  carton_count: number;
  total_quantity: number;
  uom: string;
  net_weight_kg: number;
  gross_weight_kg: number;
}

export interface PackingList {
  pl_number: string;
  invoice_ref: string;
  total_cartons: number;
  total_quantity: number;
  total_net_weight_kg: number;
  total_gross_weight_kg: number;
  items: PackingListCartonGroup[];
}

export interface ShipmentPacket {
  shipment_id: string;
  corridor: string;
  buyer_po?: BuyerPO | null;
  commercial_invoice: CommercialInvoice;
  packing_list: PackingList;
}

// ────────────────────────────────────────────────────────────────────────────
// Unified AuditResponse (returned by /api/audit, /api/links/{token}, /re-audit)
// ────────────────────────────────────────────────────────────────────────────

export interface AuditResponse {
  session_token: string;
  revision_number: number;
  packet?: ShipmentPacket;
  discrepancies?: DiscrepancyItem[];
  shipment_ref: string;
  metadata: MetadataOut;
  mid_code: string;
  po_lines: POLineOut[];
  inv_lines: InvLineOut[];
  weights: WeightsOut;
  cartons: CartonsOut;
  items: DiscrepancyItem[];
  passed: string[];
  summary: AuditSummary;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  gemini_model: string;
  api_key_configured: boolean;
  active_sessions?: number;
}

// Type aliases for compatibility
export type MagicLinkAuditResponse = AuditResponse;
export type MagicLinkDiscrepancy = DiscrepancyItem;
export type MagicLinkSession = AuditResponse;
