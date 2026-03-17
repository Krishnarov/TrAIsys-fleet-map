import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Map as MapIcon, ChevronUp, ChevronDown, X, Trash, Waypoints } from 'lucide-react'
import toast from 'react-hot-toast'
import { routeAPI, stopAPI } from '../api'
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const COLORS = ['#1D9E75', '#1565C0', '#E65100', '#6A1B9A', '#C62828', '#F9A825', '#00838F', '#2E7D32']

const EMPTY = {
    name: '', routeNumber: '', color: '#1D9E75', distance: '', estimatedDuration: '',
    frequency: '15', operatingHours: { start: '06:00', end: '22:00' }, isActive: true,
    stops: [], path: []
}

function PathEditor({ path, setPath }) {
    useMapEvents({
        click(e) {
            setPath([...path, { lat: e.latlng.lat, lng: e.latlng.lng }])
        }
    })
    return path.length > 1 ? <Polyline positions={path.map(p => [p.lat, p.lng])} color="red" weight={3} dashArray="5, 10" /> : null
}

export default function RoutesPage() {
    const [routes, setRoutes] = useState([])
    const [allStops, setAllStops] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('basic') // 'basic' or 'designer'

    const fetchAll = async () => {
        try {
            const [r, s] = await Promise.all([routeAPI.getAll(), stopAPI.getAll()])
            setRoutes(r.data || [])
            setAllStops(s.data || [])
        } catch (e) { toast.error(e.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setActiveTab('basic'); setModal(true) }
    const openEdit = (route) => {
        setEditing(route)
        setForm({
            ...route,
            distance: route.distance?.toString() || '',
            estimatedDuration: route.estimatedDuration?.toString() || '',
            frequency: route.frequency?.toString() || '15',
            stops: route.stops?.map(s => ({
                stop: s.stop?._id || s.stop,
                sequence: s.sequence,
                arrivalOffset: s.arrivalOffset
            })) || [],
            path: route.path || []
        })
        setActiveTab('basic')
        setModal(true)
    }

    const handleSave = async () => {
        if (!form.name || !form.routeNumber) return toast.error('Name and Route Number are required')
        setSaving(true)
        try {
            const payload = {
                ...form,
                distance: Number(form.distance) || 0,
                estimatedDuration: Number(form.estimatedDuration) || 0,
                frequency: Number(form.frequency) || 15,
                stops: form.stops.map((s, i) => ({ ...s, sequence: i + 1 }))
            }
            if (editing) {
                await routeAPI.update(editing._id, payload)
                toast.success('Route updated')
            } else {
                await routeAPI.create(payload)
                toast.success('Route created')
            }
            setModal(false); fetchAll()
        } catch (e) { toast.error(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this route?')) return
        try { await routeAPI.delete(id); toast.success('Route deleted'); fetchAll() }
        catch (e) { toast.error(e.message) }
    }

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

    const addStopToRoute = (stopId) => {
        if (form.stops.some(s => s.stop === stopId)) return toast.error('Stop already in route')
        const stop = allStops.find(s => s._id === stopId)
        setForm(p => ({
            ...p,
            stops: [...p.stops, { stop: stopId, sequence: p.stops.length + 1, arrivalOffset: 0 }]
        }))
    }

    const removeStopFromRoute = (index) => {
        setForm(p => ({
            ...p,
            stops: p.stops.filter((_, i) => i !== index)
        }))
    }

    const moveStop = (index, dir) => {
        if ((dir === -1 && index === 0) || (dir === 1 && index === form.stops.length - 1)) return
        const newStops = [...form.stops]
        const temp = newStops[index]
        newStops[index] = newStops[index + dir]
        newStops[index + dir] = temp
        setForm(p => ({ ...p, stops: newStops }))
    }

    const updateStopOffset = (index, val) => {
        const newStops = [...form.stops]
        newStops[index].arrivalOffset = Number(val)
        setForm(p => ({ ...p, stops: newStops }))
    }

    const generateRoadPath = async () => {
        if (form.stops.length < 2) return toast.error('Add at least 2 stops to generate a road path')
        
        const loadingToast = toast.loading('Calculating road path...')
        try {
            const stopsInOrder = form.stops.map(rs => allStops.find(s => s._id === rs.stop)).filter(Boolean)
            const coords = stopsInOrder.map(s => `${s.location.lng},${s.location.lat}`).join(';')
            
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson`
            const resp = await fetch(url)
            const data = await resp.json()
            
            if (data.code !== 'Ok') throw new Error('OSRM Error: ' + data.code)
            
            const route = data.routes[0]
            let newPath = route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
            
            // Safety cap: if still too many points, downsample to avoid Vercel 4.5MB limit
            if (newPath.length > 800) {
                const step = Math.ceil(newPath.length / 800);
                newPath = newPath.filter((_, i) => i % step === 0 || i === newPath.length - 1);
            }
            
            setForm(p => ({
                ...p,
                path: newPath,
                distance: (route.distance / 1000).toFixed(1), // convert metres to km
                estimatedDuration: Math.round(route.duration / 60) // convert seconds to minutes
            }))
            
            toast.success('Real road path generated!')
        } catch (e) {
            toast.error('Failed to generate path: ' + e.message)
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const filtered = routes.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.routeNumber.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page-body">
            <div className="page-header">
                <div>
                    <div className="page-title">Routes</div>
                    <div className="page-subtitle">{routes.length} total routes</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Route</button>
            </div>

            <div className="search-bar" style={{ maxWidth: 340, marginBottom: 18 }}>
                <Search size={14} color="var(--text-muted)" />
                <input placeholder="Search routes..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="loading-box"><div className="spinner" /></div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Route No.</th><th>Name</th><th>Stops</th>
                                <th>Distance</th><th>Duration</th><th>Frequency</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No routes found</td></tr>
                            ) : filtered.map(route => (
                                <tr key={route._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 12, height: 12, borderRadius: 2, background: route.color, flexShrink: 0 }} />
                                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: route.color }}>{route.routeNumber}</span>
                                        </div>
                                    </td>
                                    <td>{route.name}</td>
                                    <td>{route.stops?.length || 0}</td>
                                    <td>{route.distance} km</td>
                                    <td>{route.estimatedDuration} min</td>
                                    <td>Every {route.frequency} min</td>
                                    <td><span className={`badge badge-dot ${route.isActive ? 'badge-green' : 'badge-gray'}`}>{route.isActive ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(route)}><Pencil size={12} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(route._id)}><Trash2 size={12} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal" style={{ maxWidth: 900, width: '95%' }}>
                        <div className="modal-header">
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Route' : 'Add Route'} — {form.routeNumber || 'New'}</span>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className={`btn btn-sm ${activeTab === 'basic' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('basic')}>Basic Info</button>
                                <button className={`btn btn-sm ${activeTab === 'designer' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('designer')}>Designer</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
                            </div>
                        </div>

                        <div className="modal-body" style={{ minHeight: 450 }}>
                            {activeTab === 'basic' ? (
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Route Number *</label>
                                        <input className="form-control" value={form.routeNumber} onChange={f('routeNumber')} placeholder="LKO-01" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Route Color</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input type="color" value={form.color} onChange={f('color')}
                                                style={{ width: 38, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 2 }} />
                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                {COLORS.map(c => (
                                                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                                                        style={{ width: 20, height: 20, borderRadius: 4, background: c, cursor: 'pointer', border: form.color === c ? '2px solid white' : '2px solid transparent' }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Route Name *</label>
                                        <input className="form-control" value={form.name} onChange={f('name')} placeholder="Alambagh - Hazratganj - Gomti Nagar" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Distance (km)</label>
                                        <input className="form-control" type="number" value={form.distance} onChange={f('distance')} placeholder="18.5" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Duration (min)</label>
                                        <input className="form-control" type="number" value={form.estimatedDuration} onChange={f('estimatedDuration')} placeholder="55" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Frequency (min)</label>
                                        <input className="form-control" type="number" value={form.frequency} onChange={f('frequency')} placeholder="15" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-control" value={form.isActive ? 'true' : 'false'}
                                            onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Start Time</label>
                                        <input className="form-control" type="time" value={form.operatingHours?.start}
                                            onChange={e => setForm(p => ({ ...p, operatingHours: { ...p.operatingHours, start: e.target.value } }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Time</label>
                                        <input className="form-control" type="time" value={form.operatingHours?.end}
                                            onChange={e => setForm(p => ({ ...p, operatingHours: { ...p.operatingHours, end: e.target.value } }))} />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, height: 500 }}>
                                    {/* Sidebar: Stops Management */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15, borderRight: '1px solid var(--border-color)', paddingRight: 20 }}>
                                        <div>
                                            <label className="form-label">Add Stop to Route</label>
                                            <select className="form-control" onChange={(e) => { e.target.value && addStopToRoute(e.target.value); e.target.value = '' }}>
                                                <option value="">— Select Stop —</option>
                                                {allStops.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                                            </select>
                                        </div>

                                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <label className="form-label">Sequence ({form.stops.length})</label>
                                            {form.stops.map((rs, i) => {
                                                const stop = allStops.find(s => s._id === rs.stop)
                                                return (
                                                    <div key={rs.stop} style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                                                            <div style={{ fontSize: 12, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stop?.name || 'Loading...'}</div>
                                                            <div style={{ display: 'flex', gap: 2 }}>
                                                                <button onClick={() => moveStop(i, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronUp size={14}/></button>
                                                                <button onClick={() => moveStop(i, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronDown size={14}/></button>
                                                                <button onClick={() => removeStopFromRoute(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}><X size={14}/></button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Offset (min):</span>
                                                            <input type="number" className="form-control" style={{ height: 22, fontSize: 11, padding: '2px 5px' }} value={rs.arrivalOffset} onChange={(e) => updateStopOffset(i, e.target.value)} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Main: Map & Path Editor */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label className="form-label">Draw Route Path ({form.path.length} points)</label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={generateRoadPath} title="Auto-generate path using real roads">
                                                    <Waypoints size={14} style={{ marginRight: 5 }} /> Auto-Road
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setForm(p => ({ ...p, path: p.path.slice(0, -1) }))} disabled={form.path.length === 0}>Undo</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => setForm(p => ({ ...p, path: [] }))} disabled={form.path.length === 0}><Trash size={12}/> Clear</button>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                                            <MapContainer
                                                center={[26.8467, 80.9462]}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                <PathEditor path={form.path} setPath={(p) => setForm(f => ({ ...f, path: p }))} />
                                                
                                                {/* Route stops as markers */}
                                                {form.stops.map((rs, i) => {
                                                    const stop = allStops.find(s => s._id === rs.stop)
                                                    if (!stop) return null
                                                    return (
                                                        <Marker key={stop._id} position={[stop.location.lat, stop.location.lng]}>
                                                            <Popup>
                                                                <div style={{ fontSize: 12 }}><b>{i + 1}. {stop.name}</b><br/>Code: {stop.code}</div>
                                                            </Popup>
                                                        </Marker>
                                                    )
                                                })}

                                                {/* Other stops as small circles */}
                                                {allStops.filter(s => !form.stops.some(rs => rs.stop === s._id)).map(s => (
                                                    <CircleMarker 
                                                        key={`all-${s._id}`} 
                                                        center={[s.location.lat, s.location.lng]} 
                                                        radius={5} 
                                                        fillOpacity={1} 
                                                        pathOptions={{ color: '#aaa', fillColor: 'white', weight: 2 }}
                                                        eventHandlers={{ click: () => addStopToRoute(s._id) }}
                                                    >
                                                        <Popup>{s.name} (Click to add to route)</Popup>
                                                    </CircleMarker>
                                                ))}

                                                {/* Concrete path as polyline */}
                                                {form.path.length > 1 && (
                                                    <Polyline 
                                                        positions={form.path.map(p => [p.lat, p.lng])} 
                                                        pathOptions={{ color: form.color, weight: 6, opacity: 0.8 }} 
                                                    />
                                                )}
                                            </MapContainer>
                                            <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: 6, fontSize: 11 }}>
                                                Click on map to draw route path points. Click on gray stops to add them.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : (editing ? 'Update Route' : 'Create Route')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}