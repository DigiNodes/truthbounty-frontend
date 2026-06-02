import { renderHook, waitFor } from "@testing-library/react";
import { useTrust } from "../useTrust";

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
});
