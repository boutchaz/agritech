const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Simple auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Tool"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
});

// API Routes

// Get config
app.get('/api/config', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// Update config
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    newConfig.lastUpdated = new Date().toISOString();

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    res.json({ success: true, config: newConfig });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// Sync to Polar.sh
app.post('/api/sync-polar', async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const { environment } = req.body;

    // TODO: Implement Polar.sh API sync
    // For now, just update the sync timestamp
    config.lastSynced = new Date().toISOString();
    config.environment = environment || config.environment;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: 'Configuration saved. Polar.sh sync coming soon.',
      config
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync' });
  }
});

// Serve index.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🔧 AgriTech Pricing Admin Tool                           ║
║                                                            ║
║  URL:  http://localhost:${PORT}                            ║
║  Auth: Password (check .env)                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
