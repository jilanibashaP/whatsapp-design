const express = require('express');
const controller = require('../controllers/chat.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(auth);
router.post('/', controller.createChat);
router.get('/', controller.getChats);

module.exports = router;
