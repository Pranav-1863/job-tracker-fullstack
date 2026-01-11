const express = require('express');
const pool = require('./db');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'https://job-tracker-frontend-9hkl.onrender.com',
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const user = result.rows[0];

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'User created successfully',
      token: token,
      user: user
    });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {expiresIn: '7d'});

    res.json({
      message: 'Logged in successfully',
      token: token,
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM applications WHERE user_id = $1 ORDER BY date DESC',
      [req.userId]
    );
    res.json(result.rows); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/applications', requireAuth, async (req, res) => {
  try {
    const { company, position, date, status } = req.body;

    const result = await pool.query(
      'INSERT INTO applications (user_id, company, position, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, company, position, date, status]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM applications WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    res.json({ message: 'Application deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error'});
  }
});

app.put('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { company, position, date, status } = req.body;

    const result = await pool.query(
      'UPDATE applications SET company = $1, position = $2, date = $3, status = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [company, position, date, status, id, req.userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});