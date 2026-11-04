/**
 * workspace.ts — Per-Browser Sandbox Workspace ID.
 * Generates and persists a unique sandbox ID in the visitor's browser localStorage
 * to isolate shipment queues, test uploads, and audit records per session.
 */

const WORKSPACE_STORAGE_KEY = "portgate_workspace_id";

export function getWorkspaceId(): string {
  if (typeof window === "undefined") {
    return "sandbox_default";
  }

  try {
    let wsId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!wsId || !wsId.trim()) {
      wsId = `sandbox_${crypto.randomUUID()}`;
      localStorage.setItem(WORKSPACE_STORAGE_KEY, wsId);
    }
    return wsId;
  } catch {
    return "sandbox_default";
  }
}
