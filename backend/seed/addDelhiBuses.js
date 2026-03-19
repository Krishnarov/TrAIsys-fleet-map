const mongoose = require('mongoose');
require('dotenv').config();

const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Route = require('../models/Route');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/traisys_fleet';

async function addDelhiBuses() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const routes = await Route.find({ routeNumber: { $in: ['DEL-01', 'DEL-02', 'DEL-03', 'DEL-04'] } });
        const rm = {};
        routes.forEach(r => { rm[r.routeNumber] = r._id; });

        // Extra drivers
        const extraDrivers = [
            { name: 'Rohit Chauhan', employeeId: 'DEL-DRV005', phone: '9811001005', email: 'rohit@traisys.in', licenseNumber: 'DL01-20220505', licenseExpiry: new Date('2030-01-15'), status: 'on_duty', experience: 3 },
            { name: 'Deepak Mishra', employeeId: 'DEL-DRV006', phone: '9811001006', email: 'deepak@traisys.in', licenseNumber: 'DL01-20210606', licenseExpiry: new Date('2029-06-20'), status: 'on_duty', experience: 6 },
            { name: 'Sunil Rawat', employeeId: 'DEL-DRV007', phone: '9811001007', email: 'sunil@traisys.in', licenseNumber: 'DL01-20190707', licenseExpiry: new Date('2027-09-10'), status: 'on_duty', experience: 8 },
            { name: 'Pankaj Dubey', employeeId: 'DEL-DRV008', phone: '9811001008', email: 'pankaj@traisys.in', licenseNumber: 'DL01-20200808', licenseExpiry: new Date('2028-12-05'), status: 'on_duty', experience: 5 },
        ];

        const drivers = [];
        for (const d of extraDrivers) {
            const existing = await Driver.findOne({ employeeId: d.employeeId });
            if (existing) { drivers.push(existing); continue; }
            const created = await Driver.create(d);
            drivers.push(created);
            console.log(`✅ Driver: ${d.name}`);
        }

        const extraBuses = [
            // DEL-01 route — 2 more buses
            {
                busNumber: 'DEL-BUS-005',
                registrationNumber: 'DL01-CA-0005',
                model: 'Tata Starbus EV',
                manufacturer: 'Tata Motors',
                capacity: 55, type: 'electric', status: 'active',
                isAC: true, fuelType: 'electric', manufactureYear: 2023, odometer: 9800,
                assignedRoute: rm['DEL-01'],
                assignedDriver: drivers[0]._id,
                currentLocation: { lat: 28.6420, lng: 77.2197, speed: 32, heading: 180, lastUpdated: new Date() },
            },
            {
                busNumber: 'DEL-BUS-006',
                registrationNumber: 'DL01-CA-0006',
                model: 'Ashok Leyland Circuit S',
                manufacturer: 'Ashok Leyland',
                capacity: 50, type: 'electric', status: 'active',
                isAC: true, fuelType: 'electric', manufactureYear: 2024, odometer: 4200,
                assignedRoute: rm['DEL-01'],
                assignedDriver: drivers[1]._id,
                currentLocation: { lat: 28.6129, lng: 77.2295, speed: 28, heading: 90, lastUpdated: new Date() },
            },
            // DEL-02 route — 2 more buses
            {
                busNumber: 'DEL-BUS-007',
                registrationNumber: 'DL01-CA-0007',
                model: 'Olectra K9',
                manufacturer: 'Olectra',
                capacity: 40, type: 'ac', status: 'active',
                isAC: true, fuelType: 'electric', manufactureYear: 2024, odometer: 2100,
                assignedRoute: rm['DEL-02'],
                assignedDriver: drivers[2]._id,
                currentLocation: { lat: 28.6676, lng: 77.2278, speed: 30, heading: 270, lastUpdated: new Date() },
            },
            {
                busNumber: 'DEL-BUS-008',
                registrationNumber: 'DL01-CA-0008',
                model: 'Tata Starbus Ultra AC',
                manufacturer: 'Tata Motors',
                capacity: 52, type: 'ac', status: 'active',
                isAC: true, fuelType: 'diesel', manufactureYear: 2022, odometer: 27000,
                assignedRoute: rm['DEL-02'],
                assignedDriver: drivers[3]._id,
                currentLocation: { lat: 28.6219, lng: 77.0820, speed: 25, heading: 270, lastUpdated: new Date() },
            },
            // DEL-03 route — 1 more bus
            {
                busNumber: 'DEL-BUS-009',
                registrationNumber: 'DL01-CA-0009',
                model: 'Ashok Leyland Viking CNG',
                manufacturer: 'Ashok Leyland',
                capacity: 45, type: 'standard', status: 'active',
                isAC: false, fuelType: 'cng', manufactureYear: 2021, odometer: 55000,
                assignedRoute: rm['DEL-03'],
                assignedDriver: null,
                currentLocation: { lat: 28.6469, lng: 77.3160, speed: 33, heading: 270, lastUpdated: new Date() },
            },
            // DEL-04 route — 1 more bus
            {
                busNumber: 'DEL-BUS-010',
                registrationNumber: 'DL01-CA-0010',
                model: 'Tata Starbus EV',
                manufacturer: 'Tata Motors',
                capacity: 55, type: 'electric', status: 'active',
                isAC: true, fuelType: 'electric', manufactureYear: 2024, odometer: 1500,
                assignedRoute: rm['DEL-04'],
                assignedDriver: null,
                currentLocation: { lat: 28.5562, lng: 77.1000, speed: 40, heading: 90, lastUpdated: new Date() },
            },
        ];

        for (const b of extraBuses) {
            const existing = await Bus.findOne({ busNumber: b.busNumber });
            if (existing) {
                console.log(`⚠️  Bus ${b.busNumber} already exists, skipping`);
                continue;
            }
            await Bus.create(b);
            console.log(`✅ Bus: ${b.busNumber} → Route ${Object.keys(rm).find(k => rm[k].toString() === b.assignedRoute.toString())}`);
        }

        console.log('\n🎉 Extra Delhi buses added!');
        console.log('   DEL-01: 3 buses total (001, 005, 006)');
        console.log('   DEL-02: 3 buses total (002, 007, 008)');
        console.log('   DEL-03: 2 buses total (003, 009)');
        console.log('   DEL-04: 2 buses total (004, 010)');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
}

addDelhiBuses();
