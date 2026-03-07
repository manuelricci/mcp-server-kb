type LogLevel = 'error' | 'warn' | 'info' | 'debug';
const LOG_LEVELS: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

class Logger {
    private level: LogLevel;
    constructor() {
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    }
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
    }
    private log(level: LogLevel, message: string, ...args: unknown[]): void {
        if (!this.shouldLog(level)) {
            return;
        }
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        // ALWAYS use console.error to write to stderr, never stdout
        console.error(prefix, message, ...args);
    }
    error(message: string, ...args: unknown[]): void {
        this.log('error', message, ...args);
    }
    warn(message: string, ...args: unknown[]): void {
        this.log('warn', message, ...args);
    }
    info(message: string, ...args: unknown[]): void {
        this.log('info', message, ...args);
    }
    debug(message: string, ...args: unknown[]): void {
        this.log('debug', message, ...args);
    }
}
export const logger = new Logger();