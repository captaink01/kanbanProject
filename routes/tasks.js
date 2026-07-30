// routes/tasks.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // important: access listId from /api/lists/:listId/tasks
const authenticate = require('../middleware/authenticate');
const taskController = require('../controllers/taskController');

router.use(authenticate);   // protect all task routes

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/:taskId', taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);
router.patch('/:taskId/move', taskController.moveTask);   // for drag-and-drop

module.exports = router;