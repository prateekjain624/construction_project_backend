const express = require('express');
const { body, validationResult } = require('express-validator');
const Investor = require('../models/Investor');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all investors for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const investors = await Investor.find({ projectId: req.params.projectId }).sort({ date: -1 });
    res.json(investors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create investor
router.post('/', [auth,
  body('projectId').notEmpty(),
  body('name').notEmpty(),
  body('amount').isNumeric(),
  body('date').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const investor = new Investor(req.body);
    await investor.save();
    res.status(201).json(investor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update investor
router.put('/:id', auth, async (req, res) => {
  try {
    const investor = await Investor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!investor) {
      return res.status(404).json({ message: 'Investor not found' });
    }
    res.json(investor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete investor
router.delete('/:id', auth, async (req, res) => {
  try {
    const investor = await Investor.findByIdAndDelete(req.params.id);
    if (!investor) {
      return res.status(404).json({ message: 'Investor not found' });
    }
    res.json({ message: 'Investor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
