/**
 * Vault export utilities for saving files to Obsidian vault
 * Handles folder creation, file saving, and path validation
 */

import { Vault, TFile, TFolder } from "obsidian";
import { blobToArrayBuffer } from "./ImageExport";

/**
 * Normalize folder path for vault operations
 * Removes leading/trailing slashes and extra whitespace
 * @param path - Raw folder path from user
 * @returns Normalized path (e.g., "Scanned" or "Notes/Scans")
 */
export function normalizeFolderPath(path: string): string {
	if (!path) {
		return "";
	}

	// Trim whitespace
	let normalized = path.trim();

	// Remove leading and trailing slashes
	normalized = normalized.replace(/^\/+|\/+$/g, "");

	// Replace multiple consecutive slashes with single slash
	normalized = normalized.replace(/\/+/g, "/");

	return normalized;
}

/**
 * Ensure export folder exists, create if needed
 * Handles nested folder paths by creating parent folders recursively
 * @param vault - Obsidian vault instance
 * @param folderPath - Folder path (e.g., "Scanned" or "Notes/Scans")
 */
export async function ensureExportFolder(
	vault: Vault,
	folderPath: string,
): Promise<void> {
	const normalizedPath = normalizeFolderPath(folderPath);

	if (!normalizedPath) {
		// Empty path means root folder, which always exists
		return;
	}

	// Check if folder already exists
	const existingFolder = vault.getAbstractFileByPath(normalizedPath);
	if (existingFolder instanceof TFolder) {
		return; // Folder already exists
	}

	// Create folder (vault.createFolder handles nested paths automatically)
	try {
		await vault.createFolder(normalizedPath);
	} catch (error) {
		// Folder might already exist (race condition), check again
		const folder = vault.getAbstractFileByPath(normalizedPath);
		if (!(folder instanceof TFolder)) {
			throw new Error(
				`Failed to create folder '${normalizedPath}': ${error.message}`,
			);
		}
	}
}

/**
 * Check if file exists in vault
 * @param vault - Obsidian vault instance
 * @param filepath - Full file path including extension
 * @returns true if file exists
 */
export function fileExists(vault: Vault, filepath: string): boolean {
	const file = vault.getAbstractFileByPath(filepath);
	return file instanceof TFile;
}

/**
 * Save blob to vault as binary file
 * @param vault - Obsidian vault instance
 * @param folderPath - Destination folder path
 * @param filename - Filename with extension
 * @param blob - Blob to save
 * @returns Created TFile
 * @throws Error if file exists or save fails
 */
export async function saveToVault(
	vault: Vault,
	folderPath: string,
	filename: string,
	blob: Blob,
): Promise<TFile> {
	// Ensure folder exists
	await ensureExportFolder(vault, folderPath);

	// Build full path
	const normalizedFolder = normalizeFolderPath(folderPath);
	const fullPath = normalizedFolder
		? `${normalizedFolder}/${filename}`
		: filename;

	// Check if file already exists
	if (fileExists(vault, fullPath)) {
		throw new Error(
			`File already exists: ${fullPath}. Please choose a different name.`,
		);
	}

	// Convert blob to ArrayBuffer
	const arrayBuffer = await blobToArrayBuffer(blob);

	// Create binary file in vault
	try {
		const file = await vault.createBinary(fullPath, arrayBuffer);
		return file;
	} catch (error) {
		throw new Error(`Failed to save file: ${error.message}`);
	}
}
