# Voice Receptionist for Santa Maria Auto Repair

AI-powered voice receptionist that handles after-hours calls for Santa Maria Auto Repair in Santa Maria.

## Features

- 📞 Answers calls 24/7 (especially after hours)
- 🗓️ Takes reservations (name, phone, party size, date/time)
- ❓ Answers FAQs (hours, location, menu, Santa Maria BBQ style)
- 📨 Sends SMS confirmations
- 📊 Dashboard to view and manage reservations
- 🎙️ Natural voice conversation powered by AI

## Quick Start

```bash
# Install dependencies
npm run install:all

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start servers
npm run dev
```

Opens at:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Environment Variables

Create `backend/.env`:
```
OPENAI_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
PORT=4000
```

## How It Works

1. Customer calls your Twilio number
2. AI answers with Santa Maria Auto Repair greeting
3. Customer speaks → OpenAI Whisper transcribes
4. GPT-4 interprets intent (reservation, FAQ, etc.)
5. AI responds with natural voice (OpenAI TTS)
6. Reservations saved to SQLite database
7. SMS confirmation sent automatically

## Tech Stack

- **Backend**: Node.js, Express, Twilio, OpenAI (Whisper, GPT-4, TTS)
- **Frontend**: React, Vite, Modern CSS
- **Database**: SQLite (sql.js - no native dependencies)

## API Endpoints

- `POST /voice/incoming` - Twilio webhook for incoming calls
- `POST /voice/process` - Process speech and generate response
- `GET /api/reservations` - List all reservations
- `POST /api/reservations` - Create reservation
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Delete reservation

## Project Structure

```
voice-receptionist-auto-repair/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── voice.js
│   │   │   └── reservations.js
│   │   ├── services/
│   │   │   ├── openai.js
│   │   │   └── twilio.js
│   │   └── db/
│   │       └── database.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── package.json
```

## Testing Without Twilio

The frontend dashboard allows you to:
- View all reservations
- Add reservations manually
- Test the conversation flow
- See call logs

## License

MIT
