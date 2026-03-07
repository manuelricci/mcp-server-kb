import dotenv from 'dotenv';
import {validateEnvironment} from "./lib/config.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js"
import {logger} from "./lib/logger.js";

dotenv.config();
validateEnvironment()
logger.info('MCP Knowledge Base Server starting...')

const server = new McpServer(
    {name: 'knowledge-base-server', version: '1.0.0'},
    {capabilities: {tools: {}}}
);

const transport = new StdioServerTransport();
await server.connect(transport);
logger.info('Server running on stdio');