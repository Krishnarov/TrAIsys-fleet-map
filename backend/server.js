const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');

const http = require('http');
const { Server } = require('socket.io');

// Route imports
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const stopRoutes = require('./routes/stops');
const driverRoutes = require('./routes/drivers');
const Bus = require('./models/Bus');
const StopLog = require('./models/StopLog');
const MovementLog = require('./models/MovementLog');
const SignalLog = require('./models/SignalLog');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'https://traisys-fleet-map.vercel.app'],
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://traisys-fleet-map.vercel.app'],
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'TRAISYS Fleet API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// API Routes
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/drivers', driverRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

const PORT = process.env.PORT || 5000;

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

// Websocket logic
io.on('connection', (socket) => {
    // console.log('A client connected:', socket.id);

    socket.on('bus-location-update', async (data) => {
        try {
            const { busId, lat, lng, speed, heading, isAtRedSignal, signalId } = data;
            
            // 1. Get bus with route and its current tracking state
            const bus = await Bus.findById(busId).populate({
                path: 'assignedRoute',
                populate: { path: 'stops.stop' }
            });

            if (!bus) return; // Bus not found

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

            // Stop Logic A/B/C
            if (currStopId && !prevStopId) {
                const log = await StopLog.create({
                    bus: busId, stop: currStopId, arrivalTime: new Date(), metadata: { lat, lng }
                });
                bus.insideStopRadius = currStopId;
                bus.lastStopLog = log._id;
            } else if (!currStopId && prevStopId) {
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
            } else if (currStopId && prevStopId && currStopId !== prevStopId) {
                if (bus.lastStopLog) {
                    const log = await StopLog.findById(bus.lastStopLog);
                    if (log) {
                        log.departureTime = new Date();
                        log.duration = Math.round((log.departureTime - log.arrivalTime) / 1000);
                        await log.save();
                    }
                }
                const log = await StopLog.create({
                    bus: busId, stop: currStopId, arrivalTime: new Date(), metadata: { lat, lng }
                });
                bus.insideStopRadius = currStopId;
                bus.lastStopLog = log._id;
            }

            // Signal Logic
            if (isAtRedSignal && signalId && bus.atRedSignal !== signalId) {
                const log = await SignalLog.create({
                    bus: busId, signalId, stopTime: new Date(), location: { lat, lng }
                });
                bus.atRedSignal = signalId;
                bus.lastSignalLog = log._id;
            } else if (!isAtRedSignal && bus.atRedSignal) {
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

            // 4. Update the bus document
            bus.currentLocation = {
                lat, lng,
                speed: speed || 0,
                heading: heading || 0,
                lastUpdated: new Date(),
            };

            await bus.save();

            // Emit to other clients if needed (like another map page viewing live status)
            // io.emit('location-updated', { busId, data: bus.currentLocation })

        } catch (err) {
            console.error('Socket Location Update Error:', err.message);
        }
    });
    
    socket.on('disconnect', () => {
        // console.log('Client disconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 TRAISYS Fleet API running on http://localhost:${PORT}`);
    console.log(`📋 API Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   CRUD /api/buses`);
    console.log(`   CRUD /api/routes`);
    console.log(`   CRUD /api/stops`);
    console.log(`   CRUD /api/drivers`);
    console.log(`   GET  /api/buses/locations  → map data\n`);
});

module.exports = { app, server, io };