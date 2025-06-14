# ZEO Client - Production Deployment Guide

## Architecture Overview
- **Frontend**: Cloudflare Pages (`public/` folder)
- **Backend**: Railway (Node.js server with MCP client)
- **WebSocket**: Railway WebSocket server
- **DNS**: Cloudflare for routing

## Deployment Steps

### 1. Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy backend
railway up

# Set environment variables in Railway dashboard
```

**Environment Variables for Railway:**
```env
NODE_ENV=production
PORT=3000
WEBSOCKET_PORT=8080
MCP_TRANSCRIPTION_SERVER_PATH=../transcription-server/mcp-server.js
MCP_TRANSCRIPTION_MODEL=whisper-large-v3
MCP_LANGUAGE=pt-BR
FRONTEND_URL=https://zeo-client.pages.dev
ALLOWED_ORIGINS=https://zeo-client.pages.dev,https://zeo.app
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads
SESSION_SECRET=your-super-secret-key-here
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 2. Deploy Frontend to Cloudflare Pages

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Pages
wrangler pages publish public --project-name=zeo-client
```

**Or connect GitHub repo to Cloudflare Pages:**
1. Go to Cloudflare Pages dashboard
2. Connect GitHub repository
3. Set build command: `npm install`
4. Set build output directory: `public`
5. Deploy

### 3. Update Backend URL

After Railway deployment, update the WebSocket URL in:
- `public/script.js` (line 54)
- `_redirects` file

Replace `zeo-backend.railway.app` with your actual Railway URL.

### 4. Configure Custom Domain (Optional)

**In Cloudflare Dashboard:**
1. Add custom domain to Pages project
2. Update DNS records
3. Configure SSL/TLS

**Update URLs in:**
- `public/script.js`
- `_redirects`
- Railway environment variables

## Health Checks

- **Backend**: `https://your-railway-url.railway.app/health`
- **Frontend**: `https://zeo-client.pages.dev`

## Monitoring

- **Railway**: Built-in logs and metrics
- **Cloudflare**: Analytics and performance insights
- **WebSocket**: Connection status in browser console

## Scaling

- **Railway**: Auto-scaling based on traffic
- **Cloudflare Pages**: Global CDN, unlimited requests
- **MCP Servers**: Add more servers in `mcp-servers.config.js`

## Security

- CORS configured for production domains
- Security headers in `_headers`
- File upload limits configured
- Rate limiting enabled

## Costs

- **Railway**: ~$5-20/month (depending on usage)
- **Cloudflare Pages**: Free tier (100,000 requests/month)
- **Custom Domain**: Free with Cloudflare

## Next Steps

1. **Deploy and test**
2. **Add your transcription server** when ready
3. **Configure custom domain**
4. **Add more MCP servers** as needed
5. **Monitor performance** and optimize