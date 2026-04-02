import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger } from './lib/logger.js';

export function startHttpServer(server: McpServer, port: number) {
    const app = express();

    const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

    if (AUTH_TOKEN) {
        app.use('/mcp', (req, res, next) => {
            const header = req.headers.authorization;
            const queryToken = req.query.token as string | undefined;

            const isValid =
                (header && header === `Bearer ${AUTH_TOKEN}`) ||
                (queryToken && queryToken === AUTH_TOKEN);

            if (!isValid) {
                logger.warn(`Auth failed from ${req.ip}`);
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            next();
        });

        logger.info('Token authentication enabled');
    } else {
        logger.warn('MCP_AUTH_TOKEN not set — server is open to anyone!');
    }

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.all('/mcp', async (req, res) => {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });

        await server.connect(transport);
        await transport.handleRequest(req, res);
    });

    app.listen(port, () => {
        logger.info(`MCP HTTP server listening on port ${port}`);
    });
}