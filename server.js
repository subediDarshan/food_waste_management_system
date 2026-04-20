require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const claimRoutes = require('./routes/claims');
const analyticsRoutes = require('./routes/analytics');

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/analytics', analyticsRoutes);

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
