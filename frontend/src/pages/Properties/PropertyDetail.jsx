import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { propertyService } from '../../services/api'

const PropertyDetail = () => {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await propertyService.getById(id)
        setProperty(response.data.data.property)
      } catch (error) {
        console.error('Error fetching property:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProperty()
  }, [id])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Propiedad no encontrada</h2>
        <Link to="/properties" className="btn btn-primary mt-4">
          Volver a propiedades
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/properties" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500">{property.address}, {property.city}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link to={`/properties/${id}/edit`} className="btn btn-secondary">
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg mb-6 flex items-center justify-center h-64">
              <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h2>
            <p className="text-gray-600">{property.description || 'Sin descripción'}</p>
          </div>

          {property.contracts && property.contracts.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contratos Activos</h2>
              <div className="space-y-3">
                {property.contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{contract.contract_number}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Link to={`/contracts/${contract.id}`} className="text-primary-600 hover:text-primary-700">
                      Ver detalles
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipo</dt>
                <dd className="font-medium text-gray-900 capitalize">{property.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Habitaciones</dt>
                <dd className="font-medium text-gray-900">{property.bedrooms || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Baños</dt>
                <dd className="font-medium text-gray-900">{property.bathrooms || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Área</dt>
                <dd className="font-medium text-gray-900">{property.area_sqft ? `${property.area_sqft} ft²` : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Estacionamiento</dt>
                <dd className="font-medium text-gray-900">{property.parking_spaces || 0}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Precio</h2>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">
                {formatCurrency(property.monthly_rent)}
              </p>
              <p className="text-gray-500">por mes</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Propietario</h2>
            {property.owner && (
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {property.owner.first_name[0]}{property.owner.last_name[0]}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">
                    {property.owner.first_name} {property.owner.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{property.owner.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetail
