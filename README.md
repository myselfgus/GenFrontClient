# ZEO - AI Clinical Assistant

Production-ready MCP client for clinical transcription and AI assistance. Modern, extensible architecture with FastAgent integration, deployed on Railway + Cloudflare.

## ✨ Features

- **FastAgent MCP Integration**: Production MCP client using FastAgent framework
- **Multi-Server Architecture**: Connect to multiple specialized MCP servers
- **Animated Splash Screen**: Professional intro with ZEO logo animation sequence
- **Audio Recording & Upload**: Native browser recording or file upload support
- **Real-time Processing**: WebSocket-based progress updates with smooth animations
- **Production Deploy**: Railway backend + Cloudflare Pages frontend
- **Minimalist UI**: Tesla/xAI inspired monochromatic design with glassmorphism
- **Modern Typography**: Space Grotesk + Manrope font pairing for enhanced readability
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Production Deployment
```bash
# Deploy backend to Railway
railway up

# Deploy frontend to Cloudflare Pages
wrangler pages publish public --project-name=zeo-client
```

See `deploy.md` for complete deployment guide.

## 🏗️ Architecture

### Production Stack
- **Frontend**: Cloudflare Pages (static assets + CDN)
- **Backend**: Railway (Node.js + WebSocket server)
- **MCP Client**: FastAgent framework for multi-server connections
- **DNS/Routing**: Cloudflare for seamless integration

### Application Flow
**Frontend**: Single-page app with animated intro and three main states:
- Splash Screen (animated logo sequence with loading)
- Upload (recording/file selection)
- Processing (real-time progress)  
- Results (transcription display)

**Backend**: Express.js server with:
- FastAgent MCP client for connecting to transcription servers
- Audio upload handling via multer (50MB limit)
- WebSocket server for real-time progress updates
- Job tracking system with in-memory storage
- Health check endpoint (`/health`) for monitoring

### MCP Integration
- **ZeoMCPClient**: Wrapper around FastAgent framework
- **Multi-Server Support**: Configure multiple MCP servers in `mcp-servers.config.js`
- **Flexible Routing**: Add your transcription server when ready
- **Fallback Mode**: Mock transcription when no servers are enabled

## 🎨 Design System

- **Typography**: Space Grotesk (headers) + Manrope (body) for modern clarity
- **Icons**: Lucide icon system with crisp vectors
- **Aesthetic**: Monochromatic with subtle matte glow effects
- **Layout**: Borderless components with clean minimalist approach
- **Animations**: GSAP-powered smooth transitions with refined feedback
- **Colors**: Dark gradient palette (#0f0f0f → #1a1a1a) with subtle white accents

## 🔧 Adding Your MCP Servers

1. **Configure Server** in `mcp-servers.config.js`:
```javascript
{
  name: 'your-transcription-server',
  command: 'node',
  args: ['../your-server/mcp-server.js'],
  enabled: true,
  description: 'Your custom transcription server'
}
```

2. **Enable Server**: Set `enabled: true`
3. **Restart**: ZEO will automatically connect to your server
4. **Monitor**: Check `/mcp/servers` endpoint for connection status

## 📁 Project Structure

```
├── public/                 # Frontend (Cloudflare Pages)
│   ├── index.html         # Main UI with glassmorphism design
│   ├── style.css          # Modern CSS with GSAP integration
│   └── script.js          # Client-side logic with animations
├── server.js              # Express server with WebSocket support
├── mcp-config.js          # ZEO MCP Client using FastAgent
├── mcp-servers.config.js  # MCP server configurations
├── railway.toml           # Railway deployment config
├── wrangler.toml          # Cloudflare Pages config
├── _headers               # Security headers
├── _redirects             # API routing to Railway
├── deploy.md              # Complete deployment guide
├── package.json           # Dependencies and scripts
└── CLAUDE.md              # Development guidance
```

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript for maximum compatibility
- Modern web APIs (MediaRecorder, WebSocket, File API)
- GSAP for professional-grade animations
- Cloudflare Pages for global CDN

**Backend:**
- Node.js + Express.js server
- FastAgent MCP client framework
- WebSocket for real-time communication
- Railway for scalable hosting

**MCP Integration:**
- `@modelcontextprotocol/sdk` for core MCP functionality
- `mcp-agent` (FastAgent) for multi-server management
- Flexible server configuration system

## 🚀 Production URLs

- **Frontend**: `https://zeo-client.pages.dev`
- **Backend**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/health`

## 📈 Monitoring

- Railway built-in metrics and logs
- Cloudflare Analytics and performance insights  
- WebSocket connection status in browser console
- MCP server status via `/mcp/servers` endpoint

---

**ZEO** - Production-ready clinical AI with modern design 🚀