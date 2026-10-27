/**
 * audit.ts — TypeScript interfaces mirroring portgate-be/schemas.py
 * Single source of truth for all audit response types.
 */

export type Severity = "crit" | "warn";

export interface DiscrepancyItem {
  id: string; // e.g. "ERR-01", "WARN-01"
  sev: Severity;
  title: string;
  cells: string[]; // Cell IDs to highlight, e.g. ["inv-hsn1", "po-hts1"]
  locs: [string, string][]; // [[tab_key, human_label], ...]
  body: string;
  impact: string;
  fix: string;
}

export interface AuditSummary {
  status: string; // "CLEAR" | "BLOCKED"
  critical_count: number;
  warning_count: number;
  passed_count: number;
}

export interface MetadataOut {
  po_number: string;
  invoice_no: string;
  invoice_date: string;
  packing_list_no: string;
  exporter_name: string;
  exporter_street: string;
  exporter_city: string;
  exporter_state: string;
  exporter_postal: string;
  exporter_country_iso: string;
  exporter_gstin: string;
  exporter_iec: string;
  exporter_lut_arn: string;
  importer_name: string;
  importer_city_state: string;
  port_of_loading: string;
  port_of_discharge: string;
  incoterm: string;
  currency: string;
  po_incoterm?: string;
  po_currency?: string;
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
}

export interface WeightsOut {
  inv: [number, number][]; // [[net_kg, gross_kg], ...]
  pl: [number, number][];
}

export interface CartonsOut {
  inv: number[];
  pl: number[];
}

export interface AuditResponse {
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
}
