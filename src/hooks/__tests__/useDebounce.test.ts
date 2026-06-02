import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update the debounced value before the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe("hello");
  });

  it("updates the debounced value after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe("world");
  });

  it("resets the timer when value changes again within the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: "foo" });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe("hello");

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe("foo");
  });

  it("cleans up the timer on unmount", () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
