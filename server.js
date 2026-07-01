const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret';
const ENCRYPTION_SECRET = process.env.DATA_ENCRYPTION_KEY || 'please_change_to_a_random_32_byte_key_1234';
const EMAIL_HMAC_SECRET = process.env.EMAIL_HMAC_KEY || ENCRYPTION_SECRET;
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(ENCRYPTION_SECRET)).digest();
const EMAIL_HMAC_KEY = crypto.createHash('sha256').update(String(EMAIL_HMAC_SECRET)).digest();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(__dirname));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Te veel verzoeken, probeer het later opnieuw.'
}));

// Simple file-backed storage helpers
const dataDir = path.join(__dirname, 'data');
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir);
  } catch (e) {
    // ignore
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashEmail(email) {
  return crypto.createHmac('sha256', EMAIL_HMAC_KEY).update(normalizeEmail(email)).digest('hex');
}

function encryptText(value = '') {
  const text = String(value || '');
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(value = '') {
  if (!value || typeof value !== 'string') return '';
  const parts = value.split(':');
  if (parts.length !== 3) return String(value);
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch (e) {
    return String(value);
  }
}

function sanitizeInput(value) {
  return String(value || '').trim().replace(/[<>]/g, '');
}

function getEmailHashFromOrder(order) {
  if (order.orderEmailHash) return order.orderEmailHash;
  const encryptedEmail = order.emailEncrypted ? decryptText(order.emailEncrypted) : '';
  const rawEmail = normalizeEmail(encryptedEmail || order.email || '');
  return rawEmail ? hashEmail(rawEmail) : '';
}

async function readJson(file, fallback = []) {
  try {
    const full = path.join(dataDir, file);
    const raw = await fs.readFile(full, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return fallback;
  }
}

async function writeJson(file, data) {
  const full = path.join(dataDir, file);
  await fs.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
}

async function getUserById(id) {
  if (!id) return null;
  const users = await readJson('users.json', []);
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  return {
    id: user.id,
    email: decryptText(user.emailEncrypted),
    firstName: decryptText(user.firstNameEncrypted),
    lastName: decryptText(user.lastNameEncrypted)
  };
}

function getSmtpConfig() {
  return {
    host: String(process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(process.env.SMTP_PORT || 587),
    user: String(process.env.SMTP_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    from: String(process.env.SMTP_FROM || 'store.leather.orders@gmail.com').trim(),
    welcomeFrom: String(process.env.SMTP_WELCOME_FROM || 'noreply.login0@gmail.com').trim()
  };
}

function createTransporter() {
  const smtp = getSmtpConfig();
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: false,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function sendWelcomeEmail(email, firstName, lastName, isLogin = false) {
  const smtp = getSmtpConfig();
  const subject = isLogin ? 'Welkom terug bij Leather Store' : 'Welkom bij Leather Store';
  const intro = isLogin
    ? `Wat fijn dat je weer terug bent, ${firstName}!`
    : `Welkom bij Leather Store, ${firstName}!`;
  const text = `Beste ${firstName} ${lastName},\n\n${intro}\n\nJe account geeft je directe toegang tot:
- Sneller afrekenen met je opgeslagen gegevens
- Bestelgeschiedenis en een overzicht van je favoriete producten
- Persoonlijke aanbevelingen en exclusieve aanbiedingen
- Reviews schrijven en je mening delen met andere klanten\n\nMet Leather Store kun je ook eenvoudig:\n- producten met extra opties bestellen\n- je bestellingen beheren in je account\n- een snellere service verwachten bij herhaalaankopen\n\nVeel shopplezier!\n\nMet vriendelijke groet,\nLeather Store`;
  const html = `<p>Beste ${firstName} ${lastName},</p>
<p>${intro}</p>
<p>Je account geeft je directe toegang tot:</p>
<ul>
  <li>Sneller afrekenen met je opgeslagen gegevens</li>
  <li>Bestelgeschiedenis en een overzicht van je favoriete producten</li>
  <li>Persoonlijke aanbevelingen en exclusieve aanbiedingen</li>
  <li>Reviews schrijven en je mening delen met andere klanten</li>
</ul>
<p>Met Leather Store kun je ook eenvoudig:</p>
<ul>
  <li>producten met extra opties bestellen</li>
  <li>je bestellingen beheren in je account</li>
  <li>snellere service verwachten bij herhaalaankopen</li>
</ul>
<p>Veel shopplezier!</p>
<p>Met vriendelijke groet,<br />Leather Store</p>`;
  const transporter = createTransporter();
  return transporter.sendMail({
    from: smtp.welcomeFrom,
    to: email,
    subject,
    text,
    html
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

// Auth endpoints
app.post('/api/register', async (req, res) => {
  let { email, password, firstName, lastName } = req.body || {};
  email = normalizeEmail(email);
  password = String(password || '');
  firstName = sanitizeInput(firstName);
  lastName = sanitizeInput(lastName);
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ success: false, message: 'Email, password, firstName and lastName required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Voer een geldig e-mailadres in.' });
  }

  await ensureDataDir();
  const users = await readJson('users.json', []);
  const emailHash = hashEmail(email);
  if (users.find((u) => u.emailHash === emailHash)) {
    return res.status(409).json({ success: false, message: 'Email already in use.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now(),
    emailHash,
    emailEncrypted: encryptText(email),
    firstNameEncrypted: encryptText(firstName),
    lastNameEncrypted: encryptText(lastName),
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await writeJson('users.json', users);
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  console.log('Registered user:', emailHash);
  sendWelcomeEmail(email, firstName, lastName, false).catch((e) => {
    console.error('Failed to send welcome email on register:', e && e.message ? e.message : e);
  });

  return res.json({ success: true, token, user: { id: user.id, email, firstName, lastName } });
});

app.post('/api/login', async (req, res) => {
  let email = normalizeEmail((req.body || {}).email || '');
  const password = String((req.body || {}).password || '');
  console.log('Login attempt:', hashEmail(email));
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }
  await ensureDataDir();
  const users = await readJson('users.json', []);
  const user = users.find((u) => u.emailHash === hashEmail(email));
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const decryptedFirstName = decryptText(user.firstNameEncrypted);
  const decryptedLastName = decryptText(user.lastNameEncrypted);
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  sendWelcomeEmail(email, decryptedFirstName, decryptedLastName, true).catch((e) => {
    console.error('Failed to send welcome email on login:', e && e.message ? e.message : e);
  });
  return res.json({ success: true, token, user: { id: user.id, email, firstName: decryptedFirstName, lastName: decryptedLastName } });
});

function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer (.+)$/i);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Missing token.' });
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

app.get('/api/me', authenticate, async (req, res) => {
  await ensureDataDir();
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false });
  return res.json({ success: true, user });
});

// Reviews
app.post('/api/reviews', authenticate, async (req, res) => {
  const { productId, rating, text } = req.body || {};
  const eligibleProductId = productId ? String(productId) : null;
  await ensureDataDir();
  const user = await getUserById(req.user.id);
  const userEmailHash = user ? hashEmail(user.email) : '';
  const orders = await readJson('orders.json', []);
  const eligibleOrders = orders.filter((order) => {
    const orderHash = getEmailHashFromOrder(order);
    return (order.userId === req.user.id || orderHash === userEmailHash) && Boolean(order.completed || order.paid);
  });
  if (!eligibleOrders.length) {
    return res.status(403).json({ success: false, message: 'Je kunt alleen recensies schrijven nadat je een afgeronde bestelling hebt geplaatst.' });
  }
  if (eligibleProductId) {
    const hasProduct = eligibleOrders.some((order) => Array.isArray(order.items) && order.items.some((item) => String(item.id) === eligibleProductId));
    if (!hasProduct) {
      return res.status(403).json({ success: false, message: 'Je kunt alleen een recensie schrijven voor een product dat je hebt besteld en waarvan de bestelling is afgerond.' });
    }
  }
  await ensureDataDir();
  const reviews = await readJson('reviews.json', []);
  const review = { id: Date.now(), productId: productId || null, rating: Number(rating) || 5, text: text || '', userId: req.user.id, createdAt: new Date().toISOString() };
  reviews.unshift(review);
  await writeJson('reviews.json', reviews);
  res.json({ success: true, review });
});

app.get('/api/reviews', async (req, res) => {
  const productId = req.query.productId;
  await ensureDataDir();
  const reviews = await readJson('reviews.json', []);
  const users = await readJson('users.json', []);
  // attach basic user info to each review
  const enriched = reviews.map((r) => {
    const u = users.find((x) => x.id === r.userId) || {};
    return Object.assign({}, r, { authorFirstName: u.firstName || '', authorLastName: u.lastName || '' });
  });
  const filtered = productId ? enriched.filter((r) => String(r.productId) === String(productId)) : enriched;
  res.json({ success: true, reviews: filtered });
});

// Orders endpoint to persist orders for logged-in users
app.post('/api/orders', async (req, res) => {
  let { email, address, phone, items, total, orderNumber } = req.body || {};
  email = normalizeEmail(email);
  address = sanitizeInput(address);
  phone = sanitizeInput(phone);
  items = Array.isArray(items) ? items : [];
  total = String(total || '');
  orderNumber = String(orderNumber || '').trim();

  if (!email || !address || !phone) {
    return res.status(400).json({ success: false, message: 'Email, address and phone are required.' });
  }

  await ensureDataDir();
  const orders = await readJson('orders.json', []);
  const order = {
    id: Date.now(),
    orderNumber: orderNumber || `ORD-${Date.now()}`,
    emailEncrypted: encryptText(email),
    addressEncrypted: encryptText(address),
    phoneEncrypted: encryptText(phone),
    orderEmailHash: hashEmail(email),
    items,
    total,
    completed: false,
    createdAt: new Date().toISOString()
  };
  // attach user if token provided
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer (.+)$/i);
  if (match) {
    try {
      const payload = jwt.verify(match[1], JWT_SECRET);
      order.userId = payload.id;
    } catch (e) {
      // ignore
    }
  }
  orders.unshift(order);
  await writeJson('orders.json', orders);
  res.json({ success: true, order });
});

app.post('/api/orders/complete', async (req, res) => {
  const { orderNumber, completed } = req.body || {};
  if (!orderNumber) {
    return res.status(400).json({ success: false, message: 'Ordernummer is vereist.' });
  }
  await ensureDataDir();
  const orders = await readJson('orders.json', []);
  const idx = orders.findIndex((o) => String(o.orderNumber) === String(orderNumber));
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Order niet gevonden.' });
  }
  orders[idx].completed = Boolean(completed);
  await writeJson('orders.json', orders);
  return res.json({ success: true, order: orders[idx] });
});

app.get('/api/orders/eligible', authenticate, async (req, res) => {
  const productId = req.query.productId;
  await ensureDataDir();
  const orders = await readJson('orders.json', []);
  const user = await getUserById(req.user.id);
  const userEmailHash = user ? hashEmail(user.email) : '';
  const eligibleOrders = orders.filter((order) => {
    const orderHash = getEmailHashFromOrder(order);
    return (order.userId === req.user.id || orderHash === userEmailHash) && Boolean(order.completed || order.paid);
  });
  if (!eligibleOrders.length) {
    return res.json({ success: true, eligible: false, reason: 'Je hebt nog geen afgeronde bestelling.' });
  }
  if (productId) {
    const hasProduct = eligibleOrders.some((order) => Array.isArray(order.items) && order.items.some((item) => String(item.id) === String(productId)));
    if (!hasProduct) {
      return res.json({ success: true, eligible: false, reason: 'Je hebt nog geen afgeronde bestelling voor dit product.' });
    }
  }
  return res.json({ success: true, eligible: true });
});

app.post('/api/send-order-email', async (req, res) => {
  const { email, address, phone, items, total, orderNumber } = req.body;

  if (!email || !address || !phone) {
    return res.status(400).json({ success: false, message: 'Missing customer details.' });
  }

  const smtp = getSmtpConfig();
  const transporter = createTransporter();

  const mailOptions = {
    from: smtp.from,
    to: email,
    subject: 'Betalingsinstructies Leather Store',
    text: `
Beste klant,

Bedankt voor je bestelling bij Leather Store.

Ordernummer: ${orderNumber || 'n.v.t.'}
E-mailadres: ${email}
Adres: ${address}
Telefoonnummer: ${phone}
Bestelling: ${items || 'Geen items'}
Totaalbedrag: ${total || '€ 0,00'}

Let op: kleur- en productopties worden direct in de bestelregels weergegeven, bijvoorbeeld '1x Productnaam (Kleur: Zwart)'.

Je kunt betalen via bankoverschrijving. Zodra we je betaling ontvangen, verwerken we je bestelling.

Met vriendelijke groet,
Leather Store
    `.trim()
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Order email sent successfully.' });
  } catch (error) {
    console.error('Mail error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send email.' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'store.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser.`);
});
