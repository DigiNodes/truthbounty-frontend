import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";

describe("useAuth", () => {
  it("should start unauthenticated", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should login successfully", () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.login("user", "password");
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("user");
  });

  it("should logout successfully", () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.login("user", "password");
      result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
