import { readFileSync } from "node:fs";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

describe("lint configuration", () => {
  it("lints source and test files", async () => {
    expect(await eslint.isPathIgnored("src/App.tsx")).toBe(false);
    expect(await eslint.isPathIgnored("src/App.test.tsx")).toBe(false);
  });

  it.each(["src/components/Tmp.tsx", "src/components/Tmp.test.tsx"])(
    "reports an unused variable in %s",
    async (filePath) => {
      const [result] = await eslint.lintText("const unused = 1;\nexport {};\n", { filePath });
      expect(result.messages.map((m) => m.ruleId)).toContain("@typescript-eslint/no-unused-vars");
    },
  );

  it("reports no lint errors in the existing code", async () => {
    const results = await eslint.lintFiles(["src"]);
    const errors = results.flatMap((r) => r.messages.filter((m) => m.severity === 2));
    expect(errors).toEqual([]);
  }, 60000);

  it("runs `npm run lint` on pull requests", () => {
    const text = readFileSync(".github/workflows/lint.yml", "utf8");
    expect(text).toMatch(/pull_request/);
    expect(text).toMatch(/run:\s*npm run lint/);
  });
});
