import express from 'express';
import multer from 'multer';
import { dbOperations } from '../db/database.js';
import { transcribeAudio, processConversation, generateSpeech } from '../services/openai.js';
import { createVoiceResponse, gatherSpeech, sendSMS } from '../services/twilio.js';

const router = express.Router();

// Store conversation state (in production, use Redis or similar)
const conversations = new Map();

// Incoming call handler
router.post('/incoming', (req, res) => {
  const callSid = req.body.CallSid;
  
  // Initialize conversation
  conversations.set(callSid, {
    history: [],
    reservationData: {}
  });
  
  // Log the call
  dbOperations.run(
    'INSERT INTO call_logs (call_sid, phone_number, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [callSid, req.body.From || 'Unknown']
  );
  
  const greeting = "Thank you for calling Shaw's Steakhouse, home of Santa Maria's finest BBQ. I'm your virtual host. How can I help you today?";
  
  const twiml = gatherSpeech(greeting, '/voice/process');
  res.type('text/xml');
  res.send(twiml);
});

// Process speech
router.post('/process', async (req, res) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult || '';
  
  const conversation = conversations.get(callSid) || { history: [], reservationData: {} };
  
  // Process with OpenAI
  const aiResponse = await processConversation(speechResult, conversation.history);
  
  // Update conversation history
  conversation.history.push(
    { role: 'user', content: speechResult },
    { role: 'assistant', content: aiResponse.response }
  );
  
  // Check if we have complete reservation data
  if (aiResponse.intent === 'make_reservation' && aiResponse.reservationData) {
    conversation.reservationData = {
      ...conversation.reservationData,
      ...aiResponse.reservationData
    };
    
    // Check if we have all required fields
    const { customerName, phoneNumber, partySize, date, time } = extractAllReservationData(conversation);
    
    if (customerName && phoneNumber && partySize && date && time) {
      // Create reservation
      const result = dbOperations.run(`
        INSERT INTO reservations (
          customer_name, phone_number, party_size,
          reservation_date, reservation_time, status
        ) VALUES (?, ?, ?, ?, ?, 'confirmed')
      `, [customerName, phoneNumber, partySize, date, time]);
      
      // Update call log
      dbOperations.run(
        'UPDATE call_logs SET reservation_id = ?, transcript = ? WHERE call_sid = ?',
        [result.lastInsertRowid, conversation.history.map(h => `${h.role}: ${h.content}`).join('\n'), callSid]
      );
      
      // Send confirmation SMS
      try {
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
        await sendSMS(formattedPhone, 
          `Hi ${customerName}! Your reservation at Shaw's Steakhouse is confirmed for ${partySize} guests on ${date} at ${time}. See you soon!`
        );
      } catch (smsError) {
        console.error('SMS failed:', smsError);
      }
      
      // End call
      const twiml = createVoiceResponse(
        `Perfect! I've booked your reservation for ${partySize} people on ${date} at ${time}. You'll receive a confirmation text shortly. Thank you for choosing Shaw's Steakhouse! Goodbye.`
      );
      
      conversations.delete(callSid);
      res.type('text/xml');
      return res.send(twiml);
    }
  }
  
  // Check for goodbye
  if (speechResult.toLowerCase().includes('goodbye') || 
      speechResult.toLowerCase().includes('that\'s all') ||
      speechResult.toLowerCase().includes('thank you')) {
    
    const twiml = createVoiceResponse("Thank you for calling Shaw's Steakhouse. We hope to see you soon! Goodbye.");
    conversations.delete(callSid);
    res.type('text/xml');
    return res.send(twiml);
  }
  
  // Continue conversation
  conversations.set(callSid, conversation);
  
  const twiml = gatherSpeech(aiResponse.response, '/voice/process');
  res.type('text/xml');
  res.send(twiml);
});

// Get call logs
router.get('/logs', (req, res) => {
  try {
    const logs = dbOperations.all(
      'SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 100'
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual transcription endpoint (for testing)
router.post('/transcribe', multer().single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const audioBuffer = req.file.buffer;
    const transcript = await transcribeAudio(audioBuffer);
    
    res.json({ transcript });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function extractAllReservationData(conversation) {
  const allText = conversation.history.map(h => h.content).join(' ');
  
  // Extract name (look for "my name is", "this is", etc.)
  const nameMatch = allText.match(/(?:my name is|this is|i'm|i am)\s+([A-Z][a-z]+)/i);
  const customerName = nameMatch ? nameMatch[1] : conversation.reservationData.customerName;
  
  // Extract phone (look for phone numbers)
  const phoneMatch = allText.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/);
  const phoneNumber = phoneMatch ? phoneMatch[1] : conversation.reservationData.phoneNumber;
  
  // Extract party size
  const partyMatch = allText.match(/(\d+)\s*(people|person|party|guests)/i);
  const partySize = partyMatch ? parseInt(partyMatch[1]) : conversation.reservationData.partySize;
  
  // Extract date
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}(\/\d{2,4})?)/,
    /(today|tomorrow|tonight)/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];
  let date = null;
  for (const pattern of datePatterns) {
    const match = allText.match(pattern);
    if (match) {
      date = match[1];
      break;
    }
  }
  
  // Extract time
  const timeMatch = allText.match(/(\d{1,2}):?(\d{2})?\s*(pm|am|p\.m\.|a\.m\.)?/i);
  const time = timeMatch ? timeMatch[0] : conversation.reservationData.time;
  
  return { customerName, phoneNumber, partySize, date, time };
}

export default router;
