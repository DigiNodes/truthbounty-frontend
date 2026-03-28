import { renderHook } from "@testing-library/react";
import { useClaims } from "../useClaims";

describe("useClaims", () => {
  it("should return empty claims initially", () => {
    const { result } = renderHook(() => useClaims());
    expect(result.current.claims).toEqual([]);
  });

  it("should fetch claims", async () => {
    const { result, waitForNextUpdate } = renderHook(() => useClaims());
    await waitForNextUpdate();
    expect(result.current.claims.length).toBeGreaterThan(0);
  });
});
