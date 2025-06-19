const express = require('express');
const router = express.Router();
const { launchScript } = require('../controllers/dataControllers');

// GET /getdata?excelPath=...&jsonPath=...
router.get('/', launchScript);

module.exports = router;
