const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./database.js'); // Impor koneksi database
const client = require('prom-client');
const app = express();

// --- Konfigurasi Metrik Prometheus ---
const register = new client.Registry();
register.setDefaultLabels({ app: 'uas-devops-app' });
client.collectDefaultMetrics({ register });
const loginCounter = new client.Counter({
    name: 'login_requests_total',
    help: 'Total login requests processed',
    labelNames: ['status']
});
register.registerMetric(loginCounter);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'key-devops-project',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
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

// [MODIFIED] Endpoint Login dengan Database
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (!user) {
            loginCounter.inc({ status: 'error' });
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.isLoggedIn = true;
                req.session.username = username;
                loginCounter.inc({ status: 'success' });
                res.status(200).json({ success: true, message: 'Login berhasil! Mengarahkan...' });
            } else {
                loginCounter.inc({ status: 'error' });
                res.status(401).json({ success: false, message: 'Username atau password salah.' });
            }
        });
    });
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