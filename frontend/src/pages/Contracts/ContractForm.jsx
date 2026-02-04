import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { contractService, propertyService, userService } from '../../services/api'

const ContractForm = () => {
  const { id } = useParams()  // Get contract ID from URL
  const navigate = useNavigate()
  const isEdit = Boolean(id)  // Check if we're editing
  const [formData, setFormData] = useState({
    property_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    payment_frequency: 'monthly',
    payment_day: 1,
    terms_conditions: '',
    special_conditions: ''
  })
  const [properties, setProperties] = useState([])
  const [filteredProperties, setFilteredProperties] = useState([])
  const [propertySearch, setPropertySearch] = useState('')
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false)
  const [tenants, setTenants] = useState([])
  const [filteredTenants, setFilteredTenants] = useState([])
  const [tenantSearch, setTenantSearch] = useState('')
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cargar propiedades al montar el componente
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await propertyService.getAll()
        console.log('Propiedades cargadas:', response.data)
        
        // Manejar diferentes formatos de respuesta de la API
        let propertyList = []
        if (response.data && response.data.data) {
          // Formato con paginación: { data: { properties: [...] } }
          if (response.data.data.properties) {
            propertyList = response.data.data.properties
          } 
          // Formato sin paginación: { data: [...] }
          else if (Array.isArray(response.data.data)) {
            propertyList = response.data.data
          }
        } 
        // Formato directo: { data: [...] }
        else if (response.data && Array.isArray(response.data)) {
          propertyList = response.data
        }

        if (propertyList.length > 0) {
          console.log('Se cargaron', propertyList.length, 'propiedades')
          setProperties(propertyList)
          setFilteredProperties(propertyList)
        } else {
          console.warn('No hay propiedades disponibles. Por favor crea una propiedad primero.')
          setProperties([])
          setFilteredProperties([])
        }
      } catch (err) {
        console.error('Error al cargar propiedades:', err)
        setProperties([])
        setFilteredProperties([])
      }
    }
    fetchProperties()
  }, [])

  // Cargar inquilinos al montar el componente
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        // Obtener inquilinos desde la API
        const response = await userService.getTenants()
        console.log('Inquilinos cargados:', response.data)
        if (response.data && response.data.data && response.data.data.length > 0) {
          setTenants(response.data.data)
          setFilteredTenants(response.data.data)
        } else if (response.data && response.data.length > 0) {
          setTenants(response.data)
          setFilteredTenants(response.data)
        } else {
          console.warn('No hay inquilinos disponibles. Por favor registra un inquilino primero.')
          setTenants([])
          setFilteredTenants([])
        }
      } catch (err) {
        console.error('Error al cargar inquilinos:', err)
        setTenants([])
        setFilteredTenants([])
      }
    }
    fetchTenants()
  }, [])

  // Cargar contrato existente si estamos editando
  useEffect(() => {
    if (!id) return
    
    const fetchContract = async () => {
      setLoading(true)
      try {
        const response = await contractService.getById(id)
        // Handle different response formats
        const contractData = response.data?.data?.contract || response.data?.data || response.data
        console.log('Contrato cargado:', contractData)
        
        if (!contractData) {
          throw new Error('No se encontró el contrato')
        }
        
        // Formatear fechas para input date
        const startDate = contractData.start_date ? new Date(contractData.start_date).toISOString().split('T')[0] : ''
        const endDate = contractData.end_date ? new Date(contractData.end_date).toISOString().split('T')[0] : ''
        
        // Usar los datos de la propiedad e inquilino incluidos en el contrato si están disponibles
        const propertyFromContract = contractData.property
        const tenantFromContract = contractData.tenant
        
        setFormData({
          property_id: contractData.property_id || '',
          tenant_id: contractData.tenant_id || '',
          start_date: startDate,
          end_date: endDate,
          monthly_rent: contractData.monthly_rent || '',
          security_deposit: contractData.security_deposit || '',
          payment_frequency: contractData.payment_frequency || 'monthly',
          payment_day: contractData.payment_day || 1,
          terms_conditions: contractData.terms_conditions || '',
          special_conditions: contractData.special_conditions || ''
        })
        
        // Set search fields to show selected property/tenant names
        if (propertyFromContract) {
          setPropertySearch(`${propertyFromContract.name} - ${propertyFromContract.address}`)
        } else if (properties.length > 0) {
          const property = properties.find(p => p.id === contractData.property_id)
          if (property) {
            setPropertySearch(`${property.name} - ${property.address}`)
          }
        }
        
        if (tenantFromContract) {
          const tenantName = tenantFromContract.name || `${tenantFromContract.first_name} ${tenantFromContract.last_name}`
          setTenantSearch(tenantName)
        } else if (tenants.length > 0) {
          const tenant = tenants.find(t => t.id === contractData.tenant_id)
          if (tenant) {
            setTenantSearch(tenant.name || `${tenant.first_name} ${tenant.last_name}`)
          }
        }
      } catch (err) {
        console.error('Error al cargar contrato:', err)
        setError('Error al cargar el contrato: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    // Esperar a que se carguen propiedades e inquilinos
    if (properties.length > 0 && tenants.length > 0) {
      fetchContract()
    } else {
      // Cargar propiedades e inquilinos primero si no están cargados
      const loadData = async () => {
        try {
          const [propsRes, tenantsRes] = await Promise.all([
            propertyService.getAll(),
            userService.getTenants()
          ])
          
          let propertyList = propsRes.data?.data?.properties || propsRes.data?.data || propsRes.data || []
          setProperties(propertyList)
          setFilteredProperties(propertyList)
          
          let tenantList = tenantsRes.data?.data || tenantsRes.data || []
          setTenants(tenantList)
          setFilteredTenants(tenantList)
          
          // Luego cargar el contrato
          await fetchContract()
        } catch (err) {
          console.error('Error al cargar datos:', err)
        }
      }
      loadData()
    }
  }, [id, properties.length, tenants.length])

  // Filtrar propiedades por nombre o dirección
  useEffect(() => {
    if (propertySearch.trim() === '') {
      setFilteredProperties(properties)
    } else {
      const filtered = properties.filter(property => 
        property.name?.toLowerCase().includes(propertySearch.toLowerCase()) ||
        property.address?.toLowerCase().includes(propertySearch.toLowerCase())
      )
      setFilteredProperties(filtered)
    }
  }, [propertySearch, properties])

  // Filtrar inquilinos por nombre
  useEffect(() => {
    if (tenantSearch.trim() === '') {
      setFilteredTenants(tenants)
    } else {
      const filtered = tenants.filter(tenant => 
        (tenant.name?.toLowerCase() || '').includes(tenantSearch.toLowerCase()) ||
        (tenant.email?.toLowerCase() || '').includes(tenantSearch.toLowerCase())
      )
      setFilteredTenants(filtered)
    }
  }, [tenantSearch, tenants])

  const handlePropertySelect = (property) => {
    setFormData({ 
      ...formData, 
      property_id: property.id,
      monthly_rent: property.monthly_rent || formData.monthly_rent
    })
    setPropertySearch(`${property.name} - ${property.address}`)
    setShowPropertyDropdown(false)
  }

  const handlePropertySearchChange = (e) => {
    setPropertySearch(e.target.value)
    setShowPropertyDropdown(true)
    if (!e.target.value) {
      setFormData({ ...formData, property_id: '', monthly_rent: '' })
    }
  }

  const handleTenantSelect = (tenant) => {
    setFormData({ ...formData, tenant_id: tenant.id })
    setTenantSearch(tenant.name || `${tenant.first_name} ${tenant.last_name}`)
    setShowTenantDropdown(false)
  }

  const handleTenantSearchChange = (e) => {
    setTenantSearch(e.target.value)
    setShowTenantDropdown(true)
    if (!e.target.value) {
      setFormData({ ...formData, tenant_id: '' })
    }
  }

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPropertyDropdown && !event.target.closest('.property-search-container')) {
        setShowPropertyDropdown(false)
      }
      if (showTenantDropdown && !event.target.closest('.tenant-search-container')) {
        setShowTenantDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPropertyDropdown, showTenantDropdown])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    // Validar que hay propiedades e inquilinos disponibles
    if (properties.length === 0) {
      setError('No hay propiedades disponibles. Por favor crea una propiedad primero.')
      setSaving(false)
      return
    }
    if (tenants.length === 0) {
      setError('No hay inquilinos disponibles. Por favor registra un inquilino primero.')
      setSaving(false)
      return
    }

    // Validar que se ha seleccionado una propiedad y un inquilino
    if (!formData.property_id) {
      setError('Por favor selecciona una propiedad.')
      setSaving(false)
      return
    }
    if (!formData.tenant_id) {
      setError('Por favor selecciona un inquilino.')
      setSaving(false)
      return
    }

    try {
      if (isEdit) {
        await contractService.update(id, formData)
        navigate('/contracts')
      } else {
        await contractService.create(formData)
        navigate('/contracts')
      }
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        // Mostrar errores de validación específicos
        const errorMessages = errorData.errors.map(e => `${e.field}: ${e.message}`).join('\n')
        setError(errorMessages)
      } else {
        setError(err.response?.data?.message || `Error al ${isEdit ? 'actualizar' : 'crear'} el contrato`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Link to="/contracts" className="text-gray-500 hover:text-gray-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Editar Contrato' : 'Nuevo Contrato'}</h1><p className="text-gray-500">{isEdit ? 'Modifica los datos del contrato' : 'Crea un nuevo contrato de arrendamiento'}</p></div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <React.Fragment>
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          <div className="card space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Información del Contrato</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative property-search-container">
                <label htmlFor="property_search" className="label">Propiedad</label>
                <input 
                  id="property_search" 
                  name="property_search" 
                  type="text" 
                  value={propertySearch} 
                  onChange={handlePropertySearchChange}
                  onFocus={() => setShowPropertyDropdown(true)}
                  className="input" 
                  placeholder="Buscar por nombre o dirección" 
                  autoComplete="off"
                  required 
                  disabled={isEdit}
                />
                {showPropertyDropdown && filteredProperties.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProperties.map(property => (
                      <div 
                        key={property.id}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handlePropertySelect(property)}
                      >
                        <div className="font-medium">{property.name}</div>
                        <div className="text-sm text-gray-500">{property.address}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative tenant-search-container">
                <label htmlFor="tenant_search" className="label">Inquilino</label>
                <input 
                  id="tenant_search" 
                  name="tenant_search" 
                  type="text" 
                  value={tenantSearch} 
                  onChange={handleTenantSearchChange}
                  onFocus={() => setShowTenantDropdown(true)}
                  className="input" 
                  placeholder="Buscar por nombre o email" 
                  autoComplete="off"
                  required
                  disabled={isEdit}
                />
                {showTenantDropdown && filteredTenants.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredTenants.map(tenant => {
                      const tenantName = tenant.name || `${tenant.first_name} ${tenant.last_name}`
                      return (
                        <div 
                          key={tenant.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTenantSelect(tenant)}
                        >
                          <div className="font-medium">{tenantName}</div>
                          <div className="text-sm text-gray-500">{tenant.email}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="start_date" className="label">Fecha de Inicio</label>
                <input 
                  id="start_date" 
                  name="start_date" 
                  type="date" 
                  value={formData.start_date} 
                  onChange={handleChange}
                  className="input" 
                  required 
                />
              </div>

              <div>
                <label htmlFor="end_date" className="label">Fecha de Fin</label>
                <input 
                  id="end_date" 
                  name="end_date" 
                  type="date" 
                  value={formData.end_date} 
                  onChange={handleChange}
                  className="input" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="monthly_rent" className="label">Renta Mensual ($)</label>
                <input 
                  id="monthly_rent" 
                  name="monthly_rent" 
                  type="number" 
                  value={formData.monthly_rent} 
                  onChange={handleChange}
                  className="input" 
                  min="0" 
                  step="0.01" 
                  required 
                />
              </div>

              <div>
                <label htmlFor="security_deposit" className="label">Depósito de Seguridad ($)</label>
                <input 
                  id="security_deposit" 
                  name="security_deposit" 
                  type="number" 
                  value={formData.security_deposit} 
                  onChange={handleChange}
                  className="input" 
                  min="0" 
                  step="0.01" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="payment_frequency" className="label">Frecuencia de Pago</label>
                <select 
                  id="payment_frequency" 
                  name="payment_frequency" 
                  value={formData.payment_frequency} 
                  onChange={handleChange}
                  className="input"
                >
                  <option value="monthly">Mensual</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="quarterly">Trimestral</option>
                </select>
              </div>

              <div>
                <label htmlFor="payment_day" className="label">Día de Pago (1-28)</label>
                <input 
                  id="payment_day" 
                  name="payment_day" 
                  type="number" 
                  value={formData.payment_day} 
                  onChange={handleChange}
                  className="input" 
                  min="1" 
                  max="28" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="card space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Términos y Condiciones</h2>
            
            <div>
              <label htmlFor="terms_conditions" className="label">Términos Generales</label>
              <textarea id="terms_conditions" name="terms_conditions" value={formData.terms_conditions} onChange={handleChange} className="input" rows={4} />
            </div>
            <div>
              <label htmlFor="special_conditions" className="label">Condiciones Especiales</label>
              <textarea id="special_conditions" name="special_conditions" value={formData.special_conditions} onChange={handleChange} className="input" rows={4} />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link to="/contracts" className="btn btn-secondary">Cancelar</Link>
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">{saving ? 'Guardando...' : isEdit ? 'Actualizar Contrato' : 'Crear Contrato'}</button>
          </div>
        </form>
        </React.Fragment>
      )}
    </div>
  )
}

export default ContractForm
