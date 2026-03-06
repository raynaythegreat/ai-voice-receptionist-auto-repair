import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import reservationsRoutes from './routes/reservations.js';
import voiceRoutes from './routes/voice.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize database
await initDatabase();
console.log('✓ Database initialized');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/reservations', reservationsRoutes);
app.use('/voice', voiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    restaurant: "Shaw's Steakhouse",
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: "Shaw's Steakhouse Voice Receptionist",
    endpoints: {
      reservations: '/api/reservations',
      voice: '/voice/incoming',
      health: '/api/health'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🔧 Shaw's Steakhouse Voice Receptionist running at http://localhost:${PORT}`);
  console.log(`📞 Twilio webhook: POST http://localhost:${PORT}/voice/incoming`);
  console.log(`📊 Reservations API: http://localhost:${PORT}/api/reservations`);
});
