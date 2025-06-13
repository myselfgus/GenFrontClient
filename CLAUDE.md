# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (runs on port 3000)
- `npm start` - Start production server 
- `npm install` - Install dependencies

## Architecture Overview

**ZEO** is a clinical AI assistant client designed for extensible MCP (Model Context Protocol) integration. The current implementation is a foundation for future MCP server connections.

### Core Components

**Backend (server.js)**
- Express.js server handling audio uploads via multer
- WebSocket server on port 8080 for real-time progress updates
- Mock transcription simulation (to be replaced with actual MCP server calls)
- Job tracking system with in-memory storage
- Audio file validation and storage in `uploads/` directory

**Frontend (public/)**
- Single-page application with three main states: upload → processing → results
- Real-time WebSocket connection for progress updates
- Audio recording via MediaRecorder API and file upload support
- Tesla/xAI inspired glassmorphism UI design

### Data Flow

1. Audio input (recording or file upload) → server upload endpoint
2. Server creates job ID and stores in `transcriptionJobs` Map
3. WebSocket broadcasts progress updates to all connected clients
4. Mock processing completes → client displays transcription results

### Key Design Patterns

- **State Management**: UI sections show/hide based on processing state
- **Real-time Updates**: WebSocket connection maintains progress sync
- **Job Tracking**: Server-side Map tracks processing jobs by ID
- **Extensible Architecture**: Built to integrate with future MCP servers

### Future MCP Integration Points

The `simulateTranscription()` function in server.js is designed to be replaced with actual MCP server communication. The job tracking and WebSocket broadcasting infrastructure is already in place to support real transcription services.

### UI State Flow

Upload Section → Processing Section → Results Section → (Reset to Upload)

Each section is completely self-contained with its own DOM elements and event handlers managed by the `ZeoClient` class.