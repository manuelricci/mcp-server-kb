import dotenv from 'dotenv';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {validateEnvironment} from './lib/config.js';
import {logger} from './lib/logger.js';
import {searchKnowledgeBase} from './tools/search.js';
import {readResource} from './tools/read.js';
import {startHttpServer} from "./http.js";

dotenv.config();
validateEnvironment();

logger.info('MCP Knowledge Base Server starting...');

export type CreateServerFn = () => McpServer;

export function createServer(): McpServer {
    const server = new McpServer({
        name: 'knowledge-base-server',
        version: '1.0.0',
    });

    server.registerTool(
        'search_kb',
        {
            description: `Cerca file e contenuti nella knowledge base usando fuzzy matching avanzato.

Questo tool è utile quando:
- L'utente chiede informazioni su un argomento specifico
- Vuoi trovare documentazione relativa a un topic
- Hai bisogno di file che contengono determinate keywords
- Vuoi esplorare cosa c'è nella knowledge base

Il sistema usa fuzzy matching, quindi tollera typo e trova match parziali.
Ritorna i file più rilevanti con score di similarità (più alto = più rilevante).

Esempi di query efficaci:
- "configurazione server" trova config/server.json, docs/setup-server.md
- "autenticazione API" trova api-auth.md, authentication-guide.md
- "deploy produzione" trova deployment.md, production-setup.md`,

            inputSchema: {
                query: z
                    .string()
                    .min(1)
                    .describe(
                        'La parola chiave o frase da cercare. Supporta typo e match parziali. Esempi: "configurazione", "API authentication", "setup database"'
                    ),
                maxResults: z
                    .number()
                    .int()
                    .min(1)
                    .max(20)
                    .default(5)
                    .describe(
                        'Numero massimo di risultati da restituire (default: 5, max: 20)'
                    ),
            },
        },
        async ({query, maxResults}) => {
            try {
                const results = await searchKnowledgeBase(query, maxResults);
                return {
                    content: [
                        {type: 'text', text: JSON.stringify(results, null, 2)},
                    ],
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                logger.error(`search_kb failed: ${message}`);
                return {
                    content: [{type: 'text', text: `Error: ${message}`}],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        'read_resource',
        {
            description: `Legge il contenuto completo di un file specifico dalla knowledge base.

Usa questo tool quando:
- Hai già identificato il file esatto che ti serve (tramite search_kb)
- L'utente chiede di leggere un file specifico
- Hai bisogno del contenuto completo per rispondere

Il path deve essere relativo alla root della knowledge base.
File troppo grandi (>10MB) vengono rifiutati con un errore.

Esempi di utilizzo:
- Dopo search_kb trova "config/server.json", usa read_resource con quel path
- L'utente chiede "leggimi il README", cerca prima il file, poi leggilo`,
            inputSchema: {
                path: z
                    .string()
                    .min(1)
                    .describe(
                        'Path relativo del file dalla root della KB. Deve essere un path restituito da search_kb o un path conosciuto. Esempio: "docs/setup-guide.md"'
                    ),
            },
        },
        async ({path: filePath}) => {
            try {
                const content = await readResource(filePath);
                return {
                    content: [{type: 'text', text: content}],
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                logger.error(`read_resource failed: ${message}`);
                return {
                    content: [{type: 'text', text: `Error: ${message}`}],
                    isError: true,
                };
            }
        }
    );

    return server;
}

try {
    const transportType = process.env.MCP_TRANSPORT || 'stdio';
    if (transportType === "http") {
        const PORT = parseInt(process.env.PORT || '3000', 10);
        startHttpServer(createServer, PORT);
    } else {
        const server = createServer();
        const transport = new StdioServerTransport();
        await server.connect(transport);
        logger.info('MCP Knowledge Base Server running on stdio');
        logger.info(`Knowledge base path: ${process.env.KB_ROOT_PATH}`);
    }
} catch (error) {
    logger.error('Fatal error starting server:', error);
    process.exit(1);
}