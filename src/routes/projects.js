const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Investor = require('../models/Investor');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get project by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get project dashboard stats
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const projectId = req.params.id;

    const [investors, expenses, payments] = await Promise.all([
      Investor.find({ projectId }),
      Expense.find({ projectId }),
      Payment.find({ projectId })
    ]);

    const totalInvestment = investors.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalReceived = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const balance = totalReceived - totalExpenses;

    // Calculate investor percentages
    const investorsWithPercentage = investors.map(inv => ({
      ...inv.toObject(),
      percentage: totalInvestment > 0 ? ((inv.amount / totalInvestment) * 100).toFixed(2) : 0
    }));

    res.json({
      totalInvestment,
      totalExpenses,
      totalReceived,
      balance,
      investors: investorsWithPercentage,
      expenses,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create project
router.post('/', [auth, 
  body('name').notEmpty(),
  body('location').notEmpty(),
  body('startDate').isISO8601(),
  body('status').isIn(['active', 'completed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Delete related data
    await Promise.all([
      Investor.deleteMany({ projectId: req.params.id }),
      Expense.deleteMany({ projectId: req.params.id }),
      Payment.deleteMany({ projectId: req.params.id })
    ]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
