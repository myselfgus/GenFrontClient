/**
 * MCP Server configurations for ZEO Client
 * Add your MCP servers here for easy connection management
 */

const MCP_SERVERS = [
  // Transcription Server (stdio transport)
  {
    name: 'transcription',
    transport: 'stdio',
    command: 'node',
    args: ['../transcription-server/mcp-server.js'],
    env: {
      TRANSCRIPTION_MODEL: 'whisper-large-v3',
      LANGUAGE: 'pt-BR'
    },
    enabled: false,
    description: 'Audio transcription using workers'
  },

  // ZEO Composable MCP (HTTP transport)
  {
    name: 'zeo-composable',
    transport: 'http',
    endpoint: process.env.ZEO_COMPOSABLE_ENDPOINT || 'https://your-worker.workers.dev',
    apiKey: process.env.ZEO_COMPOSABLE_API_KEY,
    enabled: false, // enable when ZEO Composable is deployed
    description: '9 AI tools composable platform on Cloudflare Workers'
  },

  // Clinical Analysis Server (stdio transport)
  {
    name: 'clinical-analysis',
    transport: 'stdio',
    command: 'python',
    args: ['-m', 'clinical_analyzer', '--mcp'],
    env: {
      MODEL: 'clinical-llm-v2'
    },
    enabled: false,
    description: 'Clinical text analysis and insights'
  },

  // Document Management Server (stdio transport)
  {
    name: 'documents',
    transport: 'stdio',
    command: 'node',
    args: ['../document-server/mcp-server.js'],
    env: {
      STORAGE_PATH: './documents',
      FORMAT: 'pdf'
    },
    enabled: false,
    description: 'Document storage and retrieval'
  },

  // Example WebSocket MCP Server
  {
    name: 'realtime-data',
    transport: 'websocket',
    endpoint: 'ws://localhost:8081/mcp',
    enabled: false,
    description: 'Real-time data streaming via WebSocket'
  }
];

/**
 * Get enabled servers for connection
 */
function getEnabledServers() {
  return MCP_SERVERS.filter(server => server.enabled);
}

/**
 * Get server config by name
 */
function getServerConfig(name) {
  return MCP_SERVERS.find(server => server.name === name);
}

/**
 * Add new server configuration
 */
function addServerConfig(config) {
  // Validate required fields based on transport
  const { transport = 'stdio' } = config;
  
  if (!config.name) {
    throw new Error('Server config must have name');
  }
  
  if (transport === 'stdio' && !config.command) {
    throw new Error('stdio transport requires command');
  }
  
  if (['http', 'websocket'].includes(transport) && !config.endpoint) {
    throw new Error(`${transport} transport requires endpoint`);
  }

  // Check if server already exists
  const existingIndex = MCP_SERVERS.findIndex(s => s.name === config.name);
  if (existingIndex >= 0) {
    MCP_SERVERS[existingIndex] = { ...MCP_SERVERS[existingIndex], ...config };
  } else {
    MCP_SERVERS.push({
      transport: 'stdio',
      args: [],
      env: {},
      enabled: false,
      description: '',
      ...config
    });
  }
}

/**
 * Enable/disable server
 */
function toggleServer(name, enabled) {
  const server = getServerConfig(name);
  if (server) {
    server.enabled = enabled;
    return true;
  }
  return false;
}

module.exports = {
  MCP_SERVERS,
  getEnabledServers,
  getServerConfig,
  addServerConfig,
  toggleServer
};