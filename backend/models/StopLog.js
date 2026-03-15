const mongoose = require('mongoose');

const stopLogSchema = new mongoose.Schema(
    {
        bus: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bus',
            required: true,
        },
        stop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Stop',
            required: true,
        },
        arrivalTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        departureTime: {
            type: Date,
        },
        duration: {
            type: Number, // in seconds
        },
        metadata: {
            lat: Number,
            lng: Number,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('StopLog', stopLogSchema);
