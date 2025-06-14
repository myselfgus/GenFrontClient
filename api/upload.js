// Audio Upload Endpoint for Vercel (will connect to MCP servers)
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, return success response 
    // Will be implemented with MCP remote servers
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.status(200).json({
      success: true,
      jobId: jobId,
      status: 'processing',
      message: 'Upload received - connecting to MCP transcription servers'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}