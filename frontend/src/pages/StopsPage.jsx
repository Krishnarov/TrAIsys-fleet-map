import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { stopAPI } from '../api'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

function MapPicker({ position, onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng)
        },
    })
    return position.lat && position.lng ? <Marker position={[position.lat, position.lng]} /> : null
}

const EMPTY = {
    name: '', code: '', address: '', isActive: true,
    location: { lat: '', lng: '' },
    facilities: { hasShelter: false, hasSeating: false, isAccessible: false },
}

export default function StopsPage() {
    const [stops, setStops] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)

    const fetchAll = async () => {
        try { const r = await stopAPI.getAll(); setStops(r.data || []) }
        catch (e) { toast.error(e.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
    const openEdit = (stop) => {
        setEditing(stop)
        setForm({ ...stop, location: { lat: stop.location.lat.toString(), lng: stop.location.lng.toString() } })
        setModal(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = {
                ...form,
                location: { lat: Number(form.location.lat), lng: Number(form.location.lng) },
            }
            if (editing) { await stopAPI.update(editing._id, payload); toast.success('Stop updated') }
            else { await stopAPI.create(payload); toast.success('Stop created') }
            setModal(false); fetchAll()
        } catch (e) { toast.error(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this stop?')) return
        try { await stopAPI.delete(id); toast.success('Stop deleted'); fetchAll() }
        catch (e) { toast.error(e.message) }
    }

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
    const fl = (k) => (e) => setForm(p => ({ ...p, location: { ...p.location, [k]: e.target.value } }))
    const ff = (k) => (e) => setForm(p => ({ ...p, facilities: { ...p.facilities, [k]: e.target.checked } }))

    const filtered = stops.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page-body">
            <div className="page-header">
                <div>
                    <div className="page-title">Stops</div>
                    <div className="page-subtitle">{stops.length} bus stop locations</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Stop</button>
            </div>

            <div className="search-bar" style={{ maxWidth: 340, marginBottom: 18 }}>
                <Search size={14} color="var(--text-muted)" />
                <input placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="loading-box"><div className="spinner" /></div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Code</th><th>Name</th><th>Coordinates</th><th>Address</th><th>Facilities</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No stops found</td></tr>
                            ) : filtered.map(stop => (
                                <tr key={stop._id}>
                                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange-light)', fontWeight: 700 }}>{stop.code}</span></td>
                                    <td style={{ fontWeight: 500 }}>{stop.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                                        {stop.location.lat.toFixed(4)}, {stop.location.lng.toFixed(4)}
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stop.address || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {stop.facilities?.hasShelter && <span className="badge badge-blue badge-sm" style={{ fontSize: 10 }}>Shelter</span>}
                                            {stop.facilities?.hasSeating && <span className="badge badge-gray badge-sm" style={{ fontSize: 10 }}>Seating</span>}
                                            {stop.facilities?.isAccessible && <span className="badge badge-green badge-sm" style={{ fontSize: 10 }}>Accessible</span>}
                                        </div>
                                    </td>
                                    <td><span className={`badge badge-dot ${stop.isActive ? 'badge-green' : 'badge-gray'}`}>{stop.isActive ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(stop)}><Pencil size={12} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(stop._id)}><Trash2 size={12} /></button>
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
                    <div className="modal">
                        <div className="modal-header">
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Stop' : 'Add Stop'}</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Stop Name *</label>
                                    <input className="form-control" value={form.name} onChange={f('name')} placeholder="Hazratganj" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stop Code *</label>
                                    <input className="form-control" value={form.code} onChange={f('code')} placeholder="HZG" style={{ textTransform: 'uppercase' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Latitude *</label>
                                    <input className="form-control" type="number" step="0.0001" value={form.location.lat} onChange={fl('lat')} placeholder="26.8557" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Longitude *</label>
                                    <input className="form-control" type="number" step="0.0001" value={form.location.lng} onChange={fl('lng')} placeholder="80.9466" />
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Pick Location from Map</label>
                                    <div style={{ height: 260, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
                                        <MapContainer
                                            center={[form.location.lat ? Number(form.location.lat) : 26.8467, form.location.lng ? Number(form.location.lng) : 80.9462]}
                                            zoom={13}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <MapPicker
                                                position={{ lat: Number(form.location.lat), lng: Number(form.location.lng) }}
                                                onPick={(latlng) => setForm(p => ({ ...p, location: { lat: latlng.lat.toFixed(6), lng: latlng.lng.toFixed(6) } }))}
                                            />
                                        </MapContainer>
                                    </div>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Click on the map to set coordinates automatically.</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <input className="form-control" value={form.address} onChange={f('address')} placeholder="Hazratganj, Lucknow" />
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
                                <label className="form-label">Facilities</label>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    {[ ['hasShelter', 'Shelter'], ['hasSeating', 'Seating'], ['isAccessible', 'Accessible'] ].map(([k, l]) => (
                                        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                            <input type="checkbox" checked={form.facilities?.[k] || false} onChange={ff(k)} /> {l}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                .modal {
                    max-width: 600px;
                    width: 95%;
                }
                .leaflet-container {
                    cursor: crosshair;
                }
            `}</style>
        </div>
    )
}