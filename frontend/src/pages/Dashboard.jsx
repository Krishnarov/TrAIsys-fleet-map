import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bus, Route, MapPin, Users, Activity, ArrowRight } from 'lucide-react'
import { busAPI, routeAPI, stopAPI, driverAPI } from '../api'
import FleetMap from '../components/map/FleetMap'

function StatCard({ icon: Icon, label, value, sub, color, to }) {
    return (
        <Link to={to} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{
                borderTop: `3px solid ${color}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'pointer',
            }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div className="stat-label">{label}</div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={color} />
                    </div>
                </div>
                <div className="stat-value" style={{ color }}>{value}</div>
                {sub && <div className="stat-sub">{sub}</div>}
            </div>
        </Link>
    )
}

export default function Dashboard() {
    const [stats, setStats] = useState({ buses: 0, routes: 0, stops: 0, drivers: 0, activeBuses: 0, availableDrivers: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            busAPI.getAll(),
            routeAPI.getAll(),
            stopAPI.getAll(),
            driverAPI.getAll(),
        ]).then(([b, r, s, d]) => {
            const buses = b.data || []
            const drivers = d.data || []
            setStats({
                buses: buses.length,
                routes: (r.data || []).length,
                stops: (s.data || []).length,
                drivers: drivers.length,
                activeBuses: buses.filter(x => x.status === 'active').length,
                availableDrivers: drivers.filter(x => x.status === 'available').length,
            })
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    return (
        <div className="page-body">
            <div className="page-header">
                <div>
                    <div className="page-title">Dashboard</div>
                    <div className="page-subtitle">TrAIsys - Intelligent Transportation System Overview</div>
                </div>
                <Link to="/map" className="btn btn-primary">
                    <Activity size={15} /> Live Map <ArrowRight size={14} />
                </Link>
            </div>

            {loading ? (
                <div className="loading-box"><div className="spinner" /></div>
            ) : (
                <>
                    <div className="stats-grid">
                        <StatCard icon={Bus} label="Total Buses" value={stats.buses} sub={`${stats.activeBuses} active`} color="var(--teal)" to="/buses" />
                        <StatCard icon={Route} label="Routes" value={stats.routes} sub="Active routes" color="var(--blue-light)" to="/routes" />
                        <StatCard icon={MapPin} label="Stops" value={stats.stops} sub="Bus stop locations" color="var(--orange-light)" to="/stops" />
                        <StatCard icon={Users} label="Drivers" value={stats.drivers} sub={`${stats.availableDrivers} available`} color="#CE93D8" to="/drivers" />
                    </div>

                    {/* Mini map */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={15} color="var(--teal)" />
                            <span style={{ fontWeight: 600 }}>Live Fleet Map</span>
                            <Link to="/map" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--teal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                Full map <ArrowRight size={12} />
                            </Link>
                        </div>
                        <FleetMap height="420px" />
                    </div>
                </>
            )}
        </div>
    )
}