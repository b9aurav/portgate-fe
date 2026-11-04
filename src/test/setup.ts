import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

// Mock next/navigation
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ token: "shp_test_token" }),
  usePathname: () => "/shipments/shp_test_token",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock clipboard safely allowing user-event redefinition
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    writable: true,
    configurable: true,
  });
} else {
  try {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  } catch {
    // fallback if read-only
  }
}

// Mock URL object methods
if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
  window.URL.revokeObjectURL = vi.fn();
}

// Ensure crypto.subtle and crypto.randomUUID are available in jsdom
if (typeof window !== "undefined" && window.crypto) {
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = () => "12345678-1234-4234-8234-123456789abc";
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
