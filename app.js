const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = 3000;

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
app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin1234') {
    req.session.isLoggedIn = true;
    req.session.username = username; 
    res.status(200).json({ success: true, message: 'Login berhasil! Mengarahkan...' });
  } else {
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

// app.listen(PORT, () => {
//   console.log(`✅ Server berjalan dengan lancar di http://localhost:${PORT}`);
//   console.log("   Folder 'public' sedang disajikan sebagai file statis.");
//   console.log("   Tekan CTRL+C untuk menghentikan server.");
// });

module.exports = app;