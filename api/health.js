// Health Check Endpoint for Vercel
const { getEnabledServers } = require('../mcp-servers.config');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const enabledServers = getEnabledServers();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      mcp: {
        status: 'ready',
        servers: enabledServers.length,
        serverNames: enabledServers.map(s => s.name)
      },
      xai: {
        configured: !!process.env.XAI_API_KEY,
        status: 'ready'
      },
      entra: {
        configured: !!process.env.ENTRA_CLIENT_ID,
        clientId: process.env.ENTRA_CLIENT_ID ? 'configured' : 'missing'
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        deployment: process.env.VERCEL_URL || 'local'
      }
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}