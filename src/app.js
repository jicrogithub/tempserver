import express from 'express'
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { Mutex } from 'async-mutex';
import upgradingRouter from './upgrading.js';
import hashlistRouter from './hashlist.js';
import hellodb from './hellodb.js';
import { uploadImageAndMetadataToArweave } from './functions.js';
import { logdata } from './functions.js';
import rateLimit from 'express-rate-limit';

const app = express();

// Middleware
app.use(express.json()); // Parse JSON request body
app.use(cors()); // Enable CORS
app.use(morgan('common')); // HTTP request logger
app.use(helmet()); // Set various HTTP headers for security

// Request rate-limiting middleware

const limiter = rateLimit({
  windowMs: 10000,
  max: 30,
  message: 'Too many requests from this IP, please try again later.'
});

// Apply the limiter to all routes
app.use(limiter);

// Routes
const mutex = new Mutex();

app.get('/sovergn', async (req, res) => {
  res.send('Hello, SOVERGN!');
});

app.use('/sovergn/upgrading', upgradingRouter);
app.use('/sovergn/hashlist', hashlistRouter);
app.use('/sovergn/hellodb', hellodb);

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

async function handleRequest() {
  const release = await mutex.acquire(); // acquire the lock
  try {
    console.log('Processing request...');
    await logdata("pkm")
    console.log('Request processed.');
  } finally {
    release(); // release the lock
  }
}
