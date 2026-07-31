require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;
const projectRoutes = require('./routes/projects');
const listRoutes = require('./routes/lists');
const taskRoutes = require('./routes/tasks');




// Make pool available to routes via req.db (middleware)
const pool = require('./db/pool');
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Match your React/Vite URL
  credentials: true, // Required for HTTP-only cookies / refresh tokens
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser()); 
app.use('/api', authRoutes); 
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/lists', listRoutes);
app.use('/api/lists/:listId/tasks', taskRoutes);

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