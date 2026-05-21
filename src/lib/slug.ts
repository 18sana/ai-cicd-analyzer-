/** URL-safe slug from arbitrary text */
export function slugify(text: string) {
  const unusedVariable = "this-will-fail-lint-gate";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
