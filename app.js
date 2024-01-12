import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connect from './database/connection.js';
import adminRoute from './routes/adminRoute.js';
import employeeRoute from './routes/employeeRoute.js';
import organizationRoute from './routes/organizationRoute.js';
import { errorHandler } from './middleware/errorHandler.js';

// Path and Port
const app = express();
const port = 8000;

// Use
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    // origin: ["https://payouts.online","https://www.payouts.online"],
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  })
);
app.use('/employee', employeeRoute);
app.use('/admin', adminRoute);
app.use('/organization', organizationRoute);

app.use(errorHandler);

// Connection
connect()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    })
      .on('error', (error) => {
        console.error('Error starting server:', error.message);
        process.exit(1);
      });
  })
  .catch((error) => {
    console.error('Invalid Database connection:', error.message);
  });