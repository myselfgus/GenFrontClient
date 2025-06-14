/**
 * MCP Server configurations for ZEO Client
 * Add your MCP servers here for easy connection management
 */

const MCP_SERVERS = [
  // Transcription Server (your server with workers - when ready)
  {
    name: 'transcription',
    command: 'node',
    args: ['../transcription-server/mcp-server.js'], // adjust path when ready
    env: {
      TRANSCRIPTION_MODEL: 'whisper-large-v3',
      LANGUAGE: 'pt-BR'
    },
    enabled: false, // set to true when your server is ready
    description: 'Audio transcription using workers'
  },

  // Example: Future clinical analysis server
  {
    name: 'clinical-analysis',
    command: 'python',
    args: ['-m', 'clinical_analyzer', '--mcp'],
    env: {
      MODEL: 'clinical-llm-v2'
    },
    enabled: false, // enable when created
    description: 'Clinical text analysis and insights'
  },

  // Example: Future document management server
  {
    name: 'documents',
    command: 'node',
    args: ['../document-server/mcp-server.js'],
    env: {
      STORAGE_PATH: './documents',
      FORMAT: 'pdf'
    },
    enabled: false, // enable when created
    description: 'Document storage and retrieval'
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
  // Validate required fields
  if (!config.name || !config.command) {
    throw new Error('Server config must have name and command');
  }

  // Check if server already exists
  const existingIndex = MCP_SERVERS.findIndex(s => s.name === config.name);
  if (existingIndex >= 0) {
    MCP_SERVERS[existingIndex] = { ...MCP_SERVERS[existingIndex], ...config };
  } else {
    MCP_SERVERS.push({
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