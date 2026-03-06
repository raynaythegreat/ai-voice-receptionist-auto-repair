import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Santa Maria Auto Repair context
const SHOP_CONTEXT = `
You are the voice receptionist for Santa Maria Auto Repair.

ABOUT THE SHOP:
- Full-service auto repair shop
- Open Monday-Friday 8am-6pm, Saturday 9am-4pm, Closed Sunday
- Located at 123 E Main St, Santa Maria, CA 93454
- Phone: (805) 555-7890
- Certified mechanics with 20+ years experience
- Free estimates on all repairs

SERVICES OFFERED:
- Oil changes ($45-65)
- Brake service ($150-300)
- Engine diagnostics ($75)
- Tune-ups ($150-250)
- AC repair ($100-300)
- Transmission service ($150-400)
- Tire rotation ($25)
- General repairs and maintenance

YOUR ROLE:
- Take appointments (collect: name, phone, car make/model, service needed, preferred time)
- Provide rough estimates for common services
- Answer questions about hours, location, services
- Handle emergency calls (flag urgency, offer to text owner)
- Be helpful and knowledgeable
- Keep responses SHORT and CONVERSATIONAL (2-3 sentences max)

For appointments, collect:
1. Customer name
2. Phone number
3. Car make and model
4. Service needed
5. Preferred date/time

Always confirm details back to them.
`;

export async function transcribeAudio(audioBuffer) {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: "whisper-1",
      language: "en"
    });
    return response.text;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

export async function processConversation(transcript, conversationHistory = []) {
  const messages = [
    { role: "system", content: SHOP_CONTEXT },
    ...conversationHistory,
    { role: "user", content: transcript }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 150,
      temperature: 0.7
    });

    return {
      response: response.choices[0].message.content,
      intent: detectIntent(transcript),
      appointmentData: extractAppointmentData(messages)
    };
  } catch (error) {
    console.error('Conversation error:', error);
    return {
      response: "I'm sorry, I'm having trouble right now. Please call back or try again.",
      intent: 'error'
    };
  }
}

export async function generateSpeech(text) {
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "echo",
      input: text,
      response_format: "mp3"
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error('TTS error:', error);
    return null;
  }
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('book')) {
    return 'make_appointment';
  }
  if (lower.includes('estimate') || lower.includes('price') || lower.includes('cost')) {
    return 'get_estimate';
  }
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('now')) {
    return 'emergency';
  }
  if (lower.includes('hour') || lower.includes('open') || lower.includes('close')) {
    return 'ask_hours';
  }
  if (lower.includes('location') || lower.includes('address') || lower.includes('where')) {
    return 'ask_location';
  }
  if (lower.includes('service') || lower.includes('repair') || lower.includes('fix')) {
    return 'ask_services';
  }
  
  return 'general';
}

function extractAppointmentData(messages) {
  const allText = messages.map(m => m.content).join(' ');
  const data = {};
  
  // Extract car make/model
  const carPatterns = [
    /(toyota|honda|ford|chevy|chevrolet|nissan|bmw|mercedes|audi|tesla|hyundai|kia|mazda|subaru|volkswagen|vw)\s+(\w+)/i
  ];
  
  for (const pattern of carPatterns) {
    const match = allText.match(pattern);
    if (match) {
      data.vehicle = match[0];
      break;
    }
  }
  
  // Extract service type
  const services = ['oil change', 'brake', 'tune-up', 'ac', 'transmission', 'tire', 'engine', 'diagnostic'];
  for (const service of services) {
    if (allText.toLowerCase().includes(service)) {
      data.service = service;
      break;
    }
  }
  
  return Object.keys(data).length > 0 ? data : null;
}

export default { transcribeAudio, processConversation, generateSpeech };
