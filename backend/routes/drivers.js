const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

// GET all drivers
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const drivers = await Driver.find(filter).sort({ name: 1 });
        res.json({ success: true, count: drivers.length, data: drivers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single driver
router.get('/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, data: driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create driver
router.post('/', async (req, res) => {
    try {
        const driver = await Driver.create(req.body);
        res.status(201).json({ success: true, data: driver });
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({ success: false, message: `${field} already exists` });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update driver
router.put('/:id', async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, data: driver });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE driver
router.delete('/:id', async (req, res) => {
    try {
        const driver = await Driver.findByIdAndDelete(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH update driver status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const driver = await Driver.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, data: driver });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;