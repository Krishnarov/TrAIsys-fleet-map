import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { driverAPI } from '../api'

const EMPTY = {
    name: '', employeeId: '', phone: '', email: '', licenseNumber: '',
    licenseExpiry: '', status: 'available', experience: '', address: '',
    emergencyContact: { name: '', phone: '' },
}

const STATUS_BADGE = {
    available: 'badge-green',
    on_duty: 'badge-blue',
    off_duty: 'badge-gray',
    on_leave: 'badge-amber',
}

export default function DriversPage() {
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)

    const fetchAll = async () => {
        try { const r = await driverAPI.getAll(); setDrivers(r.data || []) }
        catch (e) { toast.error(e.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
    const openEdit = (d) => {
        setEditing(d)
        setForm({
            ...d,
            experience: d.experience?.toString() || '',
            licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
            emergencyContact: d.emergencyContact || { name: '', phone: '' },
        })
        setModal(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = { ...form, experience: Number(form.experience) || 0 }
            if (editing) { await driverAPI.update(editing._id, payload); toast.success('Driver updated') }
            else { await driverAPI.create(payload); toast.success('Driver created') }
            setModal(false); fetchAll()
        } catch (e) { toast.error(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this driver?')) return
        try { await driverAPI.delete(id); toast.success('Driver deleted'); fetchAll() }
        catch (e) { toast.error(e.message) }
    }

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
    const fe = (k) => (e) => setForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [k]: e.target.value } }))

    const isExpiringSoon = (dateStr) => {
        if (!dateStr) return false
        const diff = new Date(dateStr) - new Date()
        return diff < 90 * 24 * 60 * 60 * 1000 && diff > 0
    }

    const filtered = drivers.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        d.phone.includes(search)
    )

    return (
        <div className="page-body">
            <div className="page-header">
                <div>
                    <div className="page-title">Drivers</div>
                    <div className="page-subtitle">{drivers.length} total drivers</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Driver</button>
            </div>

            <div className="search-bar" style={{ maxWidth: 340, marginBottom: 18 }}>
                <Search size={14} color="var(--text-muted)" />
                <input placeholder="Search by name, ID or phone..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="loading-box"><div className="spinner" /></div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Employee ID</th><th>Name</th><th>Phone</th><th>License</th><th>Expiry</th><th>Experience</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No drivers found</td></tr>
                            ) : filtered.map(drv => (
                                <tr key={drv._id}>
                                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)', fontWeight: 600 }}>{drv.employeeId}</span></td>
                                    <td style={{ fontWeight: 500 }}>{drv.name}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{drv.phone}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{drv.licenseNumber}</td>
                                    <td>
                                        <span style={{ color: isExpiringSoon(drv.licenseExpiry) ? 'var(--amber)' : 'var(--text-secondary)', fontSize: 12 }}>
                                            {drv.licenseExpiry ? new Date(drv.licenseExpiry).toLocaleDateString('en-IN') : '—'}
                                            {isExpiringSoon(drv.licenseExpiry) && ' ⚠️'}
                                        </span>
                                    </td>
                                    <td>{drv.experience} yrs</td>
                                    <td><span className={`badge badge-dot ${STATUS_BADGE[drv.status]}`}>{drv.status.replace('_', ' ')}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(drv)}><Pencil size={12} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(drv._id)}><Trash2 size={12} /></button>
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
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Driver' : 'Add Driver'}</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" value={form.name} onChange={f('name')} placeholder="Ramesh Kumar" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Employee ID *</label>
                                    <input className="form-control" value={form.employeeId} onChange={f('employeeId')} placeholder="DRV001" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone *</label>
                                    <input className="form-control" value={form.phone} onChange={f('phone')} placeholder="9876543210" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" type="email" value={form.email} onChange={f('email')} placeholder="driver@traisys.in" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">License Number *</label>
                                    <input className="form-control" value={form.licenseNumber} onChange={f('licenseNumber')} placeholder="UP32-20180012" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">License Expiry *</label>
                                    <input className="form-control" type="date" value={form.licenseExpiry} onChange={f('licenseExpiry')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Experience (years)</label>
                                    <input className="form-control" type="number" value={form.experience} onChange={f('experience')} placeholder="5" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-control" value={form.status} onChange={f('status')}>
                                        <option value="available">Available</option>
                                        <option value="on_duty">On Duty</option>
                                        <option value="off_duty">Off Duty</option>
                                        <option value="on_leave">On Leave</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <input className="form-control" value={form.address} onChange={f('address')} placeholder="Lucknow, UP" />
                            </div>
                            <div className="divider" />
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emergency Contact</div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input className="form-control" value={form.emergencyContact?.name || ''} onChange={fe('name')} placeholder="Contact name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-control" value={form.emergencyContact?.phone || ''} onChange={fe('phone')} placeholder="Emergency phone" />
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
        </div>
    )
}