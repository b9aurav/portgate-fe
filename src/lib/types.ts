/**
 * types.ts — TypeScript interfaces matching the PortGate backend API JSON contract.
 * Mirrors domain schemas, discrepancy categories, resolution states, and UI view models.
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
  | "ESCALATED_TO_BROKER"
  | "CLEARED_BY_REVISION"
  | "CLEARED_IN_REVISION";

export type AuditOverallStatus =
  | "ACTION_REQUIRED"
  | "CLEARED_WITH_EXCEPTIONS"
  | "VERIFIED_CLEAN"
  | "BLOCKED"
  | "CLEAR";

export type WorkspaceRole = "SUPPLIER_PORTAL" | "BUYER_WORKBENCH";

export interface DiscrepancyItem {
  id: string; // e.g. "DISC-CARTONS", "DISC-HSN1"
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
  action:
    | "REQUEST_REVISION"
    | "ACCEPT_VARIANCE"
    | "ESCALATE_BROKER"
    | "CLEARED_BY_REVISION"
    | "CLEARED_IN_REVISION"
    | "REOPEN_FOR_REVISION"
    | "REOPEN_SHIPMENT"
    | "EXTEND_EXPIRY"
    | "ROTATE_LINK"
    | string;
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
  buyer_po_ref?: string;
  invoice_po_ref?: string;
  po_supplier_name?: string;
  po_supplier_address?: string;
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
  supplier_name?: string;
  vendor_name?: string;
  supplier_address?: string;
  po_date?: string;
  incoterms?: string;
  currency?: string;
  payment_terms?: string;
  line_items: POLineItem[];
  total_po_value_usd: number;
  quantity_tolerance_pct: number;
}

export interface InvoiceLineItem {
  line_no: number;
  description: string;
  hsn_code: string;
  quantity: number;
  uom: string;
  unit_price_usd: number;
  total_usd: number;
}

export interface CommercialInvoice {
  invoice_number: string;
  invoice_date: string;
  buyer_po_number: string;
  buyer_po_ref?: string;
  exporter_name: string;
  importer_name: string;
  export_tax_route: string;
  lut_arn_number?: string | null;
  total_cartons_declared: number;
  total_net_weight_kg: number;
  total_gross_weight_kg: number;
  total_invoice_value_usd: number;
  line_items: InvoiceLineItem[];
}

export interface PackingListCartonGroup {
  carton_start: number;
  carton_end: number;
  carton_count: number;
  description: string;
  quantity: number;
  uom: string;
  net_weight_kg: number;
  gross_weight_kg: number;
}

export interface PackingList {
  packing_list_number: string;
  invoice_number: string;
  total_cartons: number;
  total_net_weight_kg: number;
  total_gross_weight_kg: number;
  carton_groups: PackingListCartonGroup[];
}

export interface ShipmentPacket {
  shipment_id: string;
  buyer_po?: BuyerPO | null;
  commercial_invoice: CommercialInvoice;
  packing_list: PackingList;
}

export interface AuditResponse {
  // Core Structured Fields
  session_token: string;
  revision_number: number;
  packet?: ShipmentPacket;
  summary: AuditSummary;
  discrepancies?: DiscrepancyItem[];

  // Flattened UI Compatibility Fields
  shipment_ref: string;
  mid_code: string;
  metadata: MetadataOut;
  po_lines: POLineOut[];
  inv_lines: InvLineOut[];
  weights: WeightsOut;
  cartons: CartonsOut;
  items: DiscrepancyItem[];
  passed: string[];
  updated_at?: string;
  auto_resolved_in_latest_rev?: string[];
  decision_trail?: AuditDecisionLogEntry[];
  link_expires_at?: string;
  link_revoked?: boolean;
  reopened_for_revision?: boolean;
  extraction_confidence_pct?: number;
  low_confidence_fields?: string[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  gemini_model: string;
  api_key_configured: boolean;
  active_sessions: number;
}

export interface PatchResolutionPayload {
  resolution_state: ResolutionState;
  resolution_reason_chip?: string;
  resolution_note?: string;
  actor_role: WorkspaceRole;
}

export interface ShipmentListItem {
  session_token: string;
  shipment_id: string;
  corridor: string;
  po_number: string;
  invoice_number: string;
  exporter_name: string;
  buyer_name: string;
  total_invoice_usd: number;
  revision_number: number;
  status: "ACTION_REQUIRED" | "BUYER_REVIEW" | "AWAITING_SUPPLIER_REVISION" | "CLEARED_WITH_EXCEPTIONS" | "VERIFIED_CLEAN" | string;
  unresolved_count: number;
  deterministic_conflict_count: number;
  commercial_variance_count: number;
  compliance_advisory_count: number;
  updated_at: string;
}

