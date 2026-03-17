# TrAIsys: Intelligent Transportation System - Technical Documentation

## 1. Project Overview
**TrAIsys** (derived from *Intelligent Transportation System*) is a comprehensive fleet management and real-time transit tracking solution. Designed initially for the urban transit network of Lucknow, India, it provides a centralized dashboard for administrators to monitor bus movements, manage routes, assign drivers, and optimize city-wide transportation.

### Core Objectives:
- **Real-time Monitoring**: Track the live location, speed, and status of every bus in the fleet.
- **Route Optimization**: Design and manage complex bus routes with automated path generation.
- **Efficiency Analysis**: Log and analyze bus movements, stop durations, and signal delays.
- **Resource Management**: Manage driver assignments and vehicle maintenance schedules.

---

## 2. Technology Stack

### Frontend (User Interface)
- **Framework**: React.js (v18+)
- **Build Tool**: Vite (for ultra-fast development and optimized production builds)
- **Mapping Library**: Leaflet & React-Leaflet (Open-source alternative to Google Maps)
- **Icons**: Lucide React (Clean, consistent SVG icons)
- **State Management**: React Hooks (useState, useEffect) & Context API
- **Styling**: Modern CSS3 with a custom design system (Variables, Flexbox, Grid)
- **Notifications**: React Hot Toast
- **HTTP Client**: Axios (for backend API communication)

### Backend (Server Side)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (NoSQL)
- **ODM**: Mongoose (Object Data Modeling)
- **Logging**: Morgan (HTTP request logger)
- **Security**: CORS (Cross-Origin Resource Sharing), Dotenv (Environment variable management)

---

## 3. Database Models & Schema Design
The project uses seven key collections in MongoDB to handle complex transportation data.

### 3.1 Bus Model ([Bus.js](file:///Users/devkrishna/Documents/Developement/traisys/backend/models/Bus.js))
Stores information about vehicles and their current operational state.

| Field | Type | Description |
| :--- | :--- | :--- |
| `busNumber` | String | Unique identifier (e.g., LKO-BUS-001) |
| `registrationNumber` | String | Government registration plate (e.g., UP32-AB-1001) |
| `model` | String | Vehicle model name |
| `manufacturer` | String | Manufacturer (Tata, Ashok Leyland, etc.) |
| `capacity` | Number | Seating capacity |
| `type` | Enum | standard, articulated, minibus, electric, ac |
| `status` | Enum | active, idle, maintenance, out_of_service |
| `assignedRoute` | ObjectId | Reference to the [Route](file:///Users/devkrishna/Documents/Developement/traisys/frontend/src/pages/RoutesPage.jsx#33-410) model |
| `assignedDriver` | ObjectId | Reference to the `Driver` model |
| `currentLocation` | Object | Nested: lat, lng, speed, heading, lastUpdated |
| `fuelType` | Enum | diesel, petrol, electric, cng, hybrid |
| `isAC` | Boolean | Whether the bus is Air Conditioned |
| `odometer` | Number | Total distance traveled in km |

### 3.2 Driver Model ([Driver.js](file:///Users/devkrishna/Documents/Developement/traisys/backend/models/Driver.js))
Manages driver personnel details and their availability.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Full name of the driver |
| `employeeId` | String | Unique company ID |
| `phone` | String | Contact number |
| `email` | String | Official email address |
| `licenseNumber` | String | Commercial driving license number |
| `licenseExpiry` | Date | Expiration date of the license |
| `status` | Enum | available, on_duty, off_duty, on_leave |
| `experience` | Number | Years of driving experience |
| `joiningDate` | Date | Date of joining the organization |

### 3.3 Route Model ([Route.js](file:///Users/devkrishna/Documents/Developement/traisys/backend/models/Route.js))
Defines the path and stop sequences for bus lines.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Descriptive name (e.g., Alambagh - Hazratganj) |
| `routeNumber` | String | Short code (e.g., LKO-01) |
| `color` | String | Hex color code for map display |
| `stops` | Array | Objects containing: `stop` (Ref), `sequence`, `arrivalOffset` |
| `path` | Array | List of Lat/Lng coordinates for the map polyline |
| `distance` | Number | Total route length in km |
| `estimatedDuration`| Number | Total estimated time in minutes |
| `frequency` | Number | Minutes between consecutive buses |

### 3.4 Stop Model ([Stop.js](file:///Users/devkrishna/Documents/Developement/traisys/backend/models/Stop.js))
Geographical points representing bus stops or stations.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Name of the stop (e.g., Charbagh Station) |
| `code` | String | 3-letter uppercase code (e.g., CHB) |
| `location` | Object | lat, lng coordinates |
| `isActive` | Boolean | Whether the stop is currently operational |
| `facilities` | Object | hasShelter, hasSeating, isAccessible |

### 3.5 Log Models (Analytics)
- **`MovementLog`**: High-frequency storage of location pings for historical path replay.
- **`StopLog`**: Records exactly when a bus arrived at and departed from a specific stop.
- **`SignalLog`**: Tracks delays caused at traffic signals (Signal ID, stop time, start time).

---

## 4. Third-Party APIs & Integrations

### 4.1 OSRM (Open Source Routing Machine)
Used for the **"Auto-Road Path"** feature in the Route Designer. 
- **Endpoint**: `https://router.project-osrm.org/route/v1/driving/`
- **Purpose**: When an admin selects multiple stops, the system queries OSRM to find the actual road distance and path coordinates, shifting from straight-line approximations to real-world driving paths.

### 4.2 OpenStreetMap (OSM)
- **Service**: Used via Leaflet as the map tile provider (`tile.openstreetmap.org`).
- **Purpose**: Provides free, high-quality geographical map tiles without the cost and privacy concerns of proprietary services.

---

## 5. Frontend Architecture & Pages

### 5.1 Dashboard ([Dashboard.jsx](file:///Users/devkrishna/Documents/Developement/traisys/frontend/src/pages/Dashboard.jsx))
The command center of the application.
- Displays key KPIs: Total Buses, Active Routes, Online Drivers, and Stops.
- Provides a summary of fleet health and operational status.

### 5.2 Real-time Map ([MapPage.jsx](file:///Users/devkrishna/Documents/Developement/traisys/frontend/src/pages/MapPage.jsx))
- Integrates `FleetMap` component.
- Shows live positions of all active buses.
- Differentiates buses by route color and status.
- Interactive tooltips showing ETA to the next stop.

### 5.3 Route Designer ([RoutesPage.jsx](file:///Users/devkrishna/Documents/Developement/traisys/frontend/src/pages/RoutesPage.jsx))
A powerful tool for network planning.
- **Manual Mode**: Draw path points manually on the map.
- **Auto-Road Mode**: Uses OSRM to snap points to real streets.
- **Stop Sequencing**: Drag and drop stops to reorder the route flow.
- **Visualization**: Preview the route color and flow immediately on the designer map.

### 5.4 Management Pages
- **Buses**: List, search, add, edit, or delete vehicles.
- **Drivers**: Manage driver profiles and shift statuses.
- **Stops**: Define new transit points with precise coordinates.

---

## 6. Key Features Deep Dive

### 6.1 Real-time ETA Calculation
The system calculates ETA based on the bus's current location relative to the route polyline and the `arrivalOffset` defined in the Route model. It adjusts for current speed and historical traffic patterns logged in the `StopLog` and `SignalLog`.

### 6.2 Asset Customization
Admins can customize the visual representation of routes. Each route can have a unique color, which reflects across the map, tables, and bus icons, making it easy to distinguish between overlapping transit lines.

### 6.3 Performance Logging
Every major event (reaching a stop, sitting at a red light, moving between coordinates) is logged. This data is critical for:
- Auditing driver behavior.
- Identifying bottlenecks in the city's traffic flow.
- Optimizing route frequency during peak hours.

---

## 7. Developer Guide & Setup

### Local Installation
1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd traisys
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create .env with MONGO_URI and PORT
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Seed Database**:
   ```bash
   cd backend
   npm run seed
   ```

### Environment Variables
- `PORT`: Server port (default 5000).
- `MONGO_URI`: Connection string for MongoDB.
- `NODE_ENV`: development or production.

---

## 8. Future Roadmap
- **Passenger App**: A dedicated interface for riders to see bus arrivals in real-time.
- **AI Analytics**: Predictive arrival times based on machine learning models trained on historical log data.
- **Automated Alerts**: Email and SMS notifications for maintenance due dates or significant delays.
- **Revenue Management**: Integration with ticketing and smart card systems.

---
**TrAIsys Documentation | Version 1.0.0**  
*Compiled by Antigravity AI*
