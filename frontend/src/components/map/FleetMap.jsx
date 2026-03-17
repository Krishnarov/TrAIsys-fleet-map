import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import axios from 'axios'
import {
    MapContainer, TileLayer, Polyline,
    CircleMarker, Marker, Popup, useMap, Circle, Tooltip
} from 'react-leaflet'
import { io } from 'socket.io-client'
import L from 'leaflet'
import { routeAPI, busAPI } from '../../api'
import { BusSimulator, distanceM, posAtDist } from '../../utils/busSimulator'
import { RefreshCw, Clock, Navigation, ChevronDown, ChevronUp } from 'lucide-react'

// Initialize socket outside component to prevent multiple connections
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5050', {
    transports: ['websocket', 'polling'], // allow fallback
    autoConnect: true,
    path: '/socket.io'
});

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

// ── Bus SVG icon ──────────────────────────────────────────────
function busIcon(color, isDwelling, heading = 0) {
    const pulse = isDwelling
        ? `<circle cx="21" cy="21" r="20" fill="${color}" opacity="0.25"><animate attributeName="r" values="18;26;18" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0;0.3" dur="1.2s" repeatCount="indefinite"/></circle>`
        : ''
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42" style="transform: rotate(${heading}deg); transition: transform 0.2s linear;">
    ${pulse}
    <circle cx="21" cy="21" r="17" fill="${color}" stroke="white" stroke-width="2.5"/>
    <rect x="12" y="13" width="18" height="12" rx="3" fill="white" fill-opacity="0.95"/>
    <rect x="13" y="14" width="7" height="6" rx="1.5" fill="${color}"/>
    <rect x="22" y="14" width="7" height="6" rx="1.5" fill="${color}"/>
    <circle cx="15" cy="28" r="2.3" fill="white" fill-opacity="0.9"/>
    <circle cx="27" cy="28" r="2.3" fill="white" fill-opacity="0.9"/>
    ${isDwelling ? `<rect x="17" y="24" width="8" height="3" rx="1" fill="white" fill-opacity="0.7"/>` : ''}
  </svg>`
    return L.divIcon({ html: svg, className: 'bus-marker-icon', iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -24] })
}

// ── Fit bounds on first load ──────────────────────────────────
function BoundsFitter({ routes }) {
    const map = useMap()
    const done = useRef(false)
    useEffect(() => {
        if (done.current || !routes.length) return
        const pts = routes.flatMap(r => (r.path || []).map(p => [p.lat, p.lng]))
        if (pts.length > 1) { map.fitBounds(pts, { padding: [40, 40] }); done.current = true }
    }, [routes, map])
    return null
}

// ── Format ETA ────────────────────────────────────────────────
function fmtETA(sec) {
    if (sec === null) return '—'
    if (sec < 60) return `${sec}s`
    return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

// ── Format Clock Time ─────────────────────────────────────────
function formatClockTime(secOffset, customBaseTime) {
    if (secOffset === null) return '—'
    const base = customBaseTime || Date.now()
    const d = new Date(base + secOffset * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── ETA sidebar panel ─────────────────────────────────────────
function ETAPanel({ buses, routes }) {
    const [selBus, setSelBus] = useState(null)
    const [minimized, setMinimized] = useState(false)

    useEffect(() => {
        if (buses.length > 0 && !selBus) {
            setSelBus(buses[0].busId)
        }
    }, [buses, selBus])

    const busState = buses.find(b => b.busId === selBus)
    const routeInfo = routes.find(r => r.buses?.some(b => b.busId === selBus))

    const nextBusesByStop = useMemo(() => {
        const map = {}
        buses.forEach(bus => {
            (bus.etas || []).forEach(eta => {
                if (!eta.stop?._id || eta.isPast) return
                const stopId = eta.stop._id
                if (!map[stopId]) map[stopId] = []
                map[stopId].push({
                    busId: bus.busId,
                    busNumber: bus.busNumber,
                    etaSec: eta.etaSec,
                    color: bus.color
                })
            })
        })
        Object.keys(map).forEach(stopId => map[stopId].sort((a, b) => a.etaSec - b.etaSec))
        return map
    }, [buses])

    return (
        <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1000,
            background: 'rgba(22,27,34,0.96)',
            border: '1px solid #374057',
            borderRadius: 10, width: 230,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            maxHeight: minimized ? '40px' : '85vh',
            transition: 'max-height 0.3s ease-in-out'
        }}>
            {/* Header */}
            <div style={{ 
                padding: '10px 14px', 
                borderBottom: minimized ? 'none' : '1px solid #2A3347', 
                background: '#0D1117',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
            }} onClick={() => setMinimized(!minimized)}>
                <div style={{ fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                    Select Bus
                </div>
                <div style={{ color: '#4A5568', display: 'flex', alignItems: 'center' }}>
                    {minimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
            </div>

            {!minimized && (
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #2A3347' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {buses.map(b => (
                            <button key={b.busId} onClick={(e) => { e.stopPropagation(); setSelBus(b.busId) }} style={{
                                padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                background: selBus === b.busId ? b.color : '#2A3347',
                                color: selBus === b.busId ? '#fff' : '#8B9AB0',
                                transition: 'all 0.15s',
                            }}>{b.busNumber}</button>
                        ))}
                    </div>
                </div>
            )}

            {!minimized && busState && (
                <>
                    {/* Bus status */}
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #2A3347' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: busState.isDwelling ? '#F9A825' : '#23C48E', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#E8EDF5' }}>{busState.busNumber}</span>
                            <span style={{ fontSize: 11, color: busState.isDwelling ? '#F9A825' : '#23C48E', marginLeft: 'auto' }}>
                                {busState.isDwelling ? `Stopped ${busState.dwellRemain}s` : `${busState.speedKph} km/h`}
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#8B9AB0' }}>
                            Route: <span style={{ color: busState.color, fontWeight: 600 }}>{busState.routeNumber}</span>
                        </div>
                        {busState.isDwelling && (
                            <div style={{ marginTop: 6, padding: '5px 8px', background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: 6, fontSize: 11, color: '#F9A825' }}>
                                At stop — departing in {busState.dwellRemain}s
                            </div>
                        )}
                    </div>

                    {/* ETA list */}
                    <div style={{ padding: '8px 0', maxHeight: 260, overflowY: 'auto' }}>
                        <div style={{ padding: '0 14px 6px', fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                            Stop ETAs
                        </div>
                        {(busState.etas || []).map((eta, i) => {
                            const isAt = eta.arrived && busState.isDwelling && busState.dwellStop === eta.stop?._id
                            const isPast = eta.isPast && !isAt
                            const otherBuses = (nextBusesByStop[eta.stop?._id] || []).filter(b => b.busId !== selBus)
                            const nextBus = otherBuses[0]

                            return (
                                <div key={eta.stop?._id || i} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 14px',
                                    background: isAt ? 'rgba(249,168,37,0.08)' : 'transparent',
                                    borderLeft: isAt ? '3px solid #F9A825' : '3px solid transparent',
                                    transition: 'all 0.2s',
                                    opacity: isPast ? 0.7 : 1,
                                }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isAt ? '#F9A825' : (isPast ? '#2A3347' : busState.color + '22'),
                                        border: `1.5px solid ${isAt ? '#F9A825' : (isPast ? '#374057' : busState.color)}`,
                                        fontSize: 10, fontWeight: 700,
                                        color: isAt ? '#000' : (isPast ? '#8B9AB0' : busState.color),
                                    }}>
                                        {eta.sequence}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: isPast ? '#8B9AB0' : '#E8EDF5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {eta.stop?.name || 'Unknown'} <span style={{ fontSize: 10, color: '#6A778B', fontWeight: 400 }}>({eta.stop?.code})</span>
                                        </div>
                                        <div style={{ fontSize: 10, color: '#8B9AB0', marginTop: 3 }}>
                                            {isPast ? <span style={{ color: '#8B9AB0' }}>Departed at {formatClockTime(-eta.agoSec, busState.startTime)}</span> : (
                                                isAt ? `Departs at ${formatClockTime(busState.dwellRemain)}` :
                                                    `Arr: ${formatClockTime(eta.etaSec, busState.startTime)} • Dep: ${formatClockTime(eta.etaSec + 30, busState.startTime)}`
                                            )}
                                        </div>
                                        {nextBus && (
                                            <div style={{ fontSize: 9, color: '#23C48E', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <Clock size={9} />
                                                Next bus: {fmtETA(nextBus.etaSec)} <span style={{ color: '#6A778B' }}>({nextBus.busNumber})</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: 11, fontWeight: 600, textAlign: 'right', flexShrink: 0,
                                        color: isAt ? '#F9A825' : (isPast ? '#8B9AB0' : (eta.etaSec < 120 ? '#23C48E' : '#E8EDF5')),
                                    }}>
                                        {isAt ? 'HERE' : (isPast ? `Left ${fmtETA(eta.agoSec)} ago` : `In ${fmtETA(eta.etaSec)}`)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

// ── Layer toggles ─────────────────────────────────────────────
function Toggle({ label, value, onChange }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', marginBottom: 6, userSelect: 'none' }}>
            <div onClick={onChange} style={{
                width: 28, height: 16, borderRadius: 8,
                background: value ? '#1D9E75' : '#2A3347',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
            }}>
                <div style={{ position: 'absolute', top: 2, left: value ? 12 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 11, color: '#E8EDF5', textTransform: 'capitalize' }}>{label}</span>
        </label>
    )
}

// ── Main FleetMap ─────────────────────────────────────────────
export default function FleetMap({ height = '500px' }) {
    const [routes, setRoutes] = useState([])
    const [busStates, setBusStates] = useState([])  // live sim data per bus
    const [loading, setLoading] = useState(true)
    const [layers, setLayers] = useState({ routes: true, stops: true, buses: true, geofence: true, signals: true, satellite: false })
    const [layersMinimized, setLayersMinimized] = useState(false)
    const [selectedCity, setSelectedCity] = useState('Lucknow')
    const [availableCities, setAvailableCities] = useState(['Lucknow'])
    const [logModal, setLogModal] = useState(null) // busId
    const [logs, setLogs] = useState([])
    const [logsLoading, setLogsLoading] = useState(false)
    const [globalSpeed, setGlobalSpeed] = useState(30)
    const [simRunning, setSimRunning] = useState(true)
    const speedRef = useRef(30)
    const simsRef = useRef([])  // BusSimulator instances
    const latestStatesRef = useRef({}) // Batched state ref to prevent infinite re-rendering

    const handleSpeedChange = (e) => {
        const speed = Number(e.target.value)
        setGlobalSpeed(speed)
        speedRef.current = speed
        simsRef.current.forEach(sim => sim.setSpeed(speed))
    }

    // ── Load routes + build simulators ───────────────────────────
    const load = useCallback(async () => {
        try {
            const [rResp, bResp] = await Promise.all([
                routeAPI.getAll({ isActive: true }),
                busAPI.getAll()
            ])

            const loadedRoutes = rResp.data || []
            const loadedBuses = bResp.data || []
            
            // Extract unique cities from routes
            const cities = new Set()
            loadedRoutes.forEach(r => {
                if (r.cities) r.cities.forEach(c => cities.add(c))
            })
            if (cities.size > 0) setAvailableCities(Array.from(cities))

            // Filter routes to selected city
            const cityRoutes = loadedRoutes.filter(r => r.cities?.includes(selectedCity))
            setRoutes(cityRoutes)

            // Stop old simulators
            simsRef.current.forEach(s => s.stop())
            simsRef.current = []
            latestStatesRef.current = {} // clear previous states

            const initialStates = []

            // Find buses that have a route assigned in the current city
            loadedBuses.forEach((bus, bi) => {
                const assignedRouteId = bus.assignedRoute?._id || bus.assignedRoute
                if (!assignedRouteId) return

                const route = cityRoutes.find(r => r._id === assignedRouteId)
                if (!route || !route.path?.length || !route.stops?.length) return

                // Spread out buses on the same route by giving them different offsets
                const routeBuses = loadedBuses.filter(b => (b.assignedRoute?._id || b.assignedRoute) === route._id)
                const busIndex = routeBuses.findIndex(b => b._id === bus._id)
                const offset = routeBuses.length > 1 ? (busIndex / routeBuses.length) : 0

                const sim = new BusSimulator({
                    busId: bus._id,
                    path: route.path,
                    stops: route.stops,
                    speedKph: speedRef.current,
                    startOffset: offset,
                    onUpdate: (state) => {
                        const newState = {
                            ...state,
                            busId: bus._id,
                            busNumber: bus.busNumber,
                            color: route.color,
                            routeNumber: route.routeNumber,
                            routeId: route._id,
                            startTime: sim.startTime,
                        }

                        latestStatesRef.current[bus._id] = newState

                        // Sync with backend for logging (throttled every 50 ticks to avoid API spam)
                        if (window._syncTicks === undefined) window._syncTicks = {}
                        if (!window._syncTicks[bus._id]) window._syncTicks[bus._id] = 0
                        window._syncTicks[bus._id]++

                        if (window._syncTicks[bus._id] % 50 === 0 || state.isAtRedSignal) {
                            const currentSignal = state.signals?.find(s => s.state === 'red' && Math.abs(s.dist - state.progress * sim.totalDist) < 30);
                            
                            if (socket.connected) {
                                socket.emit('bus-location-update', {
                                    busId: bus._id,
                                    lat: state.position.lat,
                                    lng: state.position.lng,
                                    speed: state.speedKph,
                                    heading: state.heading,
                                    isAtRedSignal: state.isAtRedSignal,
                                    signalId: currentSignal?.id || (state.isAtRedSignal ? 'active-signal' : null)
                                });
                            } else {
                                // Fallback to REST API if socket is down/not supported (e.g., Vercel)
                                busAPI.updateLocation(bus._id, {
                                    lat: state.position.lat,
                                    lng: state.position.lng,
                                    speed: state.speedKph,
                                    heading: state.heading,
                                    isAtRedSignal: state.isAtRedSignal,
                                    signalId: currentSignal?.id || (state.isAtRedSignal ? 'active-signal' : null)
                                }).catch(e => console.warn('Sync err (REST fallback):', e))
                            }
                        }
                    }
                })
                simsRef.current.push(sim)
                const initState = { busId: bus._id, busNumber: bus.busNumber, color: route.color, routeNumber: route.routeNumber, etas: [], startTime: sim.startTime }
                latestStatesRef.current[bus._id] = initState
                initialStates.push(initState)
                sim.start(100)
            })

            setBusStates(initialStates)
        } catch (e) {
            console.error('Map load error:', e.message)
        } finally {
            setLoading(false)
        }
    }, [selectedCity]) // reload map when city changes

    useEffect(() => {
        load()
        return () => simsRef.current.forEach(s => s.stop())
    }, [load])

    // Update the UI via a centralized render loop (e.g. at roughly 6 FPS)
    // This resolves the massive lag caused by firing independent re-renders for every bus update.
    useEffect(() => {
        const loop = setInterval(() => {
            setBusStates(Object.values(latestStatesRef.current))
        }, 150)
        return () => clearInterval(loop)
    }, [])

    const toggle = k => setLayers(p => ({ ...p, [k]: !p[k] }))

    const fetchLogs = async (bus) => {
        setLogModal(bus)
        setLogsLoading(true)
        try {
            const res = await axios.get(`/api/buses/${bus.busId}/logs`)
            setLogs(res.data.data || [])
        } catch (e) {
            console.error('Logs error:', e)
        } finally {
            setLogsLoading(false)
        }
    }

    // Deduplicate stops from all routes
    const stopList = []
    const seen = new Set()
    routes.forEach(r => {
        r.stops?.forEach(({ stop }) => {
            if (stop?._id && !seen.has(stop._id)) {
                seen.add(stop._id)
                stopList.push({ stop, color: r.color })
            }
        })
    })

    // Which stops have buses dwelling right now
    const dwellingAtStop = new Set(busStates.filter(b => b.isDwelling && b.dwellStop).map(b => b.dwellStop))

    const wrapStyle = {
        position: 'relative', width: '100%', height,
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid #2A3347', background: '#0D1117',
    }

    const mapStyle = {
        width: '100%', height: '100%',
    }

    if (loading) {
        return (
            <div style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#8B9AB0' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #2A3347', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 13 }}>Loading fleet…</span>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        )
    }

    return (
        <div style={wrapStyle}>
            <style>{`
                .bus-marker-icon {
                    transition: all 0.12s linear !important;
                }
                .leaflet-marker-icon {
                    outline: none !important;
                }
            `}</style>

            {/* Status bar */}
            <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 1000,
                background: 'rgba(22,27,34,0.95)', border: '1px solid #374057',
                borderRadius: 8, padding: '7px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#23C48E', display: 'inline-block', animation: 'blink 2s infinite' }} />
                <span style={{ fontSize: 12, color: '#8B9AB0' }}>
                    {busStates.length} buses · {routes.length} routes
                </span>
                <button
                    onClick={() => {
                        if (simRunning) {
                            simsRef.current.forEach(s => s.stop())
                            setSimRunning(false)
                        } else {
                            simsRef.current.forEach(s => s.start(100))
                            setSimRunning(true)
                        }
                    }}
                    style={{
                        background: simRunning ? 'rgba(249,168,37,0.15)' : 'rgba(35,196,142,0.15)',
                        border: `1px solid ${simRunning ? '#F9A825' : '#23C48E'}`,
                        borderRadius: 6, cursor: 'pointer',
                        color: simRunning ? '#F9A825' : '#23C48E',
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 10px',
                        display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all 0.15s',
                    }}
                >
                    {simRunning ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', display: 'flex', padding: 2 }}>
                    <RefreshCw size={12} />
                </button>
            </div>

            {/* City Selector */}
            <div style={{
                position: 'absolute', top: 12, left: 320, zIndex: 1000,
                background: 'rgba(22,27,34,0.95)', border: '1px solid #374057',
                borderRadius: 8, padding: '7px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ fontSize: 11, color: '#8B9AB0', fontWeight: 600, textTransform: 'uppercase' }}>City:</span>
                <select 
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    style={{
                        background: '#1C2230', border: '1px solid #374057', borderRadius: 4, 
                        color: '#E8EDF5', fontSize: 13, padding: '4px 8px', outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    {availableCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Layer controls */}
            <div style={{
                position: 'absolute', bottom: 16, left: 12, zIndex: 1000,
                background: 'rgba(22,27,34,0.95)', border: '1px solid #374057',
                borderRadius: 8, padding: layersMinimized ? '8px 12px' : '10px 14px',
                width: 200,
                transition: 'all 0.3s ease'
            }}>
                <div 
                    style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        cursor: 'pointer', marginBottom: layersMinimized ? 0 : 8 
                    }}
                    onClick={() => setLayersMinimized(!layersMinimized)}
                >
                    <div style={{ fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>Layers</div>
                    <div style={{ color: '#4A5568' }}>
                        {layersMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                </div>
                {!layersMinimized && (
                    <>
                        {Object.entries(layers).map(([k, v]) => <Toggle key={k} label={k} value={v} onChange={() => toggle(k)} />)}

                {/* Speed Control Slider */}
                <div style={{ height: 1, background: '#2A3347', margin: '8px 0' }} />
                <div style={{ fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontWeight: 600 }}>Sim Speed</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                        type="range"
                        min="5"
                        max="1000"
                        value={globalSpeed}
                        onChange={handleSpeedChange}
                        style={{ flex: 1, cursor: 'pointer', accentColor: '#1D9E75' }}
                    />
                    <span style={{ fontSize: 11, color: '#E8EDF5', width: 45, textAlign: 'right' }}>{globalSpeed} km/h</span>
                </div>

                        {/* Route legend */}
                        {routes.length > 0 && (
                            <>
                                <div style={{ height: 1, background: '#2A3347', margin: '8px 0' }} />
                                <div style={{ fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontWeight: 600 }}>Routes</div>
                                {routes.map(r => (
                                    <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                                        <div style={{ width: 20, height: 3, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 11, fontWeight: 600, color: r.color }}>{r.routeNumber}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ETA Panel */}
            <ETAPanel buses={busStates} routes={routes} />

            <MapContainer
                center={[26.8467, 80.9462]}
                zoom={12}
                zoomControl={true}
                attributionControl={false}
                style={mapStyle}
            >
                {layers.satellite ? (
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                ) : (
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
                )}
                <BoundsFitter routes={routes} />

                {/* Route polylines */}
                {layers.routes && routes.map(r =>
                    r.path?.length > 1 ? (
                        <Polyline key={r._id}
                            positions={r.path.map(p => [p.lat, p.lng])}
                            pathOptions={{ color: r.color, weight: 5, opacity: 0.75, lineCap: 'round', lineJoin: 'round' }}
                        />
                    ) : null
                )}

                {/* Stop markers */}
                {layers.geofence && stopList.map(({ stop, color }) => (
                    <Circle
                        key={`geo-${stop._id}`}
                        center={[stop.location.lat, stop.location.lng]}
                        radius={20}
                        pathOptions={{ 
                            color: '#F9A825', 
                            fillColor: '#F9A825', 
                            fillOpacity: 0.1, 
                            weight: 1, 
                            dashArray: '3 3' 
                        }}
                    />
                ))}

                {layers.stops && stopList.map(({ stop, color }) => {
                    const hasBus = dwellingAtStop.has(stop._id)
                    const stopBuses = busStates.map(bus => {
                        const eta = bus.etas?.find(e => e.stop?._id === stop._id)
                        if (!eta) return null
                        const isAt = eta.arrived && bus.isDwelling && bus.dwellStop === stop._id
                        const isPast = eta.isPast && !isAt

                        // Only show past buses if they left in the last 5 minutes
                        if (isPast && eta.agoSec > 300) return null

                        return {
                            busNumber: bus.busNumber,
                            color: bus.color,
                            etaSec: eta.etaSec,
                            agoSec: eta.agoSec,
                            isAt,
                            isPast,
                            dwellRemain: bus.dwellRemain
                        }
                    }).filter(Boolean)
                        .sort((a, b) => (a.isPast ? 1000 + a.agoSec : a.etaSec) - (b.isPast ? 1000 + b.agoSec : b.etaSec))

                    return (
                        <CircleMarker
                            key={stop._id}
                            center={[stop.location.lat, stop.location.lng]}
                            radius={hasBus ? 10 : 7}
                            pathOptions={{
                                color: hasBus ? '#F9A825' : color,
                                fillColor: hasBus ? '#F9A82533' : '#1C2230',
                                fillOpacity: 1,
                                weight: hasBus ? 3 : 2,
                            }}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'sans-serif', minWidth: 180 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: hasBus ? '#F9A825' : '#111' }}>
                                        {hasBus && '🚌 '}{stop.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#666' }}>
                                        Code: <b style={{ color }}>{stop.code}</b>
                                    </div>
                                    {stop.address && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{stop.address}</div>}

                                    {stopBuses.length > 0 && (
                                        <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 6 }}>
                                            <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Bus Activities</div>
                                            {stopBuses.map(b => (
                                                <div key={b.busNumber} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5, alignItems: 'flex-start', opacity: b.isPast ? 0.6 : 1 }}>
                                                    <span style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, display: 'inline-block' }} />
                                                        <b style={{ color: b.isPast ? '#666' : '#333' }}>{b.busNumber}</b>
                                                    </span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <b style={{ color: b.isAt ? '#E65100' : (b.isPast ? '#666' : '#1D9E75') }}>
                                                            {b.isAt ? `Departs in ${b.dwellRemain}s` : (b.isPast ? `Left ${fmtETA(b.agoSec)} ago` : `Arrives in ${fmtETA(b.etaSec)}`)}
                                                        </b>
                                                        <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>
                                                            {b.isPast ? `Dep: ${formatClockTime(-b.agoSec)}` : `Arr: ${formatClockTime(b.etaSec)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Popup>

                            {/* Persistent tooltip showing next bus ETA without clicking */}
                            {/* {!hasBus && stopBuses.some(b => !b.isPast) && (
                                <Tooltip permanent direction="bottom" offset={[0, 8]} className="eta-map-tooltip">
                                    <span style={{ color: stopBuses.find(b => !b.isPast).color, fontWeight: 700 }}>
                                        Arrives in {fmtETA(stopBuses.find(b => !b.isPast).etaSec)}
                                    </span>
                                </Tooltip>
                            )} */}
                        </CircleMarker>
                    )
                })}

                {/* Pulse rings on stops where bus is dwelling */}
                {layers.stops && stopList.map(({ stop }) => {
                    if (!dwellingAtStop.has(stop._id)) return null
                    return (
                        <Circle
                            key={`pulse-${stop._id}`}
                            center={[stop.location.lat, stop.location.lng]}
                            radius={40}
                            pathOptions={{ color: '#F9A825', fillColor: '#F9A825', fillOpacity: 0.15, weight: 1.5 }}
                        />
                    )
                })}

                {/* Traffic Signals */}
                {layers.signals && busStates.map(bus => (bus.signals || []).map(sig => {
                    const sim = simsRef.current.find(s => s.busId === bus.busId)
                    if (!sim || !sim.segs) return null
                    
                    const { pos } = posAtDist(sim.segs, sim.totalDist, sig.dist)
                    if (!pos || isNaN(pos.lat) || isNaN(pos.lng)) return null

                    return (
                        <CircleMarker
                            key={`${bus.busId}-${sig.id}`}
                            center={[pos.lat, pos.lng]}
                            radius={5}
                            pathOptions={{ 
                                color: sig.state === 'red' ? '#FF5252' : '#4CAF50',
                                fillColor: sig.state === 'red' ? '#FF5252' : '#4CAF50',
                                fillOpacity: 0.9,
                                weight: 2
                            }}
                        >
                            <Tooltip direction="top" opacity={0.9}>Signal: {sig.state.toUpperCase()}</Tooltip>
                        </CircleMarker>
                    )
                }))}

                {/* Bus markers */}
                {layers.buses && busStates.map(bus =>
                    bus.position?.lat && bus.position?.lng ? (
                        <Marker
                            key={bus.busId}
                            position={[bus.position.lat, bus.position.lng]}
                            icon={busIcon(bus.color, bus.isDwelling, bus.heading)}
                            zIndexOffset={bus.isDwelling ? 100 : 200}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'sans-serif', minWidth: 200 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: bus.color, display: 'inline-block' }} />
                                        <b style={{ fontSize: 14 }}>{bus.busNumber}</b>
                                        <span style={{ marginLeft: 'auto', fontSize: 11, color: bus.isAtRedSignal ? '#FF5252' : (bus.isDwelling ? '#E65100' : '#1D9E75'), fontWeight: 600 }}>
                                            {bus.isAtRedSignal ? '🛑 Red Signal' : (bus.isDwelling ? `Stopped ${bus.dwellRemain}s` : `${bus.speedKph} km/h`)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
                                        <div>Route: <b style={{ color: bus.color }}>{bus.routeNumber}</b></div>
                                        <div>Status: <b>{bus.isDwelling ? 'At Stop' : 'Moving'}</b></div>
                                    </div>
                                    <div style={{ marginTop: 10, textAlign: 'center' }}>
                                        <button 
                                            onClick={() => fetchLogs(bus)}
                                            style={{ 
                                                width: '100%', padding: '6px', 
                                                background: '#f5f5f5', border: '1px solid #ddd', 
                                                borderRadius: 6, fontSize: 11, cursor: 'pointer',
                                                fontWeight: 600, color: '#444'
                                            }}
                                        >
                                            View Dwell History
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null
                )}
            </MapContainer>

            {/* Logs Modal */}
            {logModal && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 380, maxHeight: '80%', background: '#0D1117', border: '1px solid #374057',
                    borderRadius: 12, zIndex: 2000, boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '15px 20px', borderBottom: '1px solid #2A3347', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Dwell History: {logModal.busNumber}</div>
                            <div style={{ fontSize: 10, color: '#8B9AB0', marginTop: 2 }}>Automatic geofence detection (20m radius)</div>
                        </div>
                        <button onClick={() => setLogModal(null)} style={{ background: 'none', border: 'none', color: '#8B9AB0', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                        {logsLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#8B9AB0', fontSize: 12 }}>Loading logs...</div>
                        ) : logs.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#8B9AB0', fontSize: 12 }}>No stay history found for this bus yet.</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} style={{ padding: '10px 20px', borderBottom: '1px solid #1C2230', display: 'flex', gap: 12 }}>
                                    <div style={{ width: 4, background: '#F9A825', borderRadius: 2 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#E8EDF5' }}>{log.stop?.name || 'Unknown Stop'}</div>
                                        <div style={{ fontSize: 11, color: '#8B9AB0', marginTop: 4 }}>
                                            Stayed for <b style={{ color: '#F9A825' }}>{log.duration ? `${log.duration}s` : 'In progress...'}</b>
                                        </div>
                                        <div style={{ fontSize: 10, color: '#4A5568', marginTop: 4 }}>
                                            In: {new Date(log.arrivalTime).toLocaleString()}
                                            {log.departureTime && ` • Out: ${new Date(log.departureTime).toLocaleTimeString()}`}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #2A3347', background: '#0D1117', borderRadius: '0 0 12px 12px' }}>
                        <button onClick={() => setLogModal(null)} style={{ width: '100%', padding: '8px', background: '#2A3347', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close History</button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .leaflet-container { background: #1a2332 !important; }
        .leaflet-tile { filter: brightness(0.82) saturate(0.85); }
        .leaflet-popup-content-wrapper { background: #fff !important; border-radius: 8px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }
        .leaflet-popup-tip { background: #fff !important; }
        .leaflet-control-zoom a { background: #1C2230 !important; color: #E8EDF5 !important; border-color: #374057 !important; }
        .leaflet-control-zoom a:hover { background: #232B3E !important; }
        .leaflet-control-attribution { display: none !important; }
        .eta-map-tooltip { background: rgba(28, 34, 48, 0.9) !important; border: 1px solid #374057 !important; border-radius: 4px !important; padding: 2px 5px !important; font-size: 10px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.5) !important; }
        .eta-map-tooltip::before { display: none !important; }
      `}</style>
        </div>
    )
}