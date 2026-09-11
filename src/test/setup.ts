import "@testing-library/jest-dom/vitest";
import { restoreMatchMediaStub } from "./matchMediaStub";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  restoreMatchMediaStub();
});
