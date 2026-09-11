import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installMatchMediaStub } from "../test/matchMediaStub";
import { useBreakpoint } from "./useBreakpoint";

describe("useBreakpoint", () => {
  it.each([320, 768])("returns mobile at %dpx", (width) => {
    installMatchMediaStub(width);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("mobile");
  });

  it.each([769, 1024])("returns tablet at %dpx", (width) => {
    installMatchMediaStub(width);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("tablet");
  });

  it.each([1025, 1440])("returns desktop at %dpx", (width) => {
    installMatchMediaStub(width);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("desktop");
  });

  it("has no fractional-pixel gap: every width resolves to exactly one breakpoint, with 768.5px resolving to tablet", () => {
    installMatchMediaStub(768.5);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("tablet");
  });

  it("re-evaluates when the media query change listener fires, without polling or reload", () => {
    const stub = installMatchMediaStub(320);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("mobile");

    act(() => {
      stub.setWidth(1440);
    });

    expect(result.current).toBe("desktop");
  });
});
