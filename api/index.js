const express = require('express');
const multer = require('multer');
const path = require('path');
const ZeoMCPClient = require('../mcp-config');
const { getEnabledServers } = require('../mcp-servers.config');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for production
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Multer for file uploads (Vercel compatible)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

// ZEO MCP Client instance
const mcpClient = new ZeoMCPClient();
const transcriptionJobs = new Map();

// Initialize MCP client
async function initializeMCP() {
  try {
    const enabledServers = getEnabledServers();
    if (enabledServers.length > 0) {
      await mcpClient.connect(enabledServers);
      console.log('ZEO MCP Client initialized with servers:', enabledServers.map(s => s.name));
    } else {
      console.log('No MCP servers enabled - running with mock transcription');
    }
  } catch (error) {
    console.error('Failed to initialize MCP client:', error);
  }
}

// Initialize on cold start
initializeMCP();

// xAI Integration - ONLY for chatbot
async function callXAI(messages, model = 'grok-beta') {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  
  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      messages,
      model,
      temperature: 0.25,
      max_tokens: 2000,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const mcpStatus = mcpClient.connected ? 'connected' : 'disconnected';
    const enabledServers = getEnabledServers();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      mcp: {
        status: mcpStatus,
        servers: enabledServers.length,
        serverNames: enabledServers.map(s => s.name)
      },
      xai: {
        configured: !!process.env.XAI_API_KEY,
        status: 'ready'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Audio upload and transcription
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job with file buffer
    transcriptionJobs.set(jobId, {
      id: jobId,
      filename: req.file.originalname,
      buffer: req.file.buffer,
      status: 'processing',
      progress: 0,
      transcription: null,
      createdAt: new Date()
    });

    // Process transcription
    processTranscription(jobId);

    res.json({
      success: true,
      jobId: jobId,
      filename: req.file.originalname,
      status: 'processing'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process transcription (mock or MCP)
async function processTranscription(jobId) {
  const job = transcriptionJobs.get(jobId);
  if (!job) return;

  try {
    // Update progress
    job.progress = 20;
    
    let transcriptionResult;
    let analysisResult;

    if (mcpClient.connected) {
      // Use MCP for real transcription
      transcriptionResult = await mcpClient.transcribeAudio(job.buffer);
      job.progress = 60;
      
      if (transcriptionResult.success) {
        analysisResult = await mcpClient.analyzeTranscription(transcriptionResult.transcription);
      }
    } else {
      // Mock transcription - NO xAI usage here
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockTranscription = "Paciente relatou dor abdominal há 3 dias, localizada no quadrante superior direito. Nega febre, náuseas ou vômitos. Exame físico revela sensibilidade à palpação. Solicito ultrassom abdominal para investigação.";
      
      transcriptionResult = {
        success: true,
        transcription: mockTranscription,
        confidence: 0.95
      };

      // Mock analysis - will be replaced by proper MCP servers
      analysisResult = {
        success: true,
        analysis: "Análise será feita por servidores MCP específicos",
        summary: "Dor abdominal - investigação necessária",
        keywords: ["dor abdominal", "quadrante superior direito", "ultrassom"]
      };
    }

    job.progress = 90;

    // Finalize results
    job.transcription = transcriptionResult.transcription;
    job.analysis = analysisResult;
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();

  } catch (error) {
    console.error('Processing error:', error);
    job.status = 'error';
    job.error = error.message;
  }
}

// Get job status
app.get('/api/status/:jobId', (req, res) => {
  const job = transcriptionJobs.get(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const response = {
    id: job.id,
    filename: job.filename,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt
  };

  if (job.status === 'completed') {
    response.transcription = job.transcription;
    response.analysis = job.analysis;
    response.completedAt = job.completedAt;
  }

  if (job.status === 'error') {
    response.error = job.error;
  }

  res.json(response);
});

// xAI Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [
      {
        role: "system",
        content: "Você é o ZEO, um assistente clínico AI especializado em medicina. Responda de forma profissional, precisa e útil para profissionais de saúde."
      }
    ];

    if (context) {
      messages.push({
        role: "system",
        content: `Contexto da consulta: ${JSON.stringify(context)}`
      });
    }

    messages.push({
      role: "user",
      content: message
    });

    const response = await callXAI(messages);

    res.json({
      success: true,
      response,
      model: 'grok-beta',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// MCP endpoints
app.get('/api/mcp/servers', (req, res) => {
  res.json(mcpClient.getServerStatus());
});

app.get('/api/mcp/tools/:serverName?', async (req, res) => {
  try {
    const tools = await mcpClient.getAvailableTools(req.params.serverName);
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export for Vercel
module.exports = app;