const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

// Validate color hex
function isValidHex(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

// Clamp number between min and max
function clamp(val, min, max) {
  return Math.min(Math.max(parseInt(val) || min, min), max);
}

// GET /generate — generate a QR code
app.get('/generate', async (req, res) => {
  const {
    data,
    size = 300,
    format = 'png',
    dark = '#000000',
    light = '#ffffff',
    margin = 2,
    error_correction = 'M',
  } = req.query;

  if (!data) {
    return res.status(400).json({ error: 'Missing required parameter: data' });
  }

  if (data.length > 2000) {
    return res.status(400).json({ error: 'Data too long. Maximum 2000 characters.' });
  }

  const validFormats = ['png', 'svg', 'base64'];
  const fmt = validFormats.includes(format.toLowerCase()) ? format.toLowerCase() : 'png';

  const validEC = ['L', 'M', 'Q', 'H'];
  const ec = validEC.includes(error_correction.toUpperCase()) ? error_correction.toUpperCase() : 'M';

  const darkColor = isValidHex(dark) ? dark : '#000000';
  const lightColor = isValidHex(light) ? light : '#ffffff';
  const qrSize = clamp(size, 100, 1000);
  const qrMargin = clamp(margin, 0, 10);

  const options = {
    width: qrSize,
    margin: qrMargin,
    errorCorrectionLevel: ec,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  };

  try {
    if (fmt === 'svg') {
      const svg = await QRCode.toString(data, { ...options, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    if (fmt === 'base64') {
      const base64 = await QRCode.toDataURL(data, options);
      return res.json({
        format: 'base64',
        data: base64,
        size: qrSize,
        dark: darkColor,
        light: lightColor,
        margin: qrMargin,
        error_correction: ec,
        content: data,
      });
    }

    // Default: PNG binary
    const buffer = await QRCode.toBuffer(data, options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="qrcode.png"');
    return res.send(buffer);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR code', details: err.message });
  }
});

// POST /generate — generate from JSON body (useful for long data)
app.post('/generate', async (req, res) => {
  const {
    data,
    size = 300,
    format = 'base64',
    dark = '#000000',
    light = '#ffffff',
    margin = 2,
    error_correction = 'M',
  } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Missing required field: data' });
  }

  if (data.length > 2000) {
    return res.status(400).json({ error: 'Data too long. Maximum 2000 characters.' });
  }

  const validFormats = ['png', 'svg', 'base64'];
  const fmt = validFormats.includes(format.toLowerCase()) ? format.toLowerCase() : 'base64';
  const validEC = ['L', 'M', 'Q', 'H'];
  const ec = validEC.includes(error_correction.toUpperCase()) ? error_correction.toUpperCase() : 'M';
  const darkColor = isValidHex(dark) ? dark : '#000000';
  const lightColor = isValidHex(light) ? light : '#ffffff';
  const qrSize = clamp(size, 100, 1000);
  const qrMargin = clamp(margin, 0, 10);

  const options = {
    width: qrSize,
    margin: qrMargin,
    errorCorrectionLevel: ec,
    color: { dark: darkColor, light: lightColor },
  };

  try {
    if (fmt === 'svg') {
      const svg = await QRCode.toString(data, { ...options, type: 'svg' });
      return res.json({ format: 'svg', data: svg, content: data });
    }

    if (fmt === 'png') {
      const buffer = await QRCode.toBuffer(data, options);
      const base64 = buffer.toString('base64');
      return res.json({ format: 'png', data: 'data:image/png;base64,' + base64, content: data });
    }

    const base64 = await QRCode.toDataURL(data, options);
    return res.json({
      format: 'base64',
      data: base64,
      size: qrSize,
      dark: darkColor,
      light: lightColor,
      margin: qrMargin,
      error_correction: ec,
      content: data,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR code', details: err.message });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', service: 'QR Code Generator API' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`QR Code API running on port ${PORT}`));
