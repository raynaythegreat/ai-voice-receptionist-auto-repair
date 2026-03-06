import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS(to, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });
    
    console.log(`SMS sent: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('SMS error:', error);
    throw error;
  }
}

export function validateTwilioSignature(url, params, signature) {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params
  );
}

export function createVoiceResponse(message, action = null) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  twiml.say({
    voice: 'Polly.Joanna-Neural',
    language: 'en-US'
  }, message);
  
  if (action) {
    twiml.redirect({ method: 'POST' }, action);
  }
  
  return twiml.toString();
}

export function gatherSpeech(prompt, actionUrl, timeout = 5) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  twiml.gather({
    input: 'speech',
    action: actionUrl,
    method: 'POST',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    enhanced: true,
    timeout: timeout
  }).say({
    voice: 'Polly.Joanna-Neural'
  }, prompt);
  
  return twiml.toString();
}

export default { sendSMS, validateTwilioSignature, createVoiceResponse, gatherSpeech };
