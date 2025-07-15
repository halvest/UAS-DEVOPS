const express = require('express');
const session = require('express-session');
const path = require('path');
const client = require('prom-client'); 
const app = express();
const VALID_USERNAME = process.env.ADMIN_USER || 'admin';
const VALID_PASSWORD = process.env.ADMIN_PASS || 'admin1234';

// Buat registry untuk metrik
const register = new client.Registry();
register.setDefaultLabels({
  app: 'uas-devops-app'
});
client.collectDefaultMetrics({ register });

// Buat metrik kustom: counter untuk total request login
const loginCounter = new client.Counter({
  name: 'login_requests_total',
  help: 'Total login requests processed',
  labelNames: ['status']
});
register.registerMetric(loginCounter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'key-devops-project', 
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, 
    maxAge: 3600000 
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint /metrics untuk di-scrape oleh Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // [FIX] Bandingkan dengan variabel, bukan string langsung
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    req.session.isLoggedIn = true;
    req.session.username = username; 
    loginCounter.inc({ status: 'success' }); // Increment counter
    res.status(200).json({ success: true, message: 'Login berhasil! Mengarahkan...' });
  } else {
    loginCounter.inc({ status: 'error' }); // Increment counter
    res.status(401).json({ success: false, message: 'Username atau password salah.' });
  }
});

app.get('/dashboard', (req, res) => {
  if (req.session && req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    res.redirect('/');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Gagal untuk logout.' });
    }
    res.clearCookie('connect.sid'); 
    res.status(200).json({ success: true, message: 'Logout berhasil.' });
  });
});

module.exports = app;