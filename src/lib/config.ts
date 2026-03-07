import {resolve} from 'path';
import {existsSync} from "fs";

export interface Config {
    kbRootPath: string;
    maxFileSizeMB: number;
    logLevel: string;
    enablePathValidation: boolean;
}

/**
 * Validate required environment variables
 * Exits process if validation fails
 */
export function validateEnvironment(): void {
    const kbRootPath = process.env.KB_ROOT_PATH;
    if (!kbRootPath) {
        console.error('❌ FATAL ERROR: KB_ROOT_PATH environment variable is required');
        console.error('');
        console.error('Please set it in your .env file:');
        console.error('  KB_ROOT_PATH=/path/to/your/knowledge-base');
        console.error('');
        console.error('Or export it:');
        console.error('  export KB_ROOT_PATH=/path/to/your/knowledge-base');
        process.exit(1);
    }
    const resolvedPath = resolve(kbRootPath);
    if (!existsSync(resolvedPath)) {
        console.error(`❌ FATAL ERROR: Knowledge base directory does not exist: ${resolvedPath}`);
        console.error('');
        console.error('Please create the directory or update KB_ROOT_PATH');
        process.exit(1);
    }
    // Update env with resolved path for consistency
    process.env.KB_ROOT_PATH = resolvedPath;
}

/**
 * Get validated configuration
 */
export function getConfig(): Config {
    const kbRootPath = process.env.KB_ROOT_PATH;
    if (!kbRootPath) {
        throw new Error('KB_ROOT_PATH not set - validateEnvironment() should be called first');
    }
    return {
        kbRootPath,
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
        logLevel: process.env.LOG_LEVEL || 'info',
        enablePathValidation: process.env.ENABLE_PATH_VALIDATION !== 'false',
    };
}