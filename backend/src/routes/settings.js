import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const router = express.Router();
const KEY_LIST = [
  'OPENAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

const envPath = path.resolve(process.cwd(), '.env');

const ensureEnvFile = () => {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '', 'utf8');
  }
};

const readEnvFile = () => {
  ensureEnvFile();
  const raw = fs.readFileSync(envPath, 'utf8');
  return dotenv.parse(raw);
};

const sanitizeValue = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\r?\n/g, '');
};

const buildConfiguredMap = (envSource) => {
  return KEY_LIST.reduce((acc, key) => {
    acc[key] = Boolean(envSource[key]);
    return acc;
  }, {});
};

const buildEnvText = (envObject) => {
  const lines = [];
  KEY_LIST.forEach((key) => {
    lines.push(`${key}=${sanitizeValue(envObject[key])}`);
  });

  Object.keys(envObject).forEach((key) => {
    if (KEY_LIST.includes(key)) return;
    lines.push(`${key}=${sanitizeValue(envObject[key])}`);
  });

  return lines.join('\n');
};

router.get('/', (req, res) => {
  try {
    const envData = readEnvFile();
    const configured = buildConfiguredMap(envData);
    res.json({ configured });
  } catch (err) {
    console.error('Failed to read settings', err);
    res.status(500).json({ error: 'Unable to load settings' });
  }
});

router.post('/', (req, res) => {
  try {
    const payload = req.body || {};
    const currentEnv = readEnvFile();
    const merged = { ...currentEnv };

    KEY_LIST.forEach((key) => {
      merged[key] = sanitizeValue(payload[key] ?? '');
    });

    const envText = buildEnvText({ ...merged });
    fs.writeFileSync(envPath, envText, 'utf8');
    dotenv.config({ path: envPath, override: true });

    const configured = buildConfiguredMap(merged);
    res.json({ configured });
  } catch (err) {
    console.error('Failed to save settings', err);
    res.status(500).json({ error: 'Unable to save settings' });
  }
});

export default router;
