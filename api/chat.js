// xAI Chat Endpoint for Vercel
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
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const XAI_API_KEY = process.env.XAI_API_KEY;
    
    if (!XAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'xAI API key not configured' 
      });
    }

    // Prepare messages for xAI
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

    // Call xAI API
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        messages,
        model: 'grok-beta',
        temperature: 0.25,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!xaiResponse.ok) {
      const errorText = await xaiResponse.text();
      console.error('xAI API error:', xaiResponse.status, errorText);
      return res.status(500).json({
        success: false,
        error: `xAI API error: ${xaiResponse.status}`
      });
    }

    const data = await xaiResponse.json();
    const response = data.choices[0].message.content;

    res.status(200).json({
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
}