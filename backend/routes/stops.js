const express = require('express');
const router = express.Router();
const Stop = require('../models/Stop');

// GET all stops
router.get('/', async (req, res) => {
    try {
        const { isActive, city } = req.query;
        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (city) filter.city = city;

        const stops = await Stop.find(filter).sort({ name: 1 });
        res.json({ success: true, count: stops.length, data: stops });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single stop
router.get('/:id', async (req, res) => {
    try {
        const stop = await Stop.findById(req.params.id);
        if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
        res.json({ success: true, data: stop });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create stop
router.post('/', async (req, res) => {
    try {
        const stop = await Stop.create(req.body);
        res.status(201).json({ success: true, data: stop });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Stop code already exists' });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update stop
router.put('/:id', async (req, res) => {
    try {
        const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
        res.json({ success: true, data: stop });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE stop
router.delete('/:id', async (req, res) => {
    try {
        const stop = await Stop.findByIdAndDelete(req.params.id);
        if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
        res.json({ success: true, message: 'Stop deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;