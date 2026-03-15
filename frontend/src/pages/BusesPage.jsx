import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Bus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { busAPI, routeAPI, driverAPI } from '../api'

const EMPTY = {
    busNumber: '', registrationNumber: '', model: '', manufacturer: '',
    capacity: '', type: 'standard', status: 'idle', fuelType: 'diesel',
    manufactureYear: '', isAC: false, hasWifi: false, odometer: '',
    assignedRoute: '', assignedDriver: '',
}

const STATUS_BADGE = {
    active: 'badge-green',
    idle: 'badge-gray',
    maintenance: 'badge-amber',
    out_of_service: 'badge-red',
}

const TYPE_LABEL = { standard: 'Standard', articulated: 'Articulated', minibus: 'Minibus', electric: 'Electric', ac: 'AC' }

export default function BusesPage() {
    const [buses, setBuses] = useState([])
    const [routes, setRoutes] = useState([])
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)

    const fetchAll = async () => {
        try {
            const [b, r, d] = await Promise.all([busAPI.getAll(), routeAPI.getAll(), driverAPI.getAll()])
            setBuses(b.data || [])
            setRoutes(r.data || [])
            setDrivers(d.data || [])
        } catch (e) { toast.error(e.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
    const openEdit = (bus) => {
        setEditing(bus)
        setForm({
            ...bus,
            assignedRoute: bus.assignedRoute?._id || '',
            assignedDriver: bus.assignedDriver?._id || '',
            capacity: bus.capacity?.toString() || '',
            odometer: bus.odometer?.toString() || '',
            manufactureYear: bus.manufactureYear?.toString() || '',
        })
        setModal(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = {
                ...form,
                capacity: Number(form.capacity),
                odometer: Number(form.odometer) || 0,
                manufactureYear: Number(form.manufactureYear) || undefined,
                assignedRoute: form.assignedRoute || null,
                assignedDriver: form.assignedDriver || null,
            }
            if (editing) {
                await busAPI.update(editing._id, payload)
                toast.success('Bus updated')
            } else {
                await busAPI.create(payload)
                toast.success('Bus created')
            }
            setModal(false)
            fetchAll()
        } catch (e) { toast.error(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this bus?')) return
        try {
            await busAPI.delete(id)
            toast.success('Bus deleted')
            fetchAll()
        } catch (e) { toast.error(e.message) }
    }

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

    const filtered = buses.filter(b =>
        b.busNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.model?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page-body">
            <div className="page-header">
                <div>
                    <div className="page-title">Buses</div>
                    <div className="page-subtitle">{buses.length} total vehicles</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Bus</button>
            </div>

            {/* Search */}
            <div className="search-bar" style={{ maxWidth: 340, marginBottom: 18 }}>
                <Search size={14} color="var(--text-muted)" />
                <input placeholder="Search by number, reg, model..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="loading-box"><div className="spinner" /></div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Bus No.</th>
                                <th>Registration</th>
                                <th>Model</th>
                                <th>Type</th>
                                <th>Capacity</th>
                                <th>Status</th>
                                <th>Route</th>
                                <th>Driver</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No buses found</td></tr>
                            ) : filtered.map(bus => (
                                <tr key={bus._id}>
                                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', fontWeight: 600 }}>{bus.busNumber}</span></td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{bus.registrationNumber}</td>
                                    <td>{bus.model || '—'}</td>
                                    <td><span className={`badge badge-gray`}>{TYPE_LABEL[bus.type]}</span></td>
                                    <td>{bus.capacity}</td>
                                    <td><span className={`badge badge-dot ${STATUS_BADGE[bus.status]}`}>{bus.status.replace('_', ' ')}</span></td>
                                    <td>
                                        {bus.assignedRoute
                                            ? <span style={{ color: bus.assignedRoute.color, fontWeight: 600, fontSize: 12 }}>{bus.assignedRoute.routeNumber}</span>
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td>{bus.assignedDriver?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(bus)}><Pencil size={12} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bus._id)}><Trash2 size={12} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Bus' : 'Add Bus'}</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Bus Number *</label>
                                    <input className="form-control" value={form.busNumber} onChange={f('busNumber')} placeholder="LKO-BUS-001" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Registration No. *</label>
                                    <input className="form-control" value={form.registrationNumber} onChange={f('registrationNumber')} placeholder="UP32-AB-1001" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input className="form-control" value={form.model} onChange={f('model')} placeholder="Tata Starbus Ultra" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manufacturer</label>
                                    <input className="form-control" value={form.manufacturer} onChange={f('manufacturer')} placeholder="Tata Motors" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Capacity *</label>
                                    <input className="form-control" type="number" value={form.capacity} onChange={f('capacity')} placeholder="52" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-control" value={form.type} onChange={f('type')}>
                                        {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-control" value={form.status} onChange={f('status')}>
                                        <option value="active">Active</option>
                                        <option value="idle">Idle</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="out_of_service">Out of Service</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fuel Type</label>
                                    <select className="form-control" value={form.fuelType} onChange={f('fuelType')}>
                                        {['diesel', 'petrol', 'electric', 'cng', 'hybrid'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manufacture Year</label>
                                    <input className="form-control" type="number" value={form.manufactureYear} onChange={f('manufactureYear')} placeholder="2022" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Odometer (km)</label>
                                    <input className="form-control" type="number" value={form.odometer} onChange={f('odometer')} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign Route</label>
                                    <select className="form-control" value={form.assignedRoute} onChange={f('assignedRoute')}>
                                        <option value="">— None —</option>
                                        {routes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign Driver</label>
                                    <select className="form-control" value={form.assignedDriver} onChange={f('assignedDriver')}>
                                        <option value="">— None —</option>
                                        {drivers.map(d => <option key={d._id} value={d._id}>{d.name} ({d.employeeId})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={form.isAC} onChange={f('isAC')} /> AC Bus
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={form.hasWifi} onChange={f('hasWifi')} /> WiFi
                                </label>
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
        </div>
    )
}