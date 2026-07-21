require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Make pool available to routes via req.db (middleware)
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Kanban API is running' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});