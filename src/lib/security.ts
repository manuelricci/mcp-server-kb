import { resolve, normalize, sep } from 'path';
import { getConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Validate that a path is safe and within KB boundaries
 * @throws Error if path is invalid or outside KB root
 */
export function validatePath(relativePath: string): string {
    const config = getConfig();

    const sanitizedPath = relativePath.replaceAll('\\', '/');

    const normalizedPath = normalize(sanitizedPath);

    const absolutePath = resolve(config.kbRootPath, normalizedPath);

    if (!absolutePath.startsWith(config.kbRootPath + sep)) {
        logger.warn(`Path traversal attempt blocked: ${relativePath}`);
        throw new Error(
            `Access denied: Path '${relativePath}' resolves outside knowledge base directory`
        );
    }

    logger.debug(`Path validated: ${relativePath} -> ${absolutePath}`);
    return absolutePath;
}