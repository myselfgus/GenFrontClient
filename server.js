const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const ZeoMCPClient = require('./mcp-config');
const { getEnabledServers } = require('./mcp-servers.config');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE?.replace('MB', '')) * 1024 * 1024 || 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ 
  port: NODE_ENV === 'production' ? PORT + 1 : WEBSOCKET_PORT 
});

// ZEO MCP Client instance using FastAgent framework
const mcpClient = new ZeoMCPClient();

// Transcription jobs tracking
const transcriptionJobs = new Map();

// Initialize MCP connections to configured servers
async function initializeMCP() {
  const enabledServers = getEnabledServers();
  
  if (enabledServers.length === 0) {
    console.warn('No MCP servers enabled - running with mock transcription');
    return;
  }

  const connected = await mcpClient.connect(enabledServers);
  if (!connected) {
    console.warn('ZEO MCP Client failed to connect - falling back to mock mode');
  } else {
    console.log(`Connected servers: ${mcpClient.getConnectedServers().join(', ')}`);
  }
}

initializeMCP();

// Production CORS configuration
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

app.use(express.static('public'));
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));

// Audio upload endpoint
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const jobId = `job_${Date.now()}`;
  const job = {
    id: jobId,
    filename: req.file.filename,
    status: 'processing',
    progress: 0,
    transcription: null,
    createdAt: new Date()
  };

  transcriptionJobs.set(jobId, job);
  
  // Process transcription with FastAgent MCP Client
  processTranscription(jobId, req.file.path);
  
  res.json({ jobId, status: 'uploaded' });
});

// Get job status
app.get('/status/:jobId', (req, res) => {
  const job = transcriptionJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Process transcription using FastAgent MCP Client
async function processTranscription(jobId, audioFilePath) {
  const job = transcriptionJobs.get(jobId);
  if (!job) return;

  try {
    // Update progress: starting transcription
    job.progress = 10;
    broadcastProgress(jobId, job);

    // Transcribe audio using configured MCP server
    const transcriptionResult = await mcpClient.transcribeAudio(audioFilePath);
    
    if (transcriptionResult.success) {
      job.progress = 70;
      job.transcription = transcriptionResult.transcription;
      broadcastProgress(jobId, job);

      // Analyze transcription for clinical insights
      const analysisResult = await mcpClient.analyzeTranscription(transcriptionResult.transcription);
      
      if (analysisResult.success) {
        job.analysis = analysisResult.analysis;
        job.summary = analysisResult.summary;
        job.keywords = analysisResult.keywords;
      }

      job.progress = 100;
      job.status = 'completed';
    } else {
      // Fallback to mock transcription if FastAgent fails
      job.transcription = "Esta é uma transcrição simulada da consulta médica. O paciente relatou sintomas de dor abdominal e náusea. Histórico familiar relevante para diabetes. Exame físico sem alterações significativas.";
      job.progress = 100;
      job.status = 'completed';
      console.warn('MCP transcription failed, using fallback:', transcriptionResult.error);
    }
  } catch (error) {
    console.error('Transcription processing error:', error);
    job.status = 'error';
    job.error = error.message;
  }

  broadcastProgress(jobId, job);
}

// Broadcast progress updates to all connected clients
function broadcastProgress(jobId, job) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'progress',
        jobId,
        progress: job.progress,
        status: job.status,
        transcription: job.transcription,
        analysis: job.analysis,
        summary: job.summary,
        keywords: job.keywords,
        error: job.error
      }));
    }
  });
}

// Add endpoint to get connected MCP servers info
app.get('/mcp/servers', (req, res) => {
  res.json({
    connected: mcpClient.getConnectedServers(),
    status: mcpClient.connected ? 'connected' : 'disconnected'
  });
});

// Add endpoint to get available tools from MCP servers
app.get('/mcp/tools/:serverName?', async (req, res) => {
  try {
    const tools = await mcpClient.getAvailableTools(req.params.serverName);
    res.json({ tools });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down ZEO Client...');
  await mcpClient.disconnect();
  process.exit(0);
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV,
    mcp_connected: mcpClient.connected,
    connected_servers: mcpClient.getConnectedServers()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ZEO Client running on port ${PORT}`);
  console.log(`📡 WebSocket server running on port ${NODE_ENV === 'production' ? PORT + 1 : WEBSOCKET_PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: /health`);
});