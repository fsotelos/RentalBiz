import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { propertyService } from '../../services/api'

const PropertyForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    type: 'apartment',
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    bedrooms: '',
    bathrooms: '',
    area_sqft: '',
    monthly_rent: '',
    status: 'available'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEditing) {
      const fetchProperty = async () => {
        try {
          setLoading(true)
          const response = await propertyService.getById(id)
          const property = response.data.data.property
          setFormData({
            type: property.type,
            name: property.name,
            description: property.description || '',
            address: property.address,
            city: property.city,
            state: property.state,
            zip_code: property.zip_code || '',
            bedrooms: property.bedrooms || '',
            bathrooms: property.bathrooms || '',
            area_sqft: property.area_sqft || '',
            monthly_rent: property.monthly_rent,
            status: property.status
          })
        } catch (error) {
          setError('Error al cargar la propiedad')
        } finally {
          setLoading(false)
        }
      }
      fetchProperty()
    }
  }, [id, isEditing])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const data = {
        type: formData.type,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        monthly_rent: parseFloat(formData.monthly_rent),
        status: formData.status
      }

      // Only add optional fields if they have values
      if (formData.description) data.description = formData.description
      if (formData.zip_code) data.zip_code = formData.zip_code
      if (formData.bedrooms) data.bedrooms = parseInt(formData.bedrooms)
      if (formData.bathrooms) data.bathrooms = parseFloat(formData.bathrooms)
      if (formData.area_sqft) data.area_sqft = parseFloat(formData.area_sqft)

      if (isEditing) {
        await propertyService.update(id, data)
      } else {
        await propertyService.create(data)
      }

      navigate('/properties')
    } catch (error) {
      setError(error.response?.data?.message || 'Error al guardar la propiedad')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Link to="/properties" className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </h1>
          <p className="text-gray-500">
            {isEditing ? 'Actualiza los datos de tu propiedad' : 'Agrega una nueva propiedad'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Información Básica</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="type" className="label">Tipo de propiedad</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="apartment">Apartamento</option>
                <option value="house">Casa</option>
                <option value="warehouse">Bodega</option>
              </select>
            </div>

            <div>
              <label htmlFor="name" className="label">Nombre</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Apartamento Centro"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="label">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input"
              rows={4}
              placeholder="Describe tu propiedad..."
            />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Ubicación</h2>
          
          <div>
            <label htmlFor="address" className="label">Dirección</label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="city" className="label">Ciudad</label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="state" className="label">Estado</label>
              <input
                id="state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="zip_code" className="label">Código Postal</label>
              <input
                id="zip_code"
                name="zip_code"
                type="text"
                value={formData.zip_code}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Características</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="bedrooms" className="label">Habitaciones</label>
              <input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="bathrooms" className="label">Baños</label>
              <input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                step="0.5"
                value={formData.bathrooms}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="area_sqft" className="label">Área (ft²)</label>
              <input
                id="area_sqft"
                name="area_sqft"
                type="number"
                min="0"
                value={formData.area_sqft}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="status" className="label">Estado</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="available">Disponible</option>
                <option value="rented">Rentada</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Precio</h2>
          
          <div>
            <label htmlFor="monthly_rent" className="label">Renta Mensual (MXN)</label>
            <input
              id="monthly_rent"
              name="monthly_rent"
              type="number"
              min="0"
              step="0.01"
              value={formData.monthly_rent}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link to="/properties" className="btn btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Propiedad'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PropertyForm
