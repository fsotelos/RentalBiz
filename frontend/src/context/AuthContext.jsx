import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Verificar token al cargar
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/verify')
          setUser(response.data.data.user)
        } catch (error) {
          console.error('Token inválido:', error)
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }

    verifyToken()
  }, [token])

  // Verificar expiración del token periódicamente y renovarlo si es necesario
  useEffect(() => {
    if (!token || !user) return

    const checkTokenExpiration = async () => {
      try {
        // Decodificar el token para ver cuándo expira
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3) return

        const payload = JSON.parse(atob(tokenParts[1]))
        const expirationTime = payload.exp * 1000 // Convertir a milisegundos
        const currentTime = Date.now()
        const timeUntilExpiry = expirationTime - currentTime

        // Si falta menos de 5 minutos para expirar, renovar el token
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log('Renovando token automáticamente...')
          const response = await api.post('/auth/refresh')
          const newToken = response.data.data.token
          localStorage.setItem('token', newToken)
          setToken(newToken)
        }
      } catch (error) {
        console.error('Error al verificar expiración del token:', error)
      }
    }

    // Verificar cada minuto
    const interval = setInterval(checkTokenExpiration, 60 * 1000)
    
    // Verificar inmediatamente al montar
    checkTokenExpiration()

    return () => clearInterval(interval)
  }, [token, user])

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, token } = response.data.data
      
      localStorage.setItem('token', token)
      setToken(token)
      setUser(user)
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión'
      return { success: false, message }
    }
  }, [])

  const register = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { user, token } = response.data.data
      
      localStorage.setItem('token', token)
      setToken(token)
      setUser(user)
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al registrar usuario'
      return { success: false, message }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData)
      setUser(response.data.data.user)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar perfil'
      return { success: false, message }
    }
  }, [])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isLandlord: user?.role === 'landlord',
    isTenant: user?.role === 'tenant',
    login,
    register,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
