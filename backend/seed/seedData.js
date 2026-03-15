const mongoose = require('mongoose');
require('dotenv').config();

const Stop = require('../models/Stop');
const Route = require('../models/Route');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/traisys_fleet';

// Lucknow real bus stops with coordinates
const stopsData = [
    { name: 'Charbagh Railway Station', code: 'CHB', location: { lat: 26.8402, lng: 80.9198 }, address: 'Charbagh, Lucknow' },
    { name: 'Hazratganj', code: 'HZG', location: { lat: 26.8557, lng: 80.9466 }, address: 'Hazratganj, Lucknow' },
    { name: 'Aminabad', code: 'AMB', location: { lat: 26.8489, lng: 80.9329 }, address: 'Aminabad, Lucknow' },
    { name: 'Alambagh Bus Terminal', code: 'ALB', location: { lat: 26.8145, lng: 80.9003 }, address: 'Alambagh, Lucknow' },
    { name: 'Gomti Nagar', code: 'GMN', location: { lat: 26.8520, lng: 81.0100 }, address: 'Gomti Nagar, Lucknow' },
    { name: 'Amausi Airport', code: 'AMA', location: { lat: 26.7600, lng: 80.8893 }, address: 'Amausi, Lucknow' },
    { name: 'Indira Nagar', code: 'IDN', location: { lat: 26.8840, lng: 80.9983 }, address: 'Indira Nagar, Lucknow' },
    { name: 'Chinhat', code: 'CHT', location: { lat: 26.8670, lng: 81.0560 }, address: 'Chinhat, Lucknow' },
    { name: 'IT City Chauraha', code: 'ITC', location: { lat: 26.8472, lng: 81.0287 }, address: 'IT City, Lucknow' },
    { name: 'Vikas Nagar', code: 'VKN', location: { lat: 26.8967, lng: 80.9716 }, address: 'Vikas Nagar, Lucknow' },
    { name: 'SGPGI Hospital', code: 'SGP', location: { lat: 26.8143, lng: 80.9936 }, address: 'Raebareli Rd, Lucknow' },
    { name: 'Mahanagar', code: 'MNG', location: { lat: 26.8734, lng: 80.9698 }, address: 'Mahanagar, Lucknow' },
];

const driversData = [
    { name: 'Ramesh Kumar', employeeId: 'DRV001', phone: '9876543210', email: 'ramesh@TRAISYS.IN', licenseNumber: 'UP32-20180012', licenseExpiry: new Date('2027-06-30'), status: 'on_duty', experience: 8 },
    { name: 'Suresh Singh', employeeId: 'DRV002', phone: '9876543211', email: 'suresh@TRAISYS.IN', licenseNumber: 'UP32-20190045', licenseExpiry: new Date('2026-12-31'), status: 'on_duty', experience: 6 },
    { name: 'Mohan Lal', employeeId: 'DRV003', phone: '9876543212', email: 'mohan@TRAISYS.IN', licenseNumber: 'UP32-20200078', licenseExpiry: new Date('2028-03-15'), status: 'available', experience: 4 },
    { name: 'Dinesh Yadav', employeeId: 'DRV004', phone: '9876543213', email: 'dinesh@TRAISYS.IN', licenseNumber: 'UP32-20170033', licenseExpiry: new Date('2026-09-20'), status: 'on_duty', experience: 10 },
    { name: 'Rajendra Prasad', employeeId: 'DRV005', phone: '9876543214', email: 'rajendra@TRAISYS.IN', licenseNumber: 'UP32-20210091', licenseExpiry: new Date('2029-01-10'), status: 'available', experience: 2 },
];

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Stop.deleteMany({});
        await Route.deleteMany({});
        await Driver.deleteMany({});
        await Bus.deleteMany({});
        console.log('🧹 Cleared existing data');

        // Seed stops
        const stops = await Stop.insertMany(stopsData);
        console.log(`✅ Created ${stops.length} stops`);

        // Map stop codes to IDs
        const stopMap = {};
        stops.forEach(s => { stopMap[s.code] = s._id; });

        // Seed routes
        const routesData = [
            {
                name: 'Alambagh - Hazratganj - Gomti Nagar',
                routeNumber: 'LKO-01',
                color: '#1D9E75',
                distance: 18.5,
                estimatedDuration: 55,
                frequency: 10,
                stops: [
                    { stop: stopMap['ALB'], sequence: 1, arrivalOffset: 0 },
                    { stop: stopMap['CHB'], sequence: 2, arrivalOffset: 10 },
                    { stop: stopMap['AMB'], sequence: 3, arrivalOffset: 18 },
                    { stop: stopMap['HZG'], sequence: 4, arrivalOffset: 28 },
                    { stop: stopMap['MNG'], sequence: 5, arrivalOffset: 38 },
                    { stop: stopMap['GMN'], sequence: 6, arrivalOffset: 55 },
                ],
                path: [
                    { lat: 26.8145, lng: 80.9003 },
                    { lat: 26.8220, lng: 80.9050 },
                    { lat: 26.8402, lng: 80.9198 },
                    { lat: 26.8450, lng: 80.9260 },
                    { lat: 26.8489, lng: 80.9329 },
                    { lat: 26.8520, lng: 80.9400 },
                    { lat: 26.8557, lng: 80.9466 },
                    { lat: 26.8580, lng: 80.9600 },
                    { lat: 26.8600, lng: 80.9700 },
                    { lat: 26.8734, lng: 80.9698 },
                    { lat: 26.8600, lng: 80.9850 },
                    { lat: 26.8520, lng: 81.0100 },
                ],
            },
            {
                name: 'Charbagh - Indira Nagar - Chinhat',
                routeNumber: 'LKO-02',
                color: '#1565C0',
                distance: 22.0,
                estimatedDuration: 65,
                frequency: 15,
                stops: [
                    { stop: stopMap['CHB'], sequence: 1, arrivalOffset: 0 },
                    { stop: stopMap['HZG'], sequence: 2, arrivalOffset: 15 },
                    { stop: stopMap['ITC'], sequence: 3, arrivalOffset: 30 },
                    { stop: stopMap['IDN'], sequence: 4, arrivalOffset: 45 },
                    { stop: stopMap['CHT'], sequence: 5, arrivalOffset: 65 },
                ],
                path: [
                    { lat: 26.8402, lng: 80.9198 },
                    { lat: 26.8480, lng: 80.9350 },
                    { lat: 26.8557, lng: 80.9466 },
                    { lat: 26.8600, lng: 80.9600 },
                    { lat: 26.8620, lng: 80.9750 },
                    { lat: 26.8472, lng: 81.0287 },
                    { lat: 26.8600, lng: 81.0100 },
                    { lat: 26.8840, lng: 80.9983 },
                    { lat: 26.8700, lng: 81.0300 },
                    { lat: 26.8670, lng: 81.0560 },
                ],
            },
            {
                name: 'Amausi - Alambagh - SGPGI',
                routeNumber: 'LKO-03',
                color: '#E65100',
                distance: 16.0,
                estimatedDuration: 50,
                frequency: 20,
                stops: [
                    { stop: stopMap['AMA'], sequence: 1, arrivalOffset: 0 },
                    { stop: stopMap['ALB'], sequence: 2, arrivalOffset: 15 },
                    { stop: stopMap['CHB'], sequence: 3, arrivalOffset: 25 },
                    { stop: stopMap['SGP'], sequence: 4, arrivalOffset: 50 },
                ],
                path: [
                    { lat: 26.7600, lng: 80.8893 },
                    { lat: 26.7750, lng: 80.8920 },
                    { lat: 26.7900, lng: 80.8960 },
                    { lat: 26.8145, lng: 80.9003 },
                    { lat: 26.8300, lng: 80.9100 },
                    { lat: 26.8402, lng: 80.9198 },
                    { lat: 26.8350, lng: 80.9400 },
                    { lat: 26.8300, lng: 80.9600 },
                    { lat: 26.8200, lng: 80.9770 },
                    { lat: 26.8143, lng: 80.9936 },
                ],
            },
        ];

        const routes = await Route.insertMany(routesData);
        console.log(`✅ Created ${routes.length} routes`);

        // Seed drivers
        const drivers = await Driver.insertMany(driversData);
        console.log(`✅ Created ${drivers.length} drivers`);

        // Seed buses with current locations on their routes
        const busesData = [
            {
                busNumber: 'LKO-BUS-001',
                registrationNumber: 'UP32-AB-1001',
                model: 'Tata Starbus Ultra',
                manufacturer: 'Tata Motors',
                capacity: 52,
                type: 'ac',
                status: 'active',
                isAC: true,
                fuelType: 'diesel',
                manufactureYear: 2022,
                odometer: 42500,
                assignedRoute: routes[0]._id,
                assignedDriver: drivers[0]._id,
                currentLocation: { lat: 26.8489, lng: 80.9329, speed: 32, heading: 90, lastUpdated: new Date() },
            },
            {
                busNumber: 'LKO-BUS-002',
                registrationNumber: 'UP32-AB-1002',
                model: 'Ashok Leyland Viking',
                manufacturer: 'Ashok Leyland',
                capacity: 45,
                type: 'standard',
                status: 'active',
                isAC: false,
                fuelType: 'cng',
                manufactureYear: 2021,
                odometer: 68200,
                assignedRoute: routes[0]._id,
                assignedDriver: drivers[1]._id,
                currentLocation: { lat: 26.8734, lng: 80.9698, speed: 28, heading: 45, lastUpdated: new Date() },
            },
            {
                busNumber: 'LKO-BUS-003',
                registrationNumber: 'UP32-AB-1003',
                model: 'Tata Starbus Ultra',
                manufacturer: 'Tata Motors',
                capacity: 52,
                type: 'ac',
                status: 'active',
                isAC: true,
                fuelType: 'diesel',
                manufactureYear: 2023,
                odometer: 18700,
                assignedRoute: routes[1]._id,
                assignedDriver: drivers[3]._id,
                currentLocation: { lat: 26.8620, lng: 80.9750, speed: 35, heading: 60, lastUpdated: new Date() },
            },
            {
                busNumber: 'LKO-BUS-004',
                registrationNumber: 'UP32-AB-1004',
                model: 'Ashok Leyland Lynx',
                manufacturer: 'Ashok Leyland',
                capacity: 35,
                type: 'minibus',
                status: 'active',
                isAC: true,
                fuelType: 'electric',
                manufactureYear: 2023,
                odometer: 8400,
                assignedRoute: routes[2]._id,
                assignedDriver: drivers[2]._id,
                currentLocation: { lat: 26.8145, lng: 80.9003, speed: 0, heading: 0, lastUpdated: new Date() },
            },
            {
                busNumber: 'LKO-BUS-005',
                registrationNumber: 'UP32-AB-1005',
                model: 'Tata Starbus',
                manufacturer: 'Tata Motors',
                capacity: 45,
                type: 'standard',
                status: 'maintenance',
                isAC: false,
                fuelType: 'diesel',
                manufactureYear: 2019,
                odometer: 152000,
                assignedRoute: null,
                assignedDriver: null,
                currentLocation: { lat: null, lng: null, speed: 0, heading: 0, lastUpdated: null },
            },
        ];

        const buses = await Bus.insertMany(busesData);
        console.log(`✅ Created ${buses.length} buses`);

        console.log('\n🎉 Seed complete! Summary:');
        console.log(`   Stops   : ${stops.length}`);
        console.log(`   Routes  : ${routes.length}`);
        console.log(`   Drivers : ${drivers.length}`);
        console.log(`   Buses   : ${buses.length}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected. Backend ready!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
}

seedDatabase();