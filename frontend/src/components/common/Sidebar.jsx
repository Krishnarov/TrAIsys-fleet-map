import { NavLink } from 'react-router-dom'
import { Bus, Map, Route, MapPin, Users, LayoutDashboard } from 'lucide-react'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/map', icon: Map, label: 'Live Map' },
    { to: '/buses', icon: Bus, label: 'Buses' },
    { to: '/routes', icon: Route, label: 'Routes' },
    { to: '/stops', icon: MapPin, label: 'Stops' },
    { to: '/drivers', icon: Users, label: 'Drivers' },
]

export default function Sidebar() {
    return (
        <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: 'var(--sidebar-w)',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            zIndex: 100,
        }}>
            {/* Logo */}
            <div style={{
                padding: '18px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: 'var(--teal)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {/* <Bus size={18} color="#fff" /> */}
                    <img src="/logo.jpg" alt="Logo" style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        objectFit: 'cover',
                        flexShrink: 0,
                    }} />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.3px' }}>TrAIsys</div>
                    <div style={{ fontSize: 10, color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>Intelligent Transportation System</div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '6px 10px 10px' }}>
                    Navigation
                </div>
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: 2,
                            textDecoration: 'none',
                            fontSize: 13, fontWeight: 500,
                            color: isActive ? 'var(--teal-light)' : 'var(--text-secondary)',
                            background: isActive ? 'var(--teal-dim)' : 'transparent',
                            borderLeft: isActive ? '2px solid var(--teal)' : '2px solid transparent',
                            transition: 'all 0.15s',
                        })}
                    >
                        <Icon size={16} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div style={{
                padding: '14px 16px',
                borderTop: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-muted)',
            }}>
                <div>TRAISYS © 2025</div>
                <div style={{ color: 'var(--teal)', marginTop: 2 }}>v1.0.0</div>
            </div>
        </aside>
    )
}