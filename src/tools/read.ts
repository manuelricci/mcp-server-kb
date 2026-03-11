import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { getConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';


/**
 * Reads the content of a resource file at the specified relative path.
 * The method performs various validations to ensure the file exists, is not a directory,
 * and does not exceed the maximum allowed size before reading its content.
 *
 * @param {string} relativePath - The relative path to the resource file.
 * @return {Promise<string>} A promise that resolves to the content of the file as a string.
 * @throws {Error} If the file does not exist, is not a valid file, is too large, or cannot be read.
 */
export async function readResource(relativePath: string): Promise<string> {
    logger.info(`Reading resource: ${relativePath}`);

    const config = getConfig();
    const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024;

    // ⚠️ Codice vulnerabile
    const absolutePath = resolve(config.kbRootPath, relativePath);

    let stats;
    try {
        stats = statSync(absolutePath);
    } catch {
        throw new Error(`File not found: ${relativePath}`);
    }

    if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${relativePath}`);
    }

    if (stats.size > maxSizeBytes) {
        throw new Error(
            `File too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum: ${config.maxFileSizeMB}MB`
        );
    }

    try {
        const content = readFileSync(absolutePath, 'utf-8');
        logger.debug(`Read ${content.length} characters from ${relativePath}`);
        return content;
    } catch {
        throw new Error(`Cannot read file: ${relativePath}`);
    }
}