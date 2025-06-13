# ZEO - AI Clinical Assistant

Modern, extensible MCP client for clinical transcription and AI assistance with Tesla/xAI inspired interface.

## ✨ Features

- **Audio Recording & Upload**: Native browser recording or file upload support
- **Real-time Processing**: WebSocket-based progress updates with smooth animations
- **Modern UI**: Glassmorphism design with GSAP animations and Inter typography
- **MCP Architecture**: Built for future integration with Model Context Protocol servers
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## 🏗️ Architecture

**Frontend**: Single-page app with three main states:
- Upload (recording/file selection)
- Processing (real-time progress)  
- Results (transcription display)

**Backend**: Express.js server with:
- Audio upload handling via multer
- WebSocket server (port 8080) for real-time updates
- Job tracking system for processing state
- Mock transcription (ready for MCP server integration)

## 🎨 Design System

- **Typography**: Space Grotesk (headers) + Manrope (body) for modern clarity
- **Icons**: Lucide icon system with crisp vectors
- **Aesthetic**: Monochromatic with subtle matte glow effects
- **Layout**: Borderless components with clean minimalist approach
- **Animations**: GSAP-powered smooth transitions with refined feedback
- **Colors**: Dark gradient palette (#0f0f0f → #1a1a1a) with subtle white accents

## 🔧 Future Integration

The current mock transcription system (`simulateTranscription()` in `server.js`) is designed to be easily replaced with actual MCP server communication. The WebSocket infrastructure and job tracking are already in place to support real transcription services.

## 📁 Project Structure

```
├── public/
│   ├── index.html      # Main UI with glassmorphism design
│   ├── style.css       # Modern CSS with GSAP integration
│   └── script.js       # Client-side logic with animations
├── server.js           # Express server with WebSocket support
├── package.json        # Dependencies and scripts
└── CLAUDE.md          # Development guidance
```

## 🛠️ Development

- Built with vanilla JavaScript for maximum compatibility
- Uses modern web APIs (MediaRecorder, WebSocket, File API)
- GSAP for professional-grade animations
- Express.js backend ready for MCP server integration

---

**ZEO** - Where clinical AI meets modern design.