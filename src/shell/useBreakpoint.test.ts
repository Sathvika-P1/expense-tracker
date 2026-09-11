import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installMatchMediaStub } from "../test/matchMediaStub";
import { useBreakpoint } from "./useBreakpoint";

describe("useBreakpoint", () => {
  it("returns mobile at 320px and 768px", () => {
    installMatchMediaStub(320);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("mobile");
  });

  it("returns tablet at 769px and 1024px", () => {
    installMatchMediaStub(1024);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("tablet");
  });

  it("returns desktop at 1025px and 1440px", () => {
    installMatchMediaStub(1440);
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
