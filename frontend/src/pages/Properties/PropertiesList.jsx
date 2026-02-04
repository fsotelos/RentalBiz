import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { propertyService } from '../../services/api'

const PropertiesList = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    fetchProperties()
  }, [pagination.page, filters])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const response = await propertyService.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      })
      setProperties(response.data.data.properties)
      setPagination(prev => ({
        ...prev,
        ...response.data.data.pagination
      }))
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0)
  }

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-green-100 text-green-700',
      rented: 'bg-blue-100 text-blue-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-700'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  const getTypeLabel = (type) => {
    const labels = {
      apartment: 'Apartamento',
      house: 'Casa',
      warehouse: 'Bodega'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propiedades</h1>
          <p className="text-gray-500">Gestiona tus propiedades</p>
        </div>
        <Link to="/properties/new" className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Propiedad
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar..."
            className="input"
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="input"
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Todos los tipos</option>
            <option value="apartment">Apartamento</option>
            <option value="house">Casa</option>
            <option value="warehouse">Bodega</option>
          </select>
          <select
            className="input"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="rented">Rentada</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
          <input
            type="text"
            placeholder="Ciudad..."
            className="input"
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay propiedades</h3>
          <p className="text-gray-500 mb-4">Agrega tu primera propiedad para comenzar</p>
          <Link to="/properties/new" className="btn btn-primary">
            Agregar Propiedad
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Link key={property.id} to={`/properties/${property.id}`} className="card hover:shadow-lg transition-shadow">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{property.name}</h3>
                  <p className="text-sm text-gray-500">{property.address}</p>
                  <p className="text-sm text-gray-500">{property.city}, {property.state}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(property.status)}`}>
                  {property.status === 'available' ? 'Disponible' : property.status === 'rented' ? 'Rentada' : property.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(property.monthly_rent)}
                  <span className="text-sm font-normal text-gray-500">/mes</span>
                </span>
                <span className="text-sm text-gray-500">{getTypeLabel(property.type)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-600">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="btn btn-secondary disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

export default PropertiesList
