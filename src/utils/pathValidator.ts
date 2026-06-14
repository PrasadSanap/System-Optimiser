// src/utils/pathValidator.ts

export function validatePath(path: string): { isValid: boolean; error?: string } {
  if (!path || path.trim() === "") {
    return { isValid: false, error: "Path cannot be empty" };
  }
  return { isValid: true };
}

export function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length > 1 && (trimmed.endsWith('/') || trimmed.endsWith('\\'))) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}
