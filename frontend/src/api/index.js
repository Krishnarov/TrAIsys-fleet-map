import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10000,
})

api.interceptors.response.use(
    res => res.data,
    err => {
        const msg = err.response?.data?.message || err.message || 'Something went wrong'
        return Promise.reject(new Error(msg))
    }
)

// ── Buses ──────────────────────────────────────────────
export const busAPI = {
    getAll: (params) => api.get('/buses', { params }),
    getLocations: () => api.get('/buses/locations'),
    getById: (id) => api.get(`/buses/${id}`),
    create: (data) => api.post('/buses', data),
    update: (id, data) => api.put(`/buses/${id}`, data),
    delete: (id) => api.delete(`/buses/${id}`),
    assignRoute: (id, routeId) => api.patch(`/buses/${id}/assign-route`, { routeId }),
    assignDriver: (id, driverId) => api.patch(`/buses/${id}/assign-driver`, { driverId }),
    updateLocation: (id, loc) => api.patch(`/buses/${id}/location`, loc),
}

// ── Routes ─────────────────────────────────────────────
export const routeAPI = {
    getAll: (params) => api.get('/routes', { params }),
    getById: (id) => api.get(`/routes/${id}`),
    create: (data) => api.post('/routes', data),
    update: (id, data) => api.put(`/routes/${id}`, data),
    delete: (id) => api.delete(`/routes/${id}`),
    addStop: (id, data) => api.patch(`/routes/${id}/stops`, data),
}

// ── Stops ──────────────────────────────────────────────
export const stopAPI = {
    getAll: (params) => api.get('/stops', { params }),
    getById: (id) => api.get(`/stops/${id}`),
    create: (data) => api.post('/stops', data),
    update: (id, data) => api.put(`/stops/${id}`, data),
    delete: (id) => api.delete(`/stops/${id}`),
}

// ── Drivers ────────────────────────────────────────────
export const driverAPI = {
    getAll: (params) => api.get('/drivers', { params }),
    getById: (id) => api.get(`/drivers/${id}`),
    create: (data) => api.post('/drivers', data),
    update: (id, data) => api.put(`/drivers/${id}`, data),
    delete: (id) => api.delete(`/drivers/${id}`),
    updateStatus: (id, status) => api.patch(`/drivers/${id}/status`, { status }),
}