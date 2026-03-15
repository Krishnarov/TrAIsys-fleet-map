const mongoose = require('mongoose');

const movementLogSchema = new mongoose.Schema(
    {
        bus: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bus',
            required: true,
            index: true,
        },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        speed: { type: Number, default: 0 },
        heading: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now, index: true },
    }
);

// We should probably delete old logs eventually, but for now we'll just index them for history
movementLogSchema.index({ bus: 1, timestamp: -1 });

module.exports = mongoose.model('MovementLog', movementLogSchema);
