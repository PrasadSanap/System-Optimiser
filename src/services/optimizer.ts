// src/services/optimizer.ts
// ─────────────────────────────────────────────────────────────────────────────
// This service is the single point of contact between the React frontend
// and the Rust backend (via Tauri's invoke). Every function here:
//   1. Validates the user input on the frontend first
//   2. Normalizes the path for the current OS
//   3. Calls the Rust command
//   4. Catches and re-throws errors as clean, readable messages
// ─────────────────────────────────────────────────────────────────────────────

import { invoke } from "@tauri-apps/api/core";
import { validatePath, normalizePath } from "../utils/pathValidator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiskUsageResult {
  path: string;
  sizeBytes: number;
  readable: string;
}

export interface OptimizationResult {
  success: boolean;
  message: string;
  filesAffected?: number;
}

export interface SystemFileResult {
  path: string;
  content: string;
}

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Validates a path and throws a user-friendly error if invalid.
 * Returns the normalized path string ready to send to Rust.
 */
function preparePathOrThrow(rawPath: string): string {
  const { isValid, error } = validatePath(rawPath);
  if (!isValid) {
    throw new Error(error ?? "Invalid path provided.");
  }
  return normalizePath(rawPath.trim());
}

/**
 * Wraps a Tauri invoke call and converts Rust's Err(String) into a JS Error.
 * Rust returns errors as plain strings via Result<T, String>.
 */
async function safeInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    // Tauri surfaces Rust Err(msg) as a rejected promise with that msg string
    const message = typeof err === "string" ? err : (err as Error)?.message ?? "An unexpected error occurred.";
    throw new Error(message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Gets disk usage information for a given path.
 * Corresponds to the `get_disk_usage` Rust command in main.rs.
 *
 * @param rawPath - User-provided path string (any OS format)
 * @returns DiskUsageResult with path and size info
 * @throws Error with a user-friendly message on failure
 */
export async function getDiskUsage(rawPath: string): Promise<DiskUsageResult> {
  const cleanPath = preparePathOrThrow(rawPath);
  const result = await safeInvoke<string>("get_disk_usage", { path: cleanPath });

  // Parse the plain-text response from Rust ("Path: X\nSize: Y bytes")
  const lines = result.split("\n");
  const sizeLine = lines.find((l) => l.startsWith("Size:")) ?? "";
  const sizeBytes = parseInt(sizeLine.replace(/\D/g, ""), 10) || 0;

  return {
    path: cleanPath,
    sizeBytes,
    readable: result,
  };
}

/**
 * Clears temporary (.tmp / .temp) files from a directory.
 * Corresponds to the `clear_temp_files` Rust command in main.rs.
 *
 * @param rawDirPath - User-provided directory path string
 * @returns OptimizationResult with count of deleted files
 * @throws Error with a user-friendly message on failure
 */
export async function clearTempFiles(rawDirPath: string): Promise<OptimizationResult> {
  const cleanPath = preparePathOrThrow(rawDirPath);
  const message = await safeInvoke<string>("clear_temp_files", { dirPath: cleanPath });

  // Parse count from Rust response e.g. "Successfully removed 5 temporary file(s)..."
  const match = message.match(/(\d+)/);
  const filesAffected = match ? parseInt(match[1], 10) : 0;

  return {
    success: true,
    message,
    filesAffected,
  };
}

/**
 * Reads the contents of a system file safely.
 * Corresponds to the `read_system_file` Rust command in main.rs.
 *
 * @param rawFilePath - User-provided file path string
 * @returns SystemFileResult with path and file content
 * @throws Error with a user-friendly message on failure
 */
export async function readSystemFile(rawFilePath: string): Promise<SystemFileResult> {
  const cleanPath = preparePathOrThrow(rawFilePath);
  const content = await safeInvoke<string>("read_system_file", { filePath: cleanPath });

  return {
    path: cleanPath,
    content,
  };
}

/**
 * Runs a full system optimization scan.
 * Corresponds to the `run_optimization` Rust command in main.rs.
 * No path needed — operates on well-known system temp locations.
 *
 * @returns OptimizationResult with overall result message
 * @throws Error with a user-friendly message on failure
 */
export async function runOptimization(): Promise<OptimizationResult> {
  const message = await safeInvoke<string>("run_optimization", {});
  return {
    success: true,
    message,
  };
}

/**
 * Gets real-time system metrics (CPU, RAM, disk).
 * Corresponds to the `get_system_metrics` Rust command in main.rs.
 *
 * @returns Raw metrics string from Rust (parse as needed per your UI)
 * @throws Error with a user-friendly message on failure
 */
export async function getSystemMetrics(): Promise<string> {
  return safeInvoke<string>("get_system_metrics", {});
}