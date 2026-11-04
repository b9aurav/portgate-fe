import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";
import { supabase } from "@/lib/supabase";
import { mockRouter } from "@/test/setup";

describe("Enterprise Login & Signup Screen (/login)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders branding lockup, tabs, email/password inputs, and sandbox bypass button", () => {
    render(<LoginPage />);

    // Branding & Header
    expect(screen.getByAltText("PortGate")).toBeInTheDocument();
    expect(
      screen.getByText(/pre-shipment customs & 3-way match compliance gate/i)
    ).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Buyer Account" })
    ).toBeInTheDocument();

    // Fields in Sign In mode
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/company \/ importer of record name/i)
    ).not.toBeInTheDocument();

    // Submit button
    expect(
      screen.getByRole("button", { name: /sign in & access workspace/i })
    ).toBeInTheDocument();

    // Secondary Guest Sandbox Divider & Link
    const guestLink = screen.getByRole("link", {
      name: /continue in isolated demo sandbox \(no login required\)/i,
    });
    expect(guestLink).toBeInTheDocument();
    expect(guestLink).toHaveAttribute("href", "/");
  });

  it("toggles between Sign In and Create Buyer Account tabs", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Switch to Create Buyer Account
    const signUpTab = screen.getByRole("button", { name: "Create Buyer Account" });
    await user.click(signUpTab);

    // Company name field should now appear
    expect(
      screen.getByLabelText(/company \/ importer of record name/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account & claim workspace/i })
    ).toBeInTheDocument();

    // Switch back to Sign In
    const signInTab = screen.getByRole("button", { name: "Sign In" });
    await user.click(signInTab);

    expect(
      screen.queryByLabelText(/company \/ importer of record name/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in & access workspace/i })
    ).toBeInTheDocument();
  });

  it("handles successful sign in and redirects to queue dashboard", async () => {
    const user = userEvent.setup();
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: {
        user: { id: "user_test_uuid", email: "buyer@pacificcoast.com" } as any,
        session: { access_token: "mock_jwt_token" } as any,
      },
      error: null,
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/work email/i), "buyer@pacificcoast.com");
    await user.type(screen.getByLabelText(/password/i), "SecurePassword123!");

    const submitBtn = screen.getByRole("button", { name: /sign in & access workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "buyer@pacificcoast.com",
        password: "SecurePassword123!",
      });
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });

  it("handles successful buyer sign up with company name metadata", async () => {
    const user = userEvent.setup();
    vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: {
        user: { id: "user_new_uuid", email: "newbuyer@retail.com" } as any,
        session: { access_token: "mock_signup_jwt" } as any,
      },
      error: null,
    });

    render(<LoginPage />);

    // Switch to Sign Up
    await user.click(screen.getByRole("button", { name: "Create Buyer Account" }));

    await user.type(
      screen.getByLabelText(/company \/ importer of record name/i),
      "Pacific Retail Group LLC"
    );
    await user.type(screen.getByLabelText(/work email/i), "newbuyer@retail.com");
    await user.type(screen.getByLabelText(/password/i), "SuperSecret123!");

    const submitBtn = screen.getByRole("button", { name: /create account & claim workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "newbuyer@retail.com",
        password: "SuperSecret123!",
        options: {
          data: {
            company_name: "Pacific Retail Group LLC",
          },
        },
      });
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });

  it("displays error banner when authentication fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" } as any,
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/work email/i), "wrong@user.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpass");

    const submitBtn = screen.getByRole("button", { name: /sign in & access workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
