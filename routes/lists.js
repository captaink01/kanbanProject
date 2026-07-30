const express = require('express');
const router = express.Router({ mergeParams: true }); // to access projectId from parent route
const authenticate = require('../middleware/authenticate');
const listController = require('../controllers/listController');

router.use(authenticate);

router.post('/', listController.createList);
router.get('/', listController.getLists);
router.put('/:listId', listController.updateList);
router.delete('/:listId', listController.deleteList);

module.exports = router;