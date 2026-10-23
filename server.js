const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');
const QRCode = require('qrcode');
const selfsigned = require('selfsigned');

const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const ASISTENCIAS_FILE = path.join(DATA_DIR, 'asistencias.json');
const COLABORADORES_FILE = path.join(DATA_DIR, 'colaboradores.json');

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ASISTENCIAS_FILE)) {
  fs.writeFileSync(ASISTENCIAS_FILE, '[]', 'utf8');
}
if (!fs.existsSync(COLABORADORES_FILE)) {
  fs.writeFileSync(COLABORADORES_FILE, '[]', 'utf8');
}

// Helpers
function readJson(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// Format local date string YYYY-MM-DD
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format local time string HH:MM:SS AM/PM
function getLocalTimeString(dateObj = new Date()) {
  return dateObj.toLocaleTimeString('es-PE', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Get network IPv4 addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Generate unique ID
function generateId() {
  return 'ASI-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// ==========================================
// API ROUTES
// ==========================================

// Generate QR code dynamically for any URL
app.get('/api/qr-dynamic', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'URL requerida' });
  try {
    const qr = await QRCode.toDataURL(targetUrl, { margin: 1, width: 260 });
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: 'Error generating QR' });
  }
});

// Get network info & QR code
app.get('/api/network-info', async (req, res) => {
  const ips = getNetworkIps();
  const primaryIp = ips[0] || 'localhost';
  const httpUrl = `http://${primaryIp}:${HTTP_PORT}`;
  const httpsUrl = `https://${primaryIp}:${HTTPS_PORT}`;
  const localUrl = `http://localhost:${HTTP_PORT}`;

  try {
    // Generate QR codes for mobile scanning
    const qrHttp = await QRCode.toDataURL(httpUrl, { margin: 1, width: 260 });
    const qrHttps = await QRCode.toDataURL(httpsUrl, { margin: 1, width: 260 });

    res.json({
      ips,
      primaryIp,
      httpUrl,
      httpsUrl,
      localUrl,
      qrHttp,
      qrHttps,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Error generating QR code' });
  }
});

// Colaboradores
app.get('/api/colaboradores', (req, res) => {
  const colaboradores = readJson(COLABORADORES_FILE);
  res.json(colaboradores);
});

app.get('/api/colaboradores/:dni', (req, res) => {
  const { dni } = req.params;
  const colaboradores = readJson(COLABORADORES_FILE);
  const colaborador = colaboradores.find(c => String(c.dni).trim() === String(dni).trim());
  if (colaborador) {
    res.json({ found: true, colaborador });
  } else {
    res.json({ found: false, message: 'Colaborador no encontrado' });
  }
});

app.post('/api/colaboradores', (req, res) => {
  const { dni, nombre, cargo, area, telefono } = req.body;
  if (!dni || !nombre) {
    return res.status(400).json({ error: 'DNI y Nombre son obligatorios' });
  }
  const colaboradores = readJson(COLABORADORES_FILE);
  const index = colaboradores.findIndex(c => String(c.dni).trim() === String(dni).trim());
  const newColab = {
    dni: String(dni).trim(),
    nombre: String(nombre).trim(),
    cargo: cargo ? String(cargo).trim() : 'Colaborador Movistar',
    area: area ? String(area).trim() : 'Campo / Operaciones',
    telefono: telefono ? String(telefono).trim() : '',
    fechaRegistro: getLocalDateString()
  };

  if (index >= 0) {
    colaboradores[index] = { ...colaboradores[index], ...newColab };
  } else {
    colaboradores.push(newColab);
  }
  writeJson(COLABORADORES_FILE, colaboradores);
  res.json({ success: true, colaborador: newColab });
});

// Check if worker already marked today
app.get('/api/asistencias/hoy/:dni', (req, res) => {
  const { dni } = req.params;
  const today = getLocalDateString();
  const asistencias = readJson(ASISTENCIAS_FILE);

  const hoyRecord = asistencias.find(a => 
    String(a.dni).trim() === String(dni).trim() && a.fecha === today
  );

  if (hoyRecord) {
    return res.json({
      marked: true,
      message: 'Ya registraste tu asistencia hoy',
      record: hoyRecord
    });
  }

  return res.json({
    marked: false,
    message: 'Aún no has registrado asistencia hoy'
  });
});

// Get asistencias (filters: fecha, dni)
app.get('/api/asistencias', (req, res) => {
  const { fecha, dni } = req.query;
  let asistencias = readJson(ASISTENCIAS_FILE);

  if (fecha) {
    asistencias = asistencias.filter(a => a.fecha === fecha);
  }
  if (dni) {
    asistencias = asistencias.filter(a => String(a.dni).trim() === String(dni).trim());
  }

  // Sort descending by timestamp
  asistencias.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(asistencias);
});

// POST Mark Attendance
app.post('/api/asistencias', (req, res) => {
  const { dni, nombre, lat, lng, precision, direccion, comentario, deviceInfo } = req.body;

  // 1. Mandatory DNI validation
  const cleanDni = String(dni || '').trim();
  if (!cleanDni || cleanDni.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Debe ingresar un DNI válido'
    });
  }

  // 2. MANDATORY GPS Location validation
  if (lat === undefined || lng === undefined || lat === null || lng === null || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return res.status(400).json({
      success: false,
      error: 'Ubicación GPS obligatoria. Debe permitir el acceso a su ubicación satelital antes de marcar.'
    });
  }

  const now = new Date();
  const today = getLocalDateString(now);
  const currentTime = getLocalTimeString(now);

  const asistencias = readJson(ASISTENCIAS_FILE);

  // 3. Daily restriction check: Worker cannot mark more than once per day!
  const alreadyMarked = asistencias.find(a => 
    String(a.dni).trim() === cleanDni && a.fecha === today
  );

  if (alreadyMarked) {
    return res.status(409).json({
      success: false,
      alreadyMarked: true,
      message: `Ya registraste tu asistencia hoy (${alreadyMarked.fecha}) a las ${alreadyMarked.hora}. Solo se permite una marcación por día.`,
      record: alreadyMarked
    });
  }

  // Auto-register/lookup worker name
  let workerName = String(nombre || '').trim();
  const colaboradores = readJson(COLABORADORES_FILE);
  const existingColab = colaboradores.find(c => String(c.dni).trim() === cleanDni);

  if (existingColab) {
    if (!workerName) workerName = existingColab.nombre;
  } else if (workerName) {
    colaboradores.push({
      dni: cleanDni,
      nombre: workerName,
      cargo: 'Colaborador Movistar',
      area: 'Campo / Operaciones',
      fechaRegistro: today
    });
    writeJson(COLABORADORES_FILE, colaboradores);
  } else {
    workerName = `Colaborador ${cleanDni}`;
  }

  const newRecord = {
    id: generateId(),
    dni: cleanDni,
    nombre: workerName,
    cargo: existingColab ? existingColab.cargo : 'Colaborador Movistar',
    area: existingColab ? existingColab.area : 'Operaciones Movistar',
    fecha: today,
    hora: currentTime,
    timestamp: now.toISOString(),
    lat: Number(lat),
    lng: Number(lng),
    precision: precision ? Math.round(Number(precision)) : 0,
    direccion: direccion ? String(direccion).trim() : `Coordenadas: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
    googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
    comentario: comentario ? String(comentario).trim() : '',
    deviceInfo: deviceInfo || 'Navegador Web Móvil',
    estado: 'EXITOSO'
  };

  asistencias.push(newRecord);
  writeJson(ASISTENCIAS_FILE, asistencias);

  return res.status(201).json({
    success: true,
    message: 'Marcación exitosa registrada correctamente',
    record: newRecord
  });
});

// Admin: Delete attendance record
app.delete('/api/asistencias/:id', (req, res) => {
  const { id } = req.params;
  const asistencias = readJson(ASISTENCIAS_FILE);
  const filtered = asistencias.filter(a => a.id !== id);

  if (filtered.length === asistencias.length) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  writeJson(ASISTENCIAS_FILE, filtered);
  res.json({ success: true, message: 'Registro eliminado con éxito' });
});

// Admin: Clear today's marks (useful for testing)
app.post('/api/asistencias/reset-hoy', (req, res) => {
  const today = getLocalDateString();
  const asistencias = readJson(ASISTENCIAS_FILE);
  const remaining = asistencias.filter(a => a.fecha !== today);
  writeJson(ASISTENCIAS_FILE, remaining);
  res.json({ success: true, message: `Se limpiaron las marcaciones de hoy (${today})` });
});

// WhatsApp text formatting endpoint
app.get('/api/resumen/whatsapp', (req, res) => {
  const fecha = req.query.fecha || getLocalDateString();
  const asistencias = readJson(ASISTENCIAS_FILE).filter(a => a.fecha === fecha);

  if (asistencias.length === 0) {
    return res.json({
      total: 0,
      fecha,
      mensaje: `📋 *REPORTE DE ASISTENCIA MOVISTAR*\n📅 *Fecha:* ${fecha}\n\n⚠️ No se registran asistencias para esta fecha.`
    });
  }

  let text = `📱 *RESUMEN DE ASISTENCIA - MOVISTAR*\n`;
  text += `📅 *Fecha:* ${fecha}\n`;
  text += `👥 *Total Registrados:* ${asistencias.length}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  asistencias.forEach((item, index) => {
    text += `*${index + 1}. ${item.nombre}*\n`;
    text += `   🆔 DNI: ${item.dni}\n`;
    text += `   ⏰ Hora: ${item.hora}\n`;
    text += `   📍 Lugar: ${item.direccion || 'Ubicación GPS'}\n`;
    text += `   🗺️ Mapa: ${item.googleMapsUrl}\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✅ *Reporte generado automáticamente desde App Movistar Asistencia*`;

  res.json({
    total: asistencias.length,
    fecha,
    mensaje: text,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
  });
});

// Create HTTPS selfsigned certificate
function createCert() {
  const pems = selfsigned.generate([
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'Movistar Asistencia' }
  ], {
    days: 365,
    keySize: 2048
  });
  return {
    key: pems.private,
    cert: pems.cert
  };
}

// Start HTTP Server (Used both locally and behind Cloud reverse proxies like Render/Railway)
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log(`\n======================================================`);
  console.log(`🚀 SERVIDOR MOVISTAR ASISTENCIA INICIADO CON ÉXITO`);
  console.log(`======================================================`);
  console.log(`🌐 Local:   http://localhost:${HTTP_PORT}`);
  ips.forEach(ip => {
    console.log(`📱 Celular: http://${ip}:${HTTP_PORT}`);
  });
});

// Start local HTTPS Server only if not in cloud environment
const isCloudHosting = Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production' && !process.env.ENABLE_LOCAL_HTTPS);

if (!isCloudHosting) {
  try {
    const sslOptions = createCert();
    const httpsServer = https.createServer(sslOptions, app);
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      const ips = getNetworkIps();
      console.log(`🔒 HTTPS (Recomendado para GPS en celulares locales):`);
      console.log(`   Local:   https://localhost:${HTTPS_PORT}`);
      ips.forEach(ip => {
        console.log(`   Celular: https://${ip}:${HTTPS_PORT} (Aceptar certificado local)`);
      });
      console.log(`======================================================\n`);
    });
  } catch (e) {
    console.warn('⚠️ No se pudo iniciar el servidor HTTPS local:', e.message);
  }
}
