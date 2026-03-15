const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
    {
        busNumber: {
            type: String,
            required: [true, 'Bus number is required'],
            unique: true,
            trim: true,
        },
        registrationNumber: {
            type: String,
            required: [true, 'Registration number is required'],
            unique: true,
            trim: true,
        },
        model: {
            type: String,
            trim: true,
        },
        manufacturer: {
            type: String,
            trim: true,
        },
        capacity: {
            type: Number,
            required: [true, 'Seating capacity is required'],
            min: 1,
        },
        type: {
            type: String,
            enum: ['standard', 'articulated', 'minibus', 'electric', 'ac'],
            default: 'standard',
        },
        status: {
            type: String,
            enum: ['active', 'idle', 'maintenance', 'out_of_service'],
            default: 'idle',
        },
        // Assigned route (nullable)
        assignedRoute: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Route',
            default: null,
        },
        // Assigned driver (nullable)
        assignedDriver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver',
            default: null,
        },
        // Current GPS position for map
        currentLocation: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
            lastUpdated: { type: Date, default: null },
            speed: { type: Number, default: 0 }, // km/h
            heading: { type: Number, default: 0 }, // degrees
        },
        fuelType: {
            type: String,
            enum: ['diesel', 'petrol', 'electric', 'cng', 'hybrid'],
            default: 'diesel',
        },
        // Real-time tracking state
        insideStopRadius: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Stop',
            default: null,
        },
        lastStopLog: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StopLog',
            default: null,
        },
        atRedSignal: {
            type: String, // signalId
            default: null,
        },
        lastSignalLog: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SignalLog',
            default: null,
        },
        manufactureYear: {
            type: Number,
        },
        lastMaintenanceDate: {
            type: Date,
        },
        nextMaintenanceDue: {
            type: Date,
        },
        odometer: {
            type: Number, // km
            default: 0,
        },
        isAC: {
            type: Boolean,
            default: false,
        },
        hasWifi: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Bus', busSchema);