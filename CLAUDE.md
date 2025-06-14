# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (runs on port 3000)
- `npm start` - Start production server 
- `npm install` - Install dependencies
- `npm run build` - Install production dependencies
- `npm run railway:deploy` - Deploy to Railway
- `npm run railway:logs` - View Railway deployment logs

## Architecture Overview

**ZEO** is a production-ready clinical AI assistant client with FastAgent MCP integration. The application supports multiple MCP servers for transcription, clinical analysis, and document management.

### Core Components

**Backend (server.js)**
- Express.js server handling audio uploads via multer
- WebSocket server for real-time progress updates (port 8080 dev, PORT+1 production)
- FastAgent MCP Client integration with fallback to mock transcription
- Job tracking system with in-memory storage
- Audio file validation and storage in `uploads/` directory
- Production CORS configuration and health check endpoints
- Graceful shutdown handling for MCP connections

**Frontend (public/)**
- Single-page application with cinematic splash screen and three main states: upload → processing → results
- Real-time WebSocket connection for progress updates
- Audio recording via MediaRecorder API and file upload support
- Tesla/xAI inspired glassmorphism UI design with Space Grotesk + Manrope typography
- Responsive design with smooth animations and transitions

**MCP Configuration (mcp-config.js & mcp-servers.config.js)**
- Complete MCP client implementation with all 3 core capabilities (Tools, Resources, Prompts)
- Multi-transport support: stdio, HTTP, WebSocket, UNIX sockets
- Session management with context and history tracking
- Health monitoring and automatic reconnection
- Batch operations and advanced tool calling
- Server capability discovery and caching

### Data Flow

1. Audio input (recording or file upload) → server upload endpoint
2. Server creates job ID and stores in `transcriptionJobs` Map  
3. FastAgent MCP Client processes audio via configured servers (transcription → clinical analysis)
4. WebSocket broadcasts real-time progress updates to all connected clients
5. Results include transcription, analysis, summary, and keywords
6. Fallback to mock transcription if MCP servers unavailable

### Key Design Patterns

- **State Management**: UI sections show/hide based on processing state
- **Real-time Updates**: WebSocket connection maintains progress sync  
- **Job Tracking**: Server-side Map tracks processing jobs by ID
- **MCP Integration**: FastAgent framework provides standardized server communication
- **Graceful Degradation**: Automatic fallback to mock data when MCP servers unavailable
- **Production Ready**: Environment-based configuration with health checks and CORS

### MCP Server Integration

The application connects to MCP servers defined in `mcp-servers.config.js`. Current server types include:
- **transcription**: Audio-to-text using Whisper models
- **clinical-analysis**: Medical text analysis and insights  
- **documents**: Document storage and retrieval

Servers can be enabled/disabled via configuration. The `ZeoMCPClient` handles connection management, tool calling, and error handling with automatic fallback to mock responses.

### UI State Flow

Splash Screen → Upload Section → Processing Section → Results Section → (Reset to Upload)

Each section is completely self-contained with its own DOM elements and event handlers managed by the `ZeoClient` class. The splash screen features animated logo sequences before transitioning to the main application.

## Key Endpoints

### Core Application
- `POST /upload` - Audio file upload and processing trigger
- `GET /status/:jobId` - Check processing status for specific job
- `GET /health` - Application health check with MCP connection status

### MCP Management
- `GET /mcp/servers` - Complete server status with health and capabilities
- `GET /mcp/health/:serverName?` - Server health monitoring and ping
- `GET /mcp/tools/:serverName?` - Get available tools from MCP servers

### MCP Resources & Prompts
- `GET /mcp/resources/:serverName?` - Get available resources (data sources)
- `GET /mcp/resource/:resourceUri` - Access specific resource
- `GET /mcp/prompts/:serverName?` - Get available prompt templates
- `POST /mcp/prompt/:promptName` - Execute prompt with parameters

### Advanced MCP Features
- `POST /mcp/sessions` - Create session with context
- `GET /mcp/sessions/:sessionId` - Get session state and history
- `POST /mcp/tool/:toolName` - Advanced tool call with session context
- `POST /mcp/batch` - Batch multiple tool calls

## Environment Configuration

Production deployment uses environment variables for:
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (defaults to 3000)
- `WEBSOCKET_PORT` - WebSocket port (defaults to 8080, production uses PORT+1)
- `MAX_FILE_SIZE` - Audio file size limit (defaults to 50MB)  
- `ALLOWED_ORIGINS` - CORS allowed origins for production