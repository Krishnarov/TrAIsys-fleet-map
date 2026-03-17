const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Route name is required'],
            trim: true,
        },
        routeNumber: {
            type: String,
            required: [true, 'Route number is required'],
            unique: true,
            trim: true,
        },
        cities: [{
            type: String,
            trim: true
        }],
        color: {
            type: String,
            default: '#1D9E75',
            // hex color for map polyline
        },
        stops: [
            {
                stop: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Stop',
                    required: true,
                },
                sequence: {
                    type: Number,
                    required: true,
                },
                arrivalOffset: {
                    // minutes from route start
                    type: Number,
                    default: 0,
                },
            },
        ],
        // Polyline path coordinates for map drawing
        path: [
            {
                lat: { type: Number, required: true },
                lng: { type: Number, required: true },
            },
        ],
        distance: {
            type: Number, // in km
            default: 0,
        },
        estimatedDuration: {
            type: Number, // in minutes
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        operatingHours: {
            start: { type: String, default: '06:00' },
            end: { type: String, default: '22:00' },
        },
        frequency: {
            type: Number, // minutes between buses
            default: 15,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Route', routeSchema);
