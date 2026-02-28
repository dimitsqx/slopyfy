import express from 'express';
import { randomUUID } from 'node:crypto';
import { createShopServer } from './mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const app = express();
app.use(express.json());

const transports: Record<string, StreamableHTTPServerTransport> = {};
const servers: Record<string, ReturnType<typeof createShopServer>> = {};

app.post('/mcp', async (req, res) => {
  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

  let transport: StreamableHTTPServerTransport | undefined;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    const server = createShopServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport!;
        servers[newSessionId] = server;
      },
    });

    transport.onclose = () => {
      const closedSessionId = transport?.sessionId;
      if (closedSessionId) {
        delete transports[closedSessionId];
        const serverForSession = servers[closedSessionId];
        if (serverForSession?.close) {
          serverForSession.close();
        }
        delete servers[closedSessionId];
      }
    };

    await server.connect(transport);
  } else {
    res.status(400).json({
      error: 'Invalid request: missing or unknown session id',
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session id');
    return;
  }

  await transports[sessionId].handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => {
  console.log(`MCP HTTP server listening on http://127.0.0.1:${port}/mcp`);
});
