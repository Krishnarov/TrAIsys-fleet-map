const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Stop name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Stop code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        address: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        facilities: {
            hasShelter: { type: Boolean, default: false },
            hasSeating: { type: Boolean, default: false },
            isAccessible: { type: Boolean, default: false },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Stop', stopSchema);