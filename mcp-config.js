const { Agent } = require('mcp-agent');

class ZeoMCPClient {
  constructor() {
    this.agent = null;
    this.connected = false;
    this.servers = new Map();
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
      const { name, command, args = [], env = {} } = serverConfig;
      
      // Add server to FastAgent
      await this.agent.addServer(name, {
        command,
        args,
        env: { ...process.env, ...env }
      });

      this.servers.set(name, serverConfig);
      console.log(`Connected to MCP server: ${name}`);
    } catch (error) {
      console.warn(`Failed to connect to server ${serverConfig.name}:`, error);
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

  async disconnect() {
    if (this.agent && this.connected) {
      await this.agent.close();
      this.connected = false;
      this.servers.clear();
      console.log('ZEO MCP Client disconnected');
    }
  }
}

module.exports = ZeoMCPClient;