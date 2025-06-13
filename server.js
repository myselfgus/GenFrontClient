const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

// Mock transcription status tracking
const transcriptionJobs = new Map();

app.use(express.static('public'));
app.use(express.json());

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
  
  // Simulate processing
  simulateTranscription(jobId);
  
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

// Simulate transcription processing
function simulateTranscription(jobId) {
  const job = transcriptionJobs.get(jobId);
  if (!job) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      job.status = 'completed';
      job.transcription = "Esta é uma transcrição simulada da consulta médica. O paciente relatou sintomas de dor abdominal e náusea. Histórico familiar relevante para diabetes. Exame físico sem alterações significativas.";
      clearInterval(interval);
    }
    
    job.progress = Math.min(progress, 100);
    
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'progress',
          jobId,
          progress: job.progress,
          status: job.status,
          transcription: job.transcription
        }));
      }
    });
  }, 500);
}

app.listen(PORT, () => {
  console.log(`ZEO Client running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:8080`);
});