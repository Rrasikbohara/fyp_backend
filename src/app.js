// Load environment variables at the very top
require('dotenv').config();

const express = require("express");
const path = require('path'); // <---- NEW: Import path here
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require('morgan');
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");
const logger = require("./utils/logger");
const connectDB = require("./database/database");
const userRoutes = require("./routes/userRoutes");
const trainerRoutes = require("./routes/trainerRoutes");
const bookingRoutes = require('./routes/bookingRoutes');
const securityHeaders = require('./middleware/securityHeaders');
const adminRoutes = require('./routes/adminRoutes'); // ensure admin routes are imported
const nutritionRoutes = require('./routes/nutritionRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes'); // Ensure schedule routes are imported
const feedbackRoutes = require('./routes/feedbackRoutes'); // if applicable
const systemRoutes = require('./routes/systemRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes'); // Add password reset routes
const contactRoutes = require('./routes/contactRoutes'); // Add contact routes
const paymentRoutes = require('./routes/Payment'); // Import payment routes
const mongoose = require('mongoose'); // Import mongoose
const app = express();
const port = process.env.PORT || 3000;


// Connect to MongoDB with improved error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gymmanagement')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Use the setupAdmin function properly
      const { setupAdmin } = require('./adminSetup');
      await setupAdmin();
      console.log('Admin setup completed during application startup');
    } catch (error) {
      console.error('Error during admin setup:', error);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('Please check your MongoDB connection and restart the server');
    // Don't exit the process, but log the error
  });

// Middleware
app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));

app.use(cors({
    origin: 'https://fyp-frontend-orpin.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Built-in middleware to parse JSON

// Add cookie-parser middleware correctly configured
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookiesecret'));

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Add security headers
app.use(securityHeaders);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/trainers", trainerRoutes);
// Add this alias for the trainer bookings route to support transactions page
app.use("/api/trainer-bookings", (req, res, next) => {
  // Rewrite /api/trainer-bookings/user to /api/trainers/user-bookings
  if (req.path === '/user') {
    req.url = '/user-bookings';
  }
  trainerRoutes(req, res, next);
});
app.use('/api/bookings', bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/schedule", scheduleRoutes); // Ensure schedule routes are correctly registered
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/feedback", feedbackRoutes); // Make sure to include feedback routes
app.use("/api/system-status", systemRoutes);
app.use("/api/password-reset", passwordResetRoutes); // Add password reset routes
app.use("/api/contact", contactRoutes); // Add contact routes
app.use('/api/payments', paymentRoutes);

// Load trainer-booking routes
try {
  const trainerBookingRoutes = require('./routes/trainerBookingRoutes');
  app.use('/api/trainer-bookings', trainerBookingRoutes);
  console.log('Trainer booking routes loaded successfully');
} catch (error) {
  console.error('Failed to load trainer booking routes:', error.message);
  app.use('/api/trainer-bookings/user', (req, res) => {
    res.status(501).json({ message: 'Trainer booking service is not available' });
  });
}

// Fix transaction routes - use a different prefix to avoid confusion
try {
  const transactionRoutes = require('./routes/transactionRoutes');
  
  // Use the transactionRoutes with the correct prefix
  app.use('/api', transactionRoutes);
  console.log('Transaction routes loaded successfully at /api prefix');
  
  // Add a direct test route
  app.get('/api/transactions-health', (req, res) => {
    res.json({ status: 'OK', message: 'Transaction routes are configured correctly' });
  });
} catch (error) {
  console.error('Failed to load transaction routes:', error.message);
  // Create a placeholder router for error reporting
  app.use('/api/user/transactions', (req, res) => {
    res.status(500).json({ 
      error: 'Transaction routes configuration error',
      details: error.message 
    });
  });
}

// Add a simple health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "running",
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Default Route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Gym Management API" });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    server.close(() => process.exit(1));
});

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api`);
});