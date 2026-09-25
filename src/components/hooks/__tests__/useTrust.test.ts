import { renderHook, waitFor } from "@testing-library/react";
import { useTrust, useTrustForAddress } from "../useTrust";
import { useAccount } from "@/hooks/useAccount";
import { useUserVerification } from "@/app/queries/user.queries";

jest.mock("@/hooks/useAccount", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/app/queries/user.queries", () => ({
  useUserVerification: jest.fn(),
}));

const mockUseAccount = useAccount as jest.Mock;
const mockUseUserVerification = useUserVerification as jest.Mock;

describe("useTrust", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockUseAccount.mockReturnValue({ address: "0xabc" });
    mockUseUserVerification.mockReturnValue({ data: { status: "SUCCESS" } });
  });

  it("applies localStorage.trustInfo overrides for the current user", async () => {
    const override = {
      isVerified: false,
      reputation: 15,
      accountAgeDays: 2,
      suspicious: true,
    };

    localStorage.setItem("trustInfo", JSON.stringify(override));

    const { result } = renderHook(() => useTrust());

    await waitFor(() => {
      expect(result.current.isVerified).toBe(false);
      expect(result.current.reputation).toBe(15);
      expect(result.current.accountAgeDays).toBe(2);
      expect(result.current.suspicious).toBe(true);
    });
  });

  it("does not fabricate trust values when a partial override is stored", async () => {
    localStorage.setItem(
      "trustInfo",
      JSON.stringify({
        isVerified: false,
      }),
    );

    const { result } = renderHook(() => useTrust());

    await waitFor(() => {
      expect(result.current.isVerified).toBe(false);
      // Unbacked signals stay null — never random or address-derived.
      expect(result.current.reputation).toBeNull();
      expect(result.current.accountAgeDays).toBeNull();
      expect(result.current.suspicious).toBeNull();
    });
  });

  it("returns null for unbacked signals without any stored override", async () => {
    const { result } = renderHook(() => useTrust());

    await waitFor(() => {
      expect(result.current.isVerified).toBe(true); // authoritative API value
      expect(result.current.reputation).toBeNull();
      expect(result.current.accountAgeDays).toBeNull();
      expect(result.current.suspicious).toBeNull();
    });
  });

  it("does not leak current-user overrides into address-specific trust lookups", async () => {
    localStorage.setItem(
      "trustInfo",
      JSON.stringify({
        reputation: 15,
        isVerified: false,
      }),
    );

    const { result, rerender } = renderHook(
      ({ address }: { address?: string }) => useTrustForAddress(address),
      { initialProps: { address: undefined } as { address?: string } },
    );

    await waitFor(() => {
      expect(result.current.reputation).toBe(15);
      expect(result.current.isVerified).toBe(false);
    });

    rerender({ address: "0xdef" });

    await waitFor(() => {
      // Address-specific lookups never fabricate values from the address.
      expect(result.current.reputation).toBeNull();
      expect(result.current.accountAgeDays).toBeNull();
      expect(result.current.suspicious).toBeNull();
      expect(result.current.isVerified).toBe(true);
    });
  });
});