summary: |
  Add ESLint (flat config, `eslint.config.js`) with the recommended rule sets for JavaScript, TypeScript, React and React Hooks, covering all of `src/` (source and test files). Add an `npm run lint` script, fix only what the first run reports in existing files, and add a GitHub Actions workflow that runs `npm run lint` on every pull request (using npm dependency caching). A failing workflow job blocks merging once the check is marked required in branch protection (a repo setting, not code). Pre-commit hooks are out of scope.
scope:
  - description: |
      Add devDependencies and the `lint` script to package.json (and refresh package-lock.json via the package install step).
      Script: `"lint": "eslint ."`
    files:
      - package.json
      - package-lock.json
    rationale: |
      AC1/AC6 need a single `lint` command that the developer and CI both run.
  - description: |
      Create flat ESLint config covering `**/*.{ts,tsx}` in src plus config files. Ignore `dist` and `node_modules`.
      Extend `js.configs.recommended`, `tseslint.configs.recommended`, `react.configs.flat.recommended` plus `react.configs.flat['jsx-runtime']` (tsconfig uses `react-jsx`), and `reactHooks.configs.flat.recommended`. Set `settings.react.version = "detect"` and browser globals. Test files (`**/*.test.{ts,tsx}`, `src/setupTests.ts`) get the same rules (no relaxation of no-unused-vars) so AC3 holds for tests too.
      Skeleton:
      ```js
      import js from "@eslint/js";
      import tseslint from "typescript-eslint";
      import react from "eslint-plugin-react";
      import reactHooks from "eslint-plugin-react-hooks";
      import globals from "globals";

      export default tseslint.config(
        { ignores: ["dist", "node_modules"] },
        js.configs.recommended,
        tseslint.configs.recommended,
        react.configs.flat.recommended,
        react.configs.flat["jsx-runtime"],
        reactHooks.configs.flat.recommended,
        {
          files: ["**/*.{ts,tsx}"],
          languageOptions: { globals: { ...globals.browser, ...globals.node } },
          settings: { react: { version: "detect" } },
        },
      );
      ```
    files:
      - eslint.config.js
    rationale: |
      Flat config is the current ESLint default format; typescript-eslint provides `no-unused-vars` for TS (AC3).
  - description: |
      Run `npm run lint` once, then make the minimal edit per reported error in existing files under src (e.g. remove an unused import/variable, fix a hooks dependency problem). Do not reformat, rename or touch lines not named by a report (AC4). If a report can only be fixed by refactoring (AC10), refactor that code minimally and re-run lint. Never add eslint-disable comments or turn rules off to get a clean run. Re-run `npm test` to confirm AC5.
    files:
      - src/App.tsx
      - src/components/EditExpenseForm.tsx
      - src/components/ExpenseList.tsx
      - src/components/ConfirmDialog.tsx
    rationale: |
      The exact files are only known after the first lint run; the list names the files with effect hooks (most likely to trigger react-hooks rules). The implementer edits only files that actually report problems and lists them in the PR.
  - description: |
      Add a pull-request workflow with one job `lint`: checkout, `actions/setup-node` with `cache: npm` (keyed on package-lock.json), `npm ci`, `npm run lint`. Trigger `on: pull_request` (opened, synchronize, reopened are default types). Set `permissions: contents: read`.
      ```yaml
      name: lint
      on:
        pull_request:
      permissions:
        contents: read
      jobs:
        lint:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                node-version: 22
                cache: npm
            - run: npm ci
            - run: npm run lint
      ```
    files:
      - .github/workflows/lint.yml
    rationale: |
      AC6-8: the job fails when `npm run lint` exits non-zero and succeeds otherwise. AC9 additionally needs `lint` marked as a required status check on `main` (repo setting, see notes).
tests:
  - |
    AC1/AC3 (write first, must fail before the config exists). Add a vitest test `src/lint.config.test.ts` that uses the ESLint Node API against the real config with in-memory text:
    ```ts
    import { ESLint } from "eslint";
    const eslint = new ESLint();
    it("lints source and test files", async () => {
      expect(await eslint.isPathIgnored("src/App.tsx")).toBe(false);
      expect(await eslint.isPathIgnored("src/App.test.tsx")).toBe(false);
    });
    it.each(["src/components/Tmp.tsx", "src/components/Tmp.test.tsx"])("reports unused variable in %s", async (p) => {
      const [r] = await eslint.lintText("const unused = 1;\nexport {};\n", { filePath: p });
      expect(r.messages.map((m) => m.ruleId)).toContain("@typescript-eslint/no-unused-vars");
    });
    ```
  - |
    AC2/AC10 baseline. Before fixing, `npm run lint` exits non-zero (red). After the minimal fixes, this must hold:
    ```bash
    npm run lint   # exit code 0, zero errors
    ```
    A vitest check can assert `const results = await new ESLint().lintFiles(["src"]); expect(results.flatMap(r => r.messages.filter(m => m.severity === 2))).toEqual([])`, which also covers any refactored code (AC10).
  - |
    AC4. Review check, not an automated test: `git diff main -- src` must contain only hunks that correspond to a lint report from the first run. The PR description lists each changed line with its rule id. `git diff main --stat -- src` shows no files that were not reported.
  - |
    AC5. Run the whole existing suite after the fixes with `npm test` (vitest run), expect all existing test files to pass unchanged.
  - |
    AC6. Workflow structure test in `src/lint.config.test.ts` (or a shell grep): read `.github/workflows/lint.yml` and assert
    `expect(text).toMatch(/pull_request/)` and `expect(text).toMatch(/run:\s*npm run lint/)`.
  - |
    AC7/AC8. Verified by the CI job exit status: a throwaway branch with `const unused = 1;` makes the `lint` check fail (red), and the clean branch makes it pass (green). Locally mirror with `npm run lint; echo $?` giving non-zero then 0.
  - |
    AC9. Not testable in code. After merge, the repo admin marks the `lint` job as a required status check in the `main` branch protection / ruleset; verify by opening a PR with a lint error and confirming the merge button is blocked.
assumptions_or_open_questions:
  - |
    Config format and plugins (deferred question) decided here: flat config `eslint.config.js` with @eslint/js, typescript-eslint, eslint-plugin-react, eslint-plugin-react-hooks, globals. Dependency caching decided as `actions/setup-node` `cache: npm` plus `npm ci`.
  - |
    Version risk: package.json pins `typescript ^7.0.2`. The implementer must confirm that the chosen `typescript-eslint` version's peer range accepts TypeScript 7 and that `eslint` major is compatible with the plugins. Adjust the versions in package_dependencies to what npm resolves without `--force`. I did not verify the registry.
  - |
    AC9 (merge blocking) requires a GitHub branch protection or ruleset setting that cannot be committed as code. I assume a repo admin will mark the `lint` check as required. No `.github` directory exists in the worktree (checked with Glob), so no CI exists yet.
  - |
    Which existing files report problems is unknown until the first run; the file list under the fix scope item is a prediction. I read no file contents beyond config files, so the implementer must confirm.
  - |
    Node version 22 in the workflow is assumed (no .nvmrc or engines field found by Glob). Adjust if the team uses another version.
  - |
    The in-repo vitest test that calls the ESLint Node API is optional extra coverage. If the team prefers no lint tests in the suite, AC1/AC3 can be verified by running `npm run lint` against a temporary file.
estimated_points: 3
package_dependencies:
  - name: eslint
    version: ^9.0.0
    ecosystem: npm
    rationale: Linter itself, runs via the new lint script.
  - name: "@eslint/js"
    version: ^9.0.0
    ecosystem: npm
    rationale: Provides the recommended base rules (js.configs.recommended).
  - name: typescript-eslint
    version: ^8.0.0
    ecosystem: npm
    rationale: Parser and recommended rules for TypeScript, including no-unused-vars for AC3.
  - name: eslint-plugin-react
    version: ^7.37.0
    ecosystem: npm
    rationale: Recommended React rules for the component files.
  - name: eslint-plugin-react-hooks
    version: ^5.0.0
    ecosystem: npm
    rationale: Rules of Hooks and exhaustive-deps; the components use useEffect.
  - name: globals
    version: ^15.0.0
    ecosystem: npm
    rationale: Browser/node global definitions for the config.
notes: |
  ### Data & rollout

  None — tooling and CI config only, no stored data, schema or runtime settings. Rollback is reverting the PR; the required-check setting in branch protection must also be removed if the workflow is deleted, otherwise PRs would wait on a check that never reports.

  Context: stack is React + TypeScript with npm and vitest (architecture docs). `package.json` currently has only `dev`, `build`, `test` scripts and no ESLint; `.arc/config/setup.yaml` uses `npm ci` as the setup command, which the workflow mirrors. No UI changes, so design tokens do not apply.

  ```mermaid
  flowchart TD
    pkg[package.json: add lint script and devDeps]
    cfg[eslint.config.js: new flat config]
    wf[.github/workflows/lint.yml: new PR check]
    src[src/**/*.ts and *.tsx: minimal fixes]
    tsc[tsconfig.json: untouched, jsx react-jsx]
    pkg -->|npm run lint| cfg
    cfg -->|lints| src
    wf -->|npm ci then npm run lint| pkg
    cfg -.->|jsx-runtime preset matches| tsc
    classDef touched fill:#f96,color:#000
    class pkg,cfg,wf,src touched
  ```
review_focus: |
  IN: ESLint flat config, `lint` script, a PR workflow running `npm run lint`, and only the minimal src edits that the first run requires. OUT: pre-commit hooks, formatting rules, any rule relaxations or eslint-disable comments. Riskiest areas are the TypeScript 7 / typescript-eslint version compatibility and making sure every src edit maps to a lint report (AC4). Merge blocking (AC9) is a repo setting, so the plan documents it rather than implementing it in code.
