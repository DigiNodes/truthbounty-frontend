/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports -- test doubles and dynamic module access */
import { renderHook, waitFor } from "@testing-library/react";
import { useTrust, useTrustForAddress } from "../useTrust";

jest.mock("@/hooks/useAccount", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/app/queries/user.queries", () => ({
  useUserVerification: jest.fn(),
}));

const { useAccount } = require("@/hooks/useAccount");
const { useUserVerification } = require("@/app/queries/user.queries");

describe("useTrust", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    useAccount.mockReturnValue({ address: "0xabc" });
    useUserVerification.mockReturnValue({ data: { status: "SUCCESS" } });
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

  it("keeps existing trust values when a partial override is stored", async () => {
    localStorage.setItem(
      "trustInfo",
      JSON.stringify({
        isVerified: false,
      }),
    );

    const { result } = renderHook(() => useTrust());

    await waitFor(() => {
      expect(result.current.isVerified).toBe(false);
      expect(typeof result.current.reputation).toBe("number");
      expect(typeof result.current.accountAgeDays).toBe("number");
      expect(typeof result.current.suspicious).toBe("boolean");
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
      { initialProps: { address: undefined as string | undefined } },
    );

    await waitFor(() => {
      expect(result.current.reputation).toBe(15);
      expect(result.current.isVerified).toBe(false);
    });

    rerender({ address: "0xdef" });

    await waitFor(() => {
      const expectedReputation = Array.from("0xdef").reduce(
        (sum, character) => sum + character.charCodeAt(0),
        0,
      ) % 101;

      expect(result.current.reputation).toBe(expectedReputation);
      expect(result.current.isVerified).toBe(true);
    });
  });
});
