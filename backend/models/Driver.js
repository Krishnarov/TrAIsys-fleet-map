const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Driver name is required'],
            trim: true,
        },
        employeeId: {
            type: String,
            required: [true, 'Employee ID is required'],
            unique: true,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        licenseNumber: {
            type: String,
            required: [true, 'License number is required'],
            unique: true,
            trim: true,
        },
        licenseExpiry: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['available', 'on_duty', 'off_duty', 'on_leave'],
            default: 'available',
        },
        experience: {
            type: Number, // years
            default: 0,
        },
        joiningDate: {
            type: Date,
            default: Date.now,
        },
        address: {
            type: String,
            trim: true,
        },
        emergencyContact: {
            name: String,
            phone: String,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);