const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const erpApiRouter = require('./routes/appRoutes/appApi');
const errorHandlers = require('./handlers/errorHandlers');

// create express app
const app = express();


// =======================
// CORS CONFIGURATION
// =======================

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://idurar-erp.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// enable cors
app.use(cors(corsOptions));

// handle preflight requests
app.options("*", cors(corsOptions));


// =======================
// MIDDLEWARE
// =======================

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// optional file upload
// app.use(fileUpload());


// =======================
// ROUTES
// =======================

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);

app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);


// =======================
// ERROR HANDLERS
// =======================

app.use(errorHandlers.notFound);
app.use(errorHandlers.productionErrors);


// export app
module.exports = app;