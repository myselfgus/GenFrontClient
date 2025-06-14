const { Agent } = require('mcp-agent');

class ZeoMCPClient {
  constructor() {
    this.agent = null;
    this.connected = false;
    this.servers = new Map();
    this.sessions = new Map(); // Session management
    this.capabilities = new Map(); // Server capabilities cache
    this.connectionHealth = new Map(); // Health monitoring
  }

  async connect(serverConfigs = []) {
    try {
      // Initialize FastAgent MCP client
      this.agent = new Agent();

      // Connect to configured MCP servers
      for (const serverConfig of serverConfigs) {
        await this.connectToServer(serverConfig);
      }

      this.connected = true;
      console.log(`ZEO MCP Client connected to ${this.servers.size} servers`);
      return true;
    } catch (error) {
      console.error('Failed to initialize ZEO MCP Client:', error);
      this.connected = false;
      return false;
    }
  }

  async connectToServer(serverConfig) {
    try {
      const { name, transport = 'stdio', command, args = [], env = {}, endpoint } = serverConfig;
      
      // Support multiple transports
      let connectionConfig;
      switch (transport) {
        case 'stdio':
          connectionConfig = { command, args, env: { ...process.env, ...env } };
          break;
        case 'websocket':
        case 'http':
          connectionConfig = { endpoint, transport };
          break;
        default:
          connectionConfig = { command, args, env: { ...process.env, ...env } };
      }

      // Add server to FastAgent
      await this.agent.addServer(name, connectionConfig);

      // Store server config and initialize capabilities
      this.servers.set(name, serverConfig);
      this.connectionHealth.set(name, { status: 'connected', lastPing: Date.now() });
      
      // Discover server capabilities
      await this.discoverCapabilities(name);
      
      console.log(`Connected to MCP server: ${name} via ${transport}`);
    } catch (error) {
      console.warn(`Failed to connect to server ${serverConfig.name}:`, error);
      this.connectionHealth.set(serverConfig.name, { status: 'failed', error: error.message });
    }
  }

  async transcribeAudio(audioFilePath) {
    if (!this.connected || !this.agent) {
      throw new Error('ZEO MCP Client not connected');
    }

    try {
      // Call transcription via FastAgent MCP framework
      const result = await this.agent.callTool('transcribe_audio', {
        file_path: audioFilePath,
        language: 'pt-BR',
        model: 'whisper-large-v3'
      });

      return {
        success: true,
        transcription: result.content,
        confidence: result.confidence || 0.95
      };
    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeTranscription(transcription) {
    if (!this.connected || !this.agent) {
      throw new Error('ZEO MCP Client not connected');
    }

    try {
      // Call analysis via FastAgent MCP framework
      const result = await this.agent.callTool('analyze_clinical_text', {
        text: transcription,
        context: 'medical_consultation',
        language: 'pt-BR'
      });

      return {
        success: true,
        analysis: result.content,
        summary: result.summary,
        keywords: result.keywords || []
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async callTool(toolName, args, serverName = null) {
    if (!this.connected || !this.agent) {
      throw new Error('ZEO MCP Client not connected');
    }

    try {
      // Call any tool on any connected server
      const result = await this.agent.callTool(toolName, args, serverName);
      return { success: true, result };
    } catch (error) {
      console.error(`Tool call error (${toolName}):`, error);
      return { success: false, error: error.message };
    }
  }

  getConnectedServers() {
    return Array.from(this.servers.keys());
  }

  async getAvailableTools(serverName = null) {
    try {
      return await this.agent.getAvailableTools(serverName);
    } catch (error) {
      console.error('Error getting available tools:', error);
      return [];
    }
  }

  // === MCP COMPLETE FEATURES ===
  
  // Discover server capabilities (Tools, Resources, Prompts)
  async discoverCapabilities(serverName) {
    try {
      const capabilities = {
        tools: await this.agent.getAvailableTools(serverName),
        resources: await this.getAvailableResources(serverName),
        prompts: await this.getAvailablePrompts(serverName)
      };
      
      this.capabilities.set(serverName, capabilities);
      console.log(`Discovered capabilities for ${serverName}:`, capabilities);
      return capabilities;
    } catch (error) {
      console.warn(`Failed to discover capabilities for ${serverName}:`, error);
      return { tools: [], resources: [], prompts: [] };
    }
  }

  // Resources support (GET-like data access)
  async getAvailableResources(serverName = null) {
    try {
      return await this.agent.getAvailableResources?.(serverName) || [];
    } catch (error) {
      console.error('Error getting available resources:', error);
      return [];
    }
  }

  async getResource(resourceUri, serverName = null) {
    if (!this.connected || !this.agent) {
      throw new Error('ZEO MCP Client not connected');
    }

    try {
      const result = await this.agent.getResource?.(resourceUri, serverName);
      return { success: true, resource: result };
    } catch (error) {
      console.error(`Resource access error (${resourceUri}):`, error);
      return { success: false, error: error.message };
    }
  }

  // Prompts support (templates)
  async getAvailablePrompts(serverName = null) {
    try {
      return await this.agent.getAvailablePrompts?.(serverName) || [];
    } catch (error) {
      console.error('Error getting available prompts:', error);
      return [];
    }
  }

  async getPrompt(promptName, args = {}, serverName = null) {
    if (!this.connected || !this.agent) {
      throw new Error('ZEO MCP Client not connected');
    }

    try {
      const result = await this.agent.getPrompt?.(promptName, args, serverName);
      return { success: true, prompt: result };
    } catch (error) {
      console.error(`Prompt access error (${promptName}):`, error);
      return { success: false, error: error.message };
    }
  }

  // Session Management
  createSession(sessionId, context = {}) {
    this.sessions.set(sessionId, {
      id: sessionId,
      context,
      history: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });
    return this.sessions.get(sessionId);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivity: new Date() });
      return session;
    }
    return null;
  }

  destroySession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  // Health Monitoring
  async pingServer(serverName) {
    try {
      const health = await this.agent.ping?.(serverName) || { status: 'unknown' };
      this.connectionHealth.set(serverName, {
        ...health,
        lastPing: Date.now()
      });
      return health;
    } catch (error) {
      this.connectionHealth.set(serverName, {
        status: 'error',
        error: error.message,
        lastPing: Date.now()
      });
      return { status: 'error', error: error.message };
    }
  }

  getServerHealth(serverName = null) {
    if (serverName) {
      return this.connectionHealth.get(serverName);
    }
    return Object.fromEntries(this.connectionHealth);
  }

  // Advanced Tool Calling with Session Context
  async callToolWithSession(toolName, args, sessionId, serverName = null) {
    const session = this.getSession(sessionId);
    if (session) {
      // Add session context to tool call
      args = { ...args, _session: session.context };
      
      const result = await this.callTool(toolName, args, serverName);
      
      // Update session history
      session.history.push({
        type: 'tool_call',
        tool: toolName,
        args,
        result,
        timestamp: new Date()
      });
      
      this.updateSession(sessionId, { history: session.history });
      return result;
    }
    
    return this.callTool(toolName, args, serverName);
  }

  // Batch Operations
  async batchToolCalls(calls, sessionId = null) {
    const results = [];
    
    for (const call of calls) {
      try {
        const result = sessionId 
          ? await this.callToolWithSession(call.tool, call.args, sessionId, call.server)
          : await this.callTool(call.tool, call.args, call.server);
        results.push({ ...call, result });
      } catch (error) {
        results.push({ ...call, error: error.message });
      }
    }
    
    return results;
  }

  // Complete Server Status
  getServerStatus() {
    const status = {};
    
    for (const [name, config] of this.servers) {
      const health = this.connectionHealth.get(name);
      const capabilities = this.capabilities.get(name);
      
      status[name] = {
        config,
        health,
        capabilities,
        transport: config.transport || 'stdio'
      };
    }
    
    return status;
  }

  async disconnect() {
    if (this.agent && this.connected) {
      await this.agent.close();
      this.connected = false;
      this.servers.clear();
      this.sessions.clear();
      this.capabilities.clear();
      this.connectionHealth.clear();
      console.log('ZEO MCP Client disconnected');
    }
  }
}

module.exports = ZeoMCPClient;