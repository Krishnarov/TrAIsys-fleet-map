const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const StopLog = require('../models/StopLog');
const MovementLog = require('../models/MovementLog');
const SignalLog = require('../models/SignalLog');

// Helper: Calculate distance between two coordinates in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dPhi = (lat2 - lat1) * Math.PI / 180;
    const dLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// GET all buses (with populated route and driver)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const buses = await Bus.find(filter)
            .populate('assignedRoute', 'name routeNumber color')
            .populate('assignedDriver', 'name employeeId phone status')
            .sort({ busNumber: 1 });

        res.json({ success: true, count: buses.length, data: buses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET all buses with location (for map)
router.get('/locations', async (req, res) => {
    try {
        const buses = await Bus.find({
            status: 'active',
            'currentLocation.lat': { $ne: null },
        })
            .populate('assignedRoute', 'name routeNumber color')
            .populate('assignedDriver', 'name employeeId')
            .select('busNumber registrationNumber status currentLocation assignedRoute assignedDriver type isAC');

        res.json({ success: true, count: buses.length, data: buses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET single bus
router.get('/:id', async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id)
            .populate('assignedRoute', 'name routeNumber color stops path')
            .populate('assignedDriver', 'name employeeId phone licenseNumber status');

        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
        res.json({ success: true, data: bus });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create bus
router.post('/', async (req, res) => {
    try {
        const bus = await Bus.create(req.body);
        res.status(201).json({ success: true, data: bus });
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({ success: false, message: `${field} already exists` });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT update bus
router.put('/:id', async (req, res) => {
    try {
        const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
            .populate('assignedRoute', 'name routeNumber color')
            .populate('assignedDriver', 'name employeeId phone');

        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
        res.json({ success: true, data: bus });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE bus
router.delete('/:id', async (req, res) => {
    try {
        const bus = await Bus.findByIdAndDelete(req.params.id);
        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
        res.json({ success: true, message: 'Bus deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH assign route to bus
router.patch('/:id/assign-route', async (req, res) => {
    try {
        const { routeId } = req.body;
        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            { assignedRoute: routeId || null },
            { new: true }
        ).populate('assignedRoute', 'name routeNumber color');

        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
        res.json({ success: true, data: bus });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PATCH assign driver to bus
router.patch('/:id/assign-driver', async (req, res) => {
    try {
        const { driverId } = req.body;

        // If assigning a driver, update their status to on_duty
        if (driverId) {
            await Driver.findByIdAndUpdate(driverId, { status: 'on_duty' });
        }

        // If removing a driver, set old driver to available
        const existingBus = await Bus.findById(req.params.id);
        if (existingBus?.assignedDriver && !driverId) {
            await Driver.findByIdAndUpdate(existingBus.assignedDriver, { status: 'available' });
        }

        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            { assignedDriver: driverId || null },
            { new: true }
        ).populate('assignedDriver', 'name employeeId phone status');

        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
        res.json({ success: true, data: bus });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PATCH update bus GPS location + Geofencing logic
router.patch('/:id/location', async (req, res) => {
    try {
        const { lat, lng, speed, heading } = req.body;
        const busId = req.params.id;

        // 1. Get bus with route and its current tracking state
        const bus = await Bus.findById(busId).populate({
            path: 'assignedRoute',
            populate: { path: 'stops.stop' }
        });

        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

        // 2. Log movement history
        await MovementLog.create({
            bus: busId,
            lat,
            lng,
            speed: speed || 0,
            heading: heading || 0
        });

        // 3. Geofencing logic
        let currentRadiusStop = null;
        const RADIUS = 20; // 20 meters

        if (bus.assignedRoute && bus.assignedRoute.stops) {
            for (const s of bus.assignedRoute.stops) {
                if (!s.stop) continue;
                const dist = getDistance(lat, lng, s.stop.location.lat, s.stop.location.lng);
                if (dist <= RADIUS) {
                    currentRadiusStop = s.stop;
                    break;
                }
            }
        }

        const prevStopId = bus.insideStopRadius ? bus.insideStopRadius.toString() : null;
        const currStopId = currentRadiusStop ? currentRadiusStop._id.toString() : null;

        // Update logic:
        // Case A: Just entered a stop radius
        if (currStopId && !prevStopId) {
            const log = await StopLog.create({
                bus: busId,
                stop: currStopId,
                arrivalTime: new Date(),
                metadata: { lat, lng }
            });
            bus.insideStopRadius = currStopId;
            bus.lastStopLog = log._id;
        }
        // Case B: Left a stop radius
        else if (!currStopId && prevStopId) {
            if (bus.lastStopLog) {
                const log = await StopLog.findById(bus.lastStopLog);
                if (log) {
                    log.departureTime = new Date();
                    log.duration = Math.round((log.departureTime - log.arrivalTime) / 1000); // duration in seconds
                    await log.save();
                }
            }
            bus.insideStopRadius = null;
            bus.lastStopLog = null;
        }
        // Case C: Moved from one stop radius directly to another (edge case)
        else if (currStopId && prevStopId && currStopId !== prevStopId) {
            // Close old log
            if (bus.lastStopLog) {
                const log = await StopLog.findById(bus.lastStopLog);
                if (log) {
                    log.departureTime = new Date();
                    log.duration = Math.round((log.departureTime - log.arrivalTime) / 1000);
                    await log.save();
                }
            }
            // Open new log
            const log = await StopLog.create({
                bus: busId,
                stop: currStopId,
                arrivalTime: new Date(),
                metadata: { lat, lng }
            });
            bus.insideStopRadius = currStopId;
            bus.lastStopLog = log._id;
        }

        // 3.5 Traffic Signal Log Logic
        const { isAtRedSignal, signalId } = req.body;
        
        // Just stopped at red signal
        if (isAtRedSignal && signalId && bus.atRedSignal !== signalId) {
            const log = await SignalLog.create({
                bus: busId,
                signalId,
                stopTime: new Date(),
                location: { lat, lng }
            });
            bus.atRedSignal = signalId;
            bus.lastSignalLog = log._id;
        } 
        // Just started moving after red signal (or signal turned green)
        else if (!isAtRedSignal && bus.atRedSignal) {
            if (bus.lastSignalLog) {
                const log = await SignalLog.findById(bus.lastSignalLog);
                if (log) {
                    log.startTime = new Date();
                    log.duration = Math.round((log.startTime - log.stopTime) / 1000);
                    await log.save();
                }
            }
            bus.atRedSignal = null;
            bus.lastSignalLog = null;
        }


        // 4. Update the bus document with new location and tracking state
        bus.currentLocation = {
            lat,
            lng,
            speed: speed || 0,
            heading: heading || 0,
            lastUpdated: new Date(),
        };

        await bus.save();

        res.json({ 
            success: true, 
            data: bus.currentLocation,
            insideStop: currentRadiusStop ? currentRadiusStop.name : null 
        });
    } catch (err) {
        console.error('Location Update Error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
});

// GET bus movement history
router.get('/:id/history', async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const history = await MovementLog.find({ bus: req.params.id })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));
        res.json({ success: true, count: history.length, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET bus stop logs (dwell time history)
router.get('/:id/logs', async (req, res) => {
    try {
        const logs = await StopLog.find({ bus: req.params.id })
            .populate('stop', 'name code location')
            .sort({ arrivalTime: -1 });
        res.json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET bus signal logs (red signal stop history)
router.get('/:id/signal-logs', async (req, res) => {
    try {
        const logs = await SignalLog.find({ bus: req.params.id })
            .sort({ stopTime: -1 });
        res.json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;