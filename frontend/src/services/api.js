import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Variable para controlar si ya hay una renovación en proceso
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores y renovar token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si el error es 401 y no hemos intentado renovar ya
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya hay una renovación en proceso, encolar esta petición
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          throw new Error('No token available')
        }

        // Intentar renovar el token
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const newToken = response.data.data.token
        localStorage.setItem('token', newToken)
        
        // Actualizar el token en el header de la petición original
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        
        processQueue(null, newToken)
        isRefreshing = false

        // Reintentar la petición original con el nuevo token
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        
        // Si falla la renovación, cerrar sesión
        localStorage.removeItem('token')
        window.location.href = '/login'
        
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api

// API Services
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify')
}

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getTenants: (params) => api.get('/users', { params: { ...params, role: 'tenant' } })
}

export const propertyService = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  getStats: () => api.get('/properties/stats')
}

export const contractService = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  updateStatus: (id, data) => api.put(`/contracts/${id}/status`, data),
  terminate: (id, data) => api.post(`/contracts/${id}/terminate`, data),
  getExpiring: (params) => api.get('/contracts/expiring', { params })
}

export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  markAsPaid: (id, data) => api.put(`/payments/${id}/pay`, data),
  getPending: () => api.get('/payments/pending'),
  getOverdue: () => api.get('/payments/overdue'),
  getSummary: (params) => api.get('/payments/summary', { params }),
  generateRecurring: (data) => api.post('/payments/generate-recurring', data),
  
  // Payment Approval Workflow
  submitForApproval: (id, data) => api.put(`/payments/${id}/submit`, data),
  approvePayment: (id, data) => api.put(`/payments/${id}/approve`, data),
  rejectPayment: (id, data) => api.put(`/payments/${id}/reject`, data),
  resubmitPayment: (id, data) => api.post(`/payments/${id}/resubmit`, data),
  getPendingApprovals: (params) => api.get('/payments/pending-approvals', { params }),
  getMySubmissions: (params) => api.get('/payments/my-submissions', { params }),
  getApprovalHistory: (id) => api.get(`/payments/${id}/approval-history`)
}

export const auditLogService = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getById: (id) => api.get(`/audit-logs/${id}`),
  getPaymentLogs: (paymentId) => api.get(`/audit-logs/payment/${paymentId}`),
  getContractLogs: (contractId) => api.get(`/audit-logs/contract/${contractId}`),
  getStats: (params) => api.get('/audit-logs/stats', { params }),
  export: (params) => api.get('/audit-logs/export', { params, responseType: 'blob' })
}

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (data) => api.put('/notifications/settings', data),
  getDashboard: () => api.get('/notifications/dashboard'),
  sendReminders: (data) => api.post('/notifications/send-reminders', data)
}
