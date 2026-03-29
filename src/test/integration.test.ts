import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {resolve} from 'path';

describe('MCP Server (integration)', () => {
    let client: Client;
    let transport: StdioClientTransport;

    beforeAll(async () => {
        transport = new StdioClientTransport({
            command: 'node',
            args: [resolve(import.meta.dirname, '../../dist/index.js')],
            env: {
                ...process.env,
                KB_ROOT_PATH: resolve(import.meta.dirname, '../../kb'),
                LOG_LEVEL: 'error',
                DOTENV_CONFIG_QUIET: 'true',
            },
        });

        client = new Client(
            {
                name: 'test-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            },
        );
        await client.connect(transport);
    });

    afterAll(async () => {
        await transport.close();
    });


    it('should list exactly 2 tools', async () => {
        const {tools} = await client.listTools();
        expect(tools).toHaveLength(2);
    });

    it('should expose search_kb with required query param', async () => {
        const {tools} = await client.listTools();
        const searchTool = tools.find(t => t.name === 'search_kb');
        expect(searchTool).toBeDefined();
        expect(searchTool!.inputSchema.required).toContain('query');
    });

    it('should expose read_resource with required path param', async () => {
        const {tools} = await client.listTools();
        const readTool = tools.find(t => t.name === 'read_resource');
        expect(readTool).toBeDefined();
        expect(readTool!.inputSchema.required).toContain('path');
    });


    it('should return results for a valid search', async () => {
        const result = await client.callTool({
            name: 'search_kb',
            arguments: {
                query: 'configurazione',
                maxResults: 3
            },
        });

        expect(result.isError).toBeFalsy();

        const text = (result.content as any)[0].text;
        const parsed = JSON.parse(text);
        expect(parsed.length).toBeGreaterThan(0);
    });

    it('should handle fuzzy queries (typo tolerance)', async () => {
        const result = await client.callTool({
            name: 'search_kb',
            arguments: {
                query: 'cnfigurazione'
            },
        });
        expect(result.isError).toBeFalsy();
    });


    it('should read an existing file', async () => {
        const result = await client.callTool({
            name: 'read_resource',
            arguments: {path: 'docs/setup-guide.md'},
        });
        expect(result.isError).toBeFalsy();

        const text = (result.content as any)[0].text;
        expect(text).toContain('BEGIN FILE CONTENT');
    });


    it('should block path traversal attacks end-to-end', async () => {
        const result = await client.callTool({
            name: 'read_resource',
            arguments: {path: '../../../../etc/passwd'},
        });

        const text = (result.content as any)[0].text;
        expect(text).toContain('Access denied');
    });

    it('should block Windows-style traversal end-to-end', async () => {
        const result = await client.callTool({
            name: 'read_resource',
            arguments: {path: '..\\..\\..\\etc\\passwd'},
        });

        const text = (result.content as any)[0].text;
        expect(text).toContain('Access denied');
    });

    it('should handle non-existent files gracefully', async () => {
        const result = await client.callTool({
            name: 'read_resource',
            arguments: {path: 'questo-non-esiste.md'},
        });

        const text = (result.content as any)[0].text;
        expect(text).toContain('not found');
    });
})
;