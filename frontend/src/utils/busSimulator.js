// ─────────────────────────────────────────────────────────────────
//  Bus Simulator — smooth movement along route path with stop dwell
// ─────────────────────────────────────────────────────────────────

const R = 6371000 // Earth radius metres

function toRad(d) { return (d * Math.PI) / 180 }

// Haversine distance in metres
export function distanceM(a, b) {
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// Compass bearing a → b in degrees
export function bearing(a, b) {
    const dLng = toRad(b.lng - a.lng)
    const y = Math.sin(dLng) * Math.cos(toRad(b.lat))
    const x =
        Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
        Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng)
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Linear interpolate between two lat/lng points
export function lerp(a, b, t) {
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

// Build segment array with cumulative distances
function buildSegments(path) {
    const segs = []
    let total = 0
    for (let i = 0; i < path.length - 1; i++) {
        const d = distanceM(path[i], path[i + 1])
        segs.push({ from: path[i], to: path[i + 1], dist: d, cumDist: total })
        total += d
    }
    return { segs, total }
}

// Position + heading at a given distance along the path
export function posAtDist(segs, totalDist, d) {
    const clamped = Math.max(0, Math.min(d, totalDist))
    for (const seg of segs) {
        if (clamped <= seg.cumDist + seg.dist) {
            const t = seg.dist === 0 ? 0 : (clamped - seg.cumDist) / seg.dist
            return { pos: lerp(seg.from, seg.to, t), heading: bearing(seg.from, seg.to) }
        }
    }
    const last = segs[segs.length - 1]
    return { pos: last.to, heading: bearing(last.from, last.to) }
}

// Find the path-distance of a stop (nearest point on path, context-aware)
function stopPathDist(segs, stopLoc, refDist = null, totalDist = null) {
    let best = 0, bestD = Infinity
    let candidates = []

    segs.forEach(seg => {
        const d1 = distanceM(stopLoc, seg.from)
        candidates.push({ dist: seg.cumDist, error: d1 })
        
        const d2 = distanceM(stopLoc, seg.to)
        candidates.push({ dist: seg.cumDist + seg.dist, error: d2 })
    })

    // If no reference distance, just pick the absolute closest coordinate
    if (refDist === null) {
        candidates.sort((a, b) => a.error - b.error)
        return { pathDist: candidates[0].dist, minDist: candidates[0].error }
    }

    // Filter candidates that are reasonably close to the stop (within 150m)
    const validPoints = candidates.filter(c => c.error < 150)
    if (validPoints.length === 0) {
        // Fallback: search all
        candidates.sort((a, b) => a.error - b.error)
        return { pathDist: candidates[0].dist, minDist: candidates[0].error }
    }

    // Among valid points, pick the one that represents the least forward movement from refDist
    // We prefer the one that is "just ahead" or "at" our current position
    let bestPoint = validPoints[0]
    let minForwardJump = Infinity

    validPoints.forEach(p => {
        let diff = p.dist - refDist
        // If diff is negative, it's behind us. On a circular route, 
        // a negative diff might actually be a HUGE positive jump around the loop.
        if (diff < -50 && totalDist) diff += totalDist // Correct for wrap-around

        // We want the smallest non-negative jump (or slight rollback < 50m for snapping)
        if (diff >= -50 && diff < minForwardJump) {
            minForwardJump = diff
            bestPoint = p
        }
    })

    return { pathDist: bestPoint.dist, minDist: bestPoint.error }
}

// ETA for every stop from current position
function calcETAs(segs, totalDist, currentDist, stops, speedMs) {
    return stops.map(({ stop, sequence }) => {
        if (!stop?.location) return { stop, sequence, etaSec: null, distToStop: 9999, arrived: false }
        
        const { pathDist, minDist } = stopPathDist(segs, stop.location, currentDist, totalDist)
        let remaining = pathDist - currentDist
        
        let agoSec = 0
        const isPastLap = remaining < -80 // passed margins
        if (remaining < 0) {
            agoSec = Math.round(Math.abs(remaining) / speedMs)
            remaining += totalDist // wrap-around for circular route
        }
        
        const arrived = minDist < 60
        const etaSec = arrived ? 0 : Math.round(remaining / speedMs)
        return { stop, sequence, etaSec, agoSec, isPast: isPastLap && !arrived, distToStop: Math.round(minDist), arrived }
    })
}

// ── Main BusSimulator class ───────────────────────────────────
export class BusSimulator {
    constructor({ busId, path, stops, speedKph = 28, startOffset = 0, onUpdate }) {
        this.busId = busId
        this.path = path
        this.stops = [...stops].sort((a, b) => a.sequence - b.sequence)
        this.speedMs = (speedKph * 1000) / 3600
        this.onUpdate = onUpdate

        const { segs, total } = buildSegments(path)
        this.segs = segs
        this.totalDist = total

        // Each bus starts at different point so they don't overlap
        this.currentDist = (startOffset * total) % total
        this.dwellRemain = 0
        this.dwellStopId = null
        this._timer = null
        this._lastDwell = null // prevent re-triggering same stop
        this.startTime = Date.now()

        // Traffic Signal Simulation
        this.signals = this._generateSignals(total)
        this.signalTimer = 0
        this.isAtRedSignal = false
    }

    _generateSignals(totalDist) {
        const sigs = []
        // Place a signal roughly every 1.5km
        const count = Math.max(2, Math.floor(totalDist / 1500))
        for (let i = 0; i < count; i++) {
            sigs.push({
                id: `sig-${i}`,
                dist: (0.15 + (i / count) * 0.8) * totalDist, // spread them out
                state: Math.random() > 0.5 ? 'green' : 'red',
                timer: 5 + Math.random() * 15 // seconds
            })
        }
        return sigs
    }

    start(tickMs = 800) {
        if (this._timer) return
        this._timer = setInterval(() => this._tick(tickMs / 1000), tickMs)
        this._emit()
    }

    stop() {
        clearInterval(this._timer)
        this._timer = null
    }

    setSpeed(speedKph) {
        this.speedMs = (speedKph * 1000) / 3600
    }

    _tick(dtSec) {
        // Count down dwell (at bus stops)
        if (this.dwellRemain > 0) {
            this.dwellRemain = Math.max(0, this.dwellRemain - dtSec)
            this._emit()
            return
        }

        // Update Traffic Signal States
        this.signalTimer += dtSec
        this.signals.forEach(sig => {
            sig.timer -= dtSec
            if (sig.timer <= 0) {
                sig.state = sig.state === 'green' ? 'red' : 'green'
                sig.timer = sig.state === 'red' ? 12 : 20 
            }
        })

        // Check if we are currently at a red signal zone
        this.isAtRedSignal = false
        for (const sig of this.signals) {
            const dToSig = sig.dist - this.currentDist
            // Stop if signal is red and we are within 15 meters of it
            if (sig.state === 'red' && dToSig > -5 && dToSig < 20) {
                this.isAtRedSignal = true
                break
            }
        }

        if (this.isAtRedSignal) {
            this._emit()
            return // Don't move if blocked by red signal
        }

        // Move forward only if not dwelling or at red signal
        this.currentDist += this.speedMs * dtSec
        if (this.currentDist >= this.totalDist) {
            this.currentDist = this.currentDist % this.totalDist
        }

        // Check proximity to stops
        const { pos } = posAtDist(this.segs, this.totalDist, this.currentDist)
        for (const { stop } of this.stops) {
            if (!stop?.location) continue
            const d = distanceM(pos, stop.location)
            if (d < 55 && this._lastDwell !== stop._id) {
                // Snap exactly to stop (using currentDist as reference to avoid jumping)
                const { pathDist } = stopPathDist(this.segs, stop.location, this.currentDist, this.totalDist)
                this.currentDist = pathDist
                this.dwellRemain = 18 + Math.random() * 22 // 18–40 sec dwell
                this.dwellStopId = stop._id
                this._lastDwell = stop._id
                break
            }
            // Reset last-dwell lock when we leave the stop's proximity
            if (this._lastDwell === stop._id && d > 150) {
                this._lastDwell = null
            }
        }

        if (this.dwellRemain === 0) this.dwellStopId = null

        this._emit()
    }

    _emit() {
        const { pos, heading } = posAtDist(this.segs, this.totalDist, this.currentDist)
        const etas = calcETAs(this.segs, this.totalDist, this.currentDist, this.stops, this.speedMs)
        const isDwelling = this.dwellRemain > 0

        this.onUpdate({
            busId: this.busId,
            position: pos,
            heading,
            speedKph: isDwelling ? 0 : Math.round(this.speedMs * 3.6 * (0.85 + Math.random() * 0.3)),
            isDwelling: isDwelling || this.isAtRedSignal,
            isAtRedSignal: this.isAtRedSignal,
            dwellStop: this.dwellStopId,
            dwellRemain: Math.ceil(this.dwellRemain),
            etas,
            progress: this.currentDist / this.totalDist,
            signals: this.signals
        })
    }
}