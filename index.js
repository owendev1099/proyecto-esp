require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Telemetry = require('./models/Telemetry');
const morgan = require('morgan');

const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3000;

// ============================
// 🔌 MongoDB Atlas
// ============================
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => {
    console.error('Error MongoDB:', err);
    process.exit(1);
  });

const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

// ============================
// 📝 POST /api/log
// ============================
app.post('/api/log', (req, res) => {
  console.log("📩 LOG desde ESP32:", req.body);
  res.json({ ok: true });
});

// ============================
// 📡 POST /api/telemetry
// ============================
app.post('/api/telemetry', async (req, res) => {
  try {
    const body = req.body;
    console.log('Payload recibido desde ESP32:', body);

    const deviceId = body.device_id || "esp32";

    if (!body.ts_esp)
      return res.status(400).json({ error: 'ts_esp requerido' });

    const temperature = body.temperature;
    const humidity = body.humidity;

    const doc = new Telemetry({
      device_id: deviceId,
      ts_esp: new Date(body.ts_esp),
      ts_server: new Date(),
      temperature,
      humidity
    });

    await doc.save();
    res.status(201).json({ ok: true, id: doc._id });

  } catch (err) {
    console.error('POST /api/telemetry error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ============================
// ⏱️ GET /api/update
// ============================
app.get('/api/update', (req, res) => {
  const randomSeconds = Math.floor(Math.random() * (60 - 4 + 1)) + 4;
  console.log("Nuevo intervalo enviado al ESP32:", randomSeconds);
  res.json({ interval: randomSeconds });
});

// ============================
// 📄 GET /api/telemetry/latest
// ============================
app.get('/api/telemetry/latest', async (req, res) => {
  try {
    const docs = await Telemetry.find().sort({ ts_server: -1 }).limit(50).exec();
    res.json(docs);
  } catch (err) {
    console.error('GET /api/telemetry/latest error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ============================
// 🔢 GET /api/telemetry/count
// ============================
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('GET /api/telemetry/count error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
