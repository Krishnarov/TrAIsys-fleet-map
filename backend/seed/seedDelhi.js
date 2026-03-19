const mongoose = require('mongoose');
require('dotenv').config();

const Stop = require('../models/Stop');
const Route = require('../models/Route');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/traisys_fleet';

const delhiStops = [
    { name: 'New Delhi Railway Station', code: 'NDLS', location: { lat: 28.6420, lng: 77.2197 }, address: 'Paharganj, New Delhi' },
    { name: 'Connaught Place', code: 'CP', location: { lat: 28.6315, lng: 77.2167 }, address: 'Connaught Place, New Delhi' },
    { name: 'India Gate', code: 'IGT', location: { lat: 28.6129, lng: 77.2295 }, address: 'Rajpath, New Delhi' },
    { name: 'Kashmere Gate ISBT', code: 'KGT', location: { lat: 28.6676, lng: 77.2278 }, address: 'Kashmere Gate, Delhi' },
    { name: 'Lajpat Nagar', code: 'LJN', location: { lat: 28.5700, lng: 77.2433 }, address: 'Lajpat Nagar, New Delhi' },
    { name: 'Saket', code: 'SKT', location: { lat: 28.5245, lng: 77.2066 }, address: 'Saket, New Delhi' },
    { name: 'Dwarka Sector 21', code: 'DWK', location: { lat: 28.5523, lng: 77.0588 }, address: 'Dwarka, New Delhi' },
    { name: 'Janakpuri West', code: 'JNK', location: { lat: 28.6219, lng: 77.0820 }, address: 'Janakpuri, New Delhi' },
    { name: 'Rajouri Garden', code: 'RJG', location: { lat: 28.6490, lng: 77.1220 }, address: 'Rajouri Garden, New Delhi' },
    { name: 'Karol Bagh', code: 'KRB', location: { lat: 28.6520, lng: 77.1900 }, address: 'Karol Bagh, New Delhi' },
    { name: 'Anand Vihar ISBT', code: 'AVH', location: { lat: 28.6469, lng: 77.3160 }, address: 'Anand Vihar, Delhi' },
    { name: 'Preet Vihar', code: 'PTV', location: { lat: 28.6420, lng: 77.2950 }, address: 'Preet Vihar, Delhi' },
    { name: 'Nehru Place', code: 'NHP', location: { lat: 28.5491, lng: 77.2518 }, address: 'Nehru Place, New Delhi' },
    { name: 'Hauz Khas', code: 'HKS', location: { lat: 28.5431, lng: 77.2065 }, address: 'Hauz Khas, New Delhi' },
    { name: 'IGI Airport T3', code: 'IGI', location: { lat: 28.5562, lng: 77.1000 }, address: 'IGI Airport, New Delhi' },
];

const delhiDrivers = [
    { name: 'Vikram Sharma', employeeId: 'DEL-DRV001', phone: '9811001001', email: 'vikram@traisys.in', licenseNumber: 'DL01-20190101', licenseExpiry: new Date('2028-05-15'), status: 'on_duty', experience: 7 },
    { name: 'Arun Gupta', employeeId: 'DEL-DRV002', phone: '9811001002', email: 'arun@traisys.in', licenseNumber: 'DL01-20200202', licenseExpiry: new Date('2027-08-20'), status: 'on_duty', experience: 5 },
    { name: 'Sanjay Tiwari', employeeId: 'DEL-DRV003', phone: '9811001003', email: 'sanjay@traisys.in', licenseNumber: 'DL01-20210303', licenseExpiry: new Date('2029-03-10'), status: 'on_duty', experience: 9 },
    { name: 'Manoj Verma', employeeId: 'DEL-DRV004', phone: '9811001004', email: 'manoj@traisys.in', licenseNumber: 'DL01-20180404', licenseExpiry: new Date('2026-11-30'), status: 'available', experience: 12 },
];

async function seedDelhi() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Insert Delhi stops (skip if code already exists)
        const stops = [];
        for (const s of delhiStops) {
            const existing = await Stop.findOne({ code: s.code });
            if (existing) {
                console.log(`⚠️  Stop ${s.code} already exists, skipping`);
                stops.push(existing);
            } else {
                const created = await Stop.create(s);
                stops.push(created);
                console.log(`✅ Stop created: ${s.name}`);
            }
        }

        const sm = {};
        stops.forEach(s => { sm[s.code] = s._id; });

        // Delhi Routes
        const delhiRoutes = [
            {
                name: 'NDLS - Connaught Place - India Gate - Lajpat Nagar',
                routeNumber: 'DEL-01',
                color: '#E53935',
                distance: 12.5,
                estimatedDuration: 45,
                frequency: 10,
                isActive: true,
                operatingHours: { start: '05:30', end: '23:00' },
                stops: [
                    { stop: sm['NDLS'], sequence: 1, arrivalOffset: 0 },
                    { stop: sm['CP'],   sequence: 2, arrivalOffset: 10 },
                    { stop: sm['IGT'],  sequence: 3, arrivalOffset: 20 },
                    { stop: sm['NHP'],  sequence: 4, arrivalOffset: 32 },
                    { stop: sm['LJN'],  sequence: 5, arrivalOffset: 45 },
                ],
                path: [
                    { lat: 28.6420, lng: 77.2197 },
                    { lat: 28.6380, lng: 77.2190 },
                    { lat: 28.6315, lng: 77.2167 },
                    { lat: 28.6250, lng: 77.2200 },
                    { lat: 28.6200, lng: 77.2250 },
                    { lat: 28.6129, lng: 77.2295 },
                    { lat: 28.6000, lng: 77.2350 },
                    { lat: 28.5800, lng: 77.2420 },
                    { lat: 28.5700, lng: 77.2433 },
                ],
            },
            {
                name: 'Kashmere Gate - Karol Bagh - Rajouri Garden - Janakpuri - Dwarka',
                routeNumber: 'DEL-02',
                color: '#1E88E5',
                distance: 28.0,
                estimatedDuration: 75,
                frequency: 12,
                isActive: true,
                operatingHours: { start: '05:00', end: '23:30' },
                stops: [
                    { stop: sm['KGT'], sequence: 1, arrivalOffset: 0 },
                    { stop: sm['KRB'], sequence: 2, arrivalOffset: 15 },
                    { stop: sm['RJG'], sequence: 3, arrivalOffset: 30 },
                    { stop: sm['JNK'], sequence: 4, arrivalOffset: 50 },
                    { stop: sm['DWK'], sequence: 5, arrivalOffset: 75 },
                ],
                path: [
                    { lat: 28.6676, lng: 77.2278 },
                    { lat: 28.6600, lng: 77.2150 },
                    { lat: 28.6520, lng: 77.1900 },
                    { lat: 28.6510, lng: 77.1700 },
                    { lat: 28.6500, lng: 77.1500 },
                    { lat: 28.6490, lng: 77.1220 },
                    { lat: 28.6400, lng: 77.1100 },
                    { lat: 28.6300, lng: 77.1000 },
                    { lat: 28.6219, lng: 77.0820 },
                    { lat: 28.6000, lng: 77.0700 },
                    { lat: 28.5700, lng: 77.0620 },
                    { lat: 28.5523, lng: 77.0588 },
                ],
            },
            {
                name: 'Anand Vihar - Preet Vihar - CP - Karol Bagh - NDLS',
                routeNumber: 'DEL-03',
                color: '#43A047',
                distance: 18.0,
                estimatedDuration: 55,
                frequency: 15,
                isActive: true,
                operatingHours: { start: '06:00', end: '22:00' },
                stops: [
                    { stop: sm['AVH'], sequence: 1, arrivalOffset: 0 },
                    { stop: sm['PTV'], sequence: 2, arrivalOffset: 12 },
                    { stop: sm['CP'],  sequence: 3, arrivalOffset: 28 },
                    { stop: sm['KRB'], sequence: 4, arrivalOffset: 40 },
                    { stop: sm['NDLS'],sequence: 5, arrivalOffset: 55 },
                ],
                path: [
                    { lat: 28.6469, lng: 77.3160 },
                    { lat: 28.6450, lng: 77.3050 },
                    { lat: 28.6420, lng: 77.2950 },
                    { lat: 28.6400, lng: 77.2800 },
                    { lat: 28.6380, lng: 77.2600 },
                    { lat: 28.6350, lng: 77.2400 },
                    { lat: 28.6315, lng: 77.2167 },
                    { lat: 28.6400, lng: 77.2050 },
                    { lat: 28.6520, lng: 77.1900 },
                    { lat: 28.6480, lng: 77.2050 },
                    { lat: 28.6420, lng: 77.2197 },
                ],
            },
            {
                name: 'IGI Airport - Dwarka - Saket - Hauz Khas - Nehru Place',
                routeNumber: 'DEL-04',
                color: '#FB8C00',
                distance: 22.0,
                estimatedDuration: 60,
                frequency: 20,
                isActive: true,
                operatingHours: { start: '04:00', end: '00:00' },
                stops: [
                    { stop: sm['IGI'], sequence: 1, arrivalOffset: 0 },
                    { stop: sm['DWK'], sequence: 2, arrivalOffset: 15 },
                    { stop: sm['SKT'], sequence: 3, arrivalOffset: 35 },
                    { stop: sm['HKS'], sequence: 4, arrivalOffset: 45 },
                    { stop: sm['NHP'], sequence: 5, arrivalOffset: 60 },
                ],
                path: [
                    { lat: 28.5562, lng: 77.1000 },
                    { lat: 28.5540, lng: 77.0800 },
                    { lat: 28.5523, lng: 77.0588 },
                    { lat: 28.5400, lng: 77.0800 },
                    { lat: 28.5300, lng: 77.1200 },
                    { lat: 28.5245, lng: 77.2066 },
                    { lat: 28.5350, lng: 77.2066 },
                    { lat: 28.5431, lng: 77.2065 },
                    { lat: 28.5460, lng: 77.2300 },
                    { lat: 28.5491, lng: 77.2518 },
                ],
            },
        ];

        for (const r of delhiRoutes) {
            const existing = await Route.findOne({ routeNumber: r.routeNumber });
            if (existing) {
                console.log(`⚠️  Route ${r.routeNumber} already exists, skipping`);
            } else {
                await Route.create(r);
                console.log(`✅ Route created: ${r.routeNumber} — ${r.name}`);
            }
        }

        const routes = await Route.find({ routeNumber: { $in: delhiRoutes.map(r => r.routeNumber) } });
        const routeMap = {};
        routes.forEach(r => { routeMap[r.routeNumber] = r._id; });

        // Delhi Drivers
        const drivers = [];
        for (const d of delhiDrivers) {
            const existing = await Driver.findOne({ employeeId: d.employeeId });
            if (existing) {
                console.log(`⚠️  Driver ${d.employeeId} already exists, skipping`);
                drivers.push(existing);
            } else {
                const created = await Driver.create(d);
                drivers.push(created);
                console.log(`✅ Driver created: ${d.name}`);
            }
        }

        // Delhi Buses
        const delhiBuses = [
            {
                busNumber: 'DEL-BUS-001',
                registrationNumber: 'DL01-CA-0001',
                model: 'Tata Starbus EV',
                manufacturer: 'Tata Motors',
                capacity: 55,
                type: 'electric',
                status: 'active',
                isAC: true,
                fuelType: 'electric',
                manufactureYear: 2023,
                odometer: 12000,
                assignedRoute: routeMap['DEL-01'],
                assignedDriver: drivers[0]._id,
                currentLocation: { lat: 28.6315, lng: 77.2167, speed: 30, heading: 180, lastUpdated: new Date() },
            },
            {
                busNumber: 'DEL-BUS-002',
                registrationNumber: 'DL01-CA-0002',
                model: 'Ashok Leyland Circuit',
                manufacturer: 'Ashok Leyland',
                capacity: 50,
                type: 'electric',
                status: 'active',
                isAC: true,
                fuelType: 'electric',
                manufactureYear: 2023,
                odometer: 8500,
                assignedRoute: routeMap['DEL-02'],
                assignedDriver: drivers[1]._id,
                currentLocation: { lat: 28.6490, lng: 77.1220, speed: 28, heading: 270, lastUpdated: new Date() },
            },
            {
                busNumber: 'DEL-BUS-003',
                registrationNumber: 'DL01-CA-0003',
                model: 'Olectra K9',
                manufacturer: 'Olectra',
                capacity: 40,
                type: 'ac',
                status: 'active',
                isAC: true,
                fuelType: 'electric',
                manufactureYear: 2024,
                odometer: 3200,
                assignedRoute: routeMap['DEL-03'],
                assignedDriver: drivers[2]._id,
                currentLocation: { lat: 28.6420, lng: 77.2950, speed: 35, heading: 270, lastUpdated: new Date() },
            },
            {
                busNumber: 'DEL-BUS-004',
                registrationNumber: 'DL01-CA-0004',
                model: 'Tata Starbus Ultra AC',
                manufacturer: 'Tata Motors',
                capacity: 52,
                type: 'ac',
                status: 'active',
                isAC: true,
                fuelType: 'diesel',
                manufactureYear: 2022,
                odometer: 31000,
                assignedRoute: routeMap['DEL-04'],
                assignedDriver: drivers[3]._id,
                currentLocation: { lat: 28.5523, lng: 77.0588, speed: 25, heading: 90, lastUpdated: new Date() },
            },
        ];

        for (const b of delhiBuses) {
            const existing = await Bus.findOne({ busNumber: b.busNumber });
            if (existing) {
                console.log(`⚠️  Bus ${b.busNumber} already exists, skipping`);
            } else {
                await Bus.create(b);
                console.log(`✅ Bus created: ${b.busNumber}`);
            }
        }

        console.log('\n🎉 Delhi seed complete!');
        console.log(`   Stops   : ${delhiStops.length}`);
        console.log(`   Routes  : ${delhiRoutes.length}`);
        console.log(`   Drivers : ${delhiDrivers.length}`);
        console.log(`   Buses   : ${delhiBuses.length}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Delhi seed failed:', err);
        process.exit(1);
    }
}

seedDelhi();
