import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative, sep } from 'path';
import Fuse from 'fuse.js';
import { getConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';

interface FileInfo {
    path: string;
    name: string;
    content: string;
    size: number;
}

export interface SearchResult {
    path: string;
    name: string;
    score: number;
    snippet: string;
}

/**
 * Scans a directory recursively and collects information about its files.
 *
 * @param {string} dir - The directory to scan. This can be a relative or absolute path.
 * @param {string} rootPath - The root path to calculate file paths relative to.
 * @return {FileInfo[]} An array of objects containing information about each file found, such as path, name, content, and size.
 */
function scanDirectory(dir: string, rootPath: string): FileInfo[] {
    const files: FileInfo[] = [];
    const config = getConfig();
    const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024;


    try {
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.name.startsWith('.')) {
                continue;
            }

            if (entry.isDirectory()) {
                files.push(...scanDirectory(fullPath, rootPath));
            } else if (entry.isFile()) {
                try {
                    const stats = statSync(fullPath);

                    if (stats.size > maxSizeBytes) {
                        logger.debug(`Skipping large file: ${entry.name}`);
                        continue;
                    }


                    const content = readFileSync(fullPath, 'utf-8');

                    const relativePath = relative(rootPath, fullPath);

                    files.push({
                        path: relativePath,
                        name: entry.name,
                        content,
                        size: stats.size,
                    });
                } catch {
                    logger.debug(`Skipping unreadable file: ${entry.name}`);
                }
            }
        }
    } catch (error) {
        logger.error(`Error scanning directory ${dir}:`, error);
    }

    return files;
}

/**
 * Searches the knowledge base for files matching the query string and returns a list of search results.
 *
 * The method scans all files within the knowledge base directory and uses fuzzy searching
 * to find matches based on file names, paths, and content. Results are sorted by relevance,
 * and a snippet of the content is included for each match.
 *
 * @param {string} query The search query string to look for in the knowledge base.
 * @param {number} maxResults The maximum number of results to return.
 * @return {Promise<SearchResult[]>} A promise that resolves to an array of search result objects,
 *                                   each containing metadata about the matched file, a relevance score,
 *                                   and a content snippet.
 */
export async function searchKnowledgeBase(
    query: string,
    maxResults: number
): Promise<SearchResult[]> {
    logger.info(`Searching KB for: "${query}"`);

    const config = getConfig();
    const files = scanDirectory(config.kbRootPath, config.kbRootPath);

    logger.debug(`Indexed ${files.length} files`);

    if (files.length === 0) {
        logger.warn('No files found in knowledge base');
        return [];
    }

    const fuse = new Fuse(files, {
        keys: [
            { name: 'name', weight: 2 },
            { name: 'path', weight: 1.5 },
            { name: 'content', weight: 1 },
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2,
    });

    const results = fuse.search(query, { limit: maxResults });

    logger.info(`Found ${results.length} results`);

    return results.map((result) => {
        const file = result.item;

        const snippet =
            file.content
                .substring(0, 200)
                .replace(/\n/g, ' ')
                .trim() + (file.content.length > 200 ? '...' : '');

        return {
            path: file.path.split(sep).join('/'),
            name: file.name,
            score: Math.round((1 - (result.score ?? 0)) * 100) / 100,
            snippet,
        };
    });
}