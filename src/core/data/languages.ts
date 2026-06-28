/**
 * Code-block language handling.
 *
 * Telegram highlights a fixed set of languages (libprisma). We normalize common
 * aliases and otherwise pass the lang through; an unknown lang is never an error
 * (the code body is always preserved) — see {@link normalizeLanguage}.
 */
const ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  cjs: "javascript",
  mjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  golang: "go",
  kt: "kotlin",
  ps1: "powershell",
  dockerfile: "docker",
};

/** Lowercase and de-alias a fenced-code language hint. Empty/undefined → undefined. */
export function normalizeLanguage(lang: string | null | undefined): string | undefined {
  if (!lang) return undefined;
  const key = lang.trim().toLowerCase();
  if (key === "") return undefined;
  return ALIASES[key] ?? key;
}
