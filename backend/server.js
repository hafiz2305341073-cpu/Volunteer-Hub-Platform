const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const mongoose = require('mongoose');
const userRoutes = require('./src/routes/userRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/volunteer_hub';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Volunteer Hub API is running.',
    motto: 'Connect. Engage. Impact.'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// Backward compatible public events route
app.use('/events', eventRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: 'An unexpected server error occurred.'
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`Volunteer Hub server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  });

