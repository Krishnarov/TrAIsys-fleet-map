const mongoose = require('mongoose');

const signalLogSchema = new mongoose.Schema(
    {
        bus: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bus',
            required: true,
            index: true,
        },
        signalId: {
            type: String,
            required: true,
        },
        stopTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        startTime: {
            type: Date,
        },
        duration: {
            type: Number, // in seconds
        },
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('SignalLog', signalLogSchema);
