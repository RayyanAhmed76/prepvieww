const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load backend/.env (npm run server uses client/ as cwd, so default dotenv would miss this file)
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
// Keep this in sync with multer destination in routes.
const uploadsVideosDir = path.join(__dirname, 'uploads', 'videos');
if (!fs.existsSync(uploadsVideosDir)) {
  fs.mkdirSync(uploadsVideosDir, { recursive: true });
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cv', require('./routes/cv'));
app.use('/api/interview', require('./routes/interview'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

