import FleetMap from '../components/map/FleetMap'

export default function MapPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <div style={{
                height: 'var(--header-h)',
                padding: '0 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-secondary)',
                flexShrink: 0,
            }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#23C48E' }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Live Fleet Map</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>— Real-time bus tracking · Lucknow network</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <FleetMap height="100%" />
            </div>
        </div>
    )
}