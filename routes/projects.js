const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const projectController = require('../controllers/projectController');

router.use(authenticate); // protect all routes

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;