const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

// GET all routes
router.get('/', async (req, res) => {
    try {
        const { isActive } = req.query;
        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const routes = await Route.find(filter)
            .populate('stops.stop', 'name code location address')
            .sort({ routeNumber: 1 });

        res.json({ success: true, count: routes.length, data: routes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single route with full details
router.get('/:id', async (req, res) => {
    try {
        const route = await Route.findById(req.params.id).populate(
            'stops.stop',
            'name code location address facilities'
        );
        if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
        res.json({ success: true, data: route });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create route
router.post('/', async (req, res) => {
    try {
        const route = await Route.create(req.body);
        await route.populate('stops.stop', 'name code location');
        res.status(201).json({ success: true, data: route });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Route number already exists' });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update route
router.put('/:id', async (req, res) => {
    try {
        const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('stops.stop', 'name code location');

        if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
        res.json({ success: true, data: route });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE route
router.delete('/:id', async (req, res) => {
    try {
        const route = await Route.findByIdAndDelete(req.params.id);
        if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
        res.json({ success: true, message: 'Route deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH add stop to route
router.patch('/:id/stops', async (req, res) => {
    try {
        const { stopId, sequence, arrivalOffset } = req.body;
        const route = await Route.findByIdAndUpdate(
            req.params.id,
            { $push: { stops: { stop: stopId, sequence, arrivalOffset } } },
            { new: true }
        ).populate('stops.stop', 'name code location');

        if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
        res.json({ success: true, data: route });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;