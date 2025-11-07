const express = require('express');
const controller = require('../controllers/message.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(auth);
router.post('/', controller.sendMessage);
router.get('/:chatId', controller.getMessages);

module.exports = router;
