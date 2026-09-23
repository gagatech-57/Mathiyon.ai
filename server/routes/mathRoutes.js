const express = require('express');
const router = express.Router();
const { solveMathProblem } = require('../controllers/mathController');
const { protect } = require('../middleware/authMiddleware');

router.post('/solve', protect, solveMathProblem);

module.exports = router;
