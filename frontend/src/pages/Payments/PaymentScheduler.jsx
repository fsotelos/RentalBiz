import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { contractService, paymentSchedulerService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const PaymentScheduler = () => {
  const { user } = useAuth()
  const isLandlord = user?.role === 'landlord'
  
  // Contracts state
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState(null)
  const [loadingContracts, setLoadingContracts] = useState(true)
  
  // Schedule status state
  const [scheduleStatus, setScheduleStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  
  // Rent scheduling state
  const [rentYear, setRentYear] = useState(new Date().getFullYear())
  const [rentPaymentDay, setRentPaymentDay] = useState(1)
  const [rentPreview, setRentPreview] = useState(null)
  const [rentLoading, setRentLoading] = useState(false)
  
  // Utility scheduling state
  const [utilityType, setUtilityType] = useState('electricity')
  const [utilityYear, setUtilityYear] = useState(new Date().getFullYear())
  console.log('utilityYear initialized:', utilityYear, 'current year:', new Date().getFullYear())
  const [utilityPaymentDay, setUtilityPaymentDay] = useState(1)
  const [utilityAmount, setUtilityAmount] = useState('')
  const [utilityPreview, setUtilityPreview] = useState(null)
  const [utilityLoading, setUtilityLoading] = useState(false)
  
  // General state
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('rent')

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    if (selectedContract) {
      fetchScheduleStatus()
    }
  }, [selectedContract])

  const fetchContracts = async () => {
    try {
      setLoadingContracts(true)
      const response = await contractService.getAll({ status: 'active', limit: 100 })
      setContracts(response.data.data.contracts)
    } catch (error) {
      console.error('Error fetching contracts:', error)
      setError('Error al cargar los contratos')
    } finally {
      setLoadingContracts(false)
    }
  }

  const fetchScheduleStatus = async () => {
    try {
      setLoadingStatus(true)
      const year = Math.max(new Date().getFullYear(), rentYear, utilityYear)
      const response = await paymentSchedulerService.getScheduleStatus(selectedContract.id, year)
      setScheduleStatus(response.data.data)
      
      // Set default payment day from contract
      if (response.data.data.payment_day) {
        setRentPaymentDay(response.data.data.payment_day)
      }
    } catch (error) {
      console.error('Error fetching schedule status:', error)
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleContractSelect = (contract) => {
    setSelectedContract(contract)
    setRentPreview(null)
    setUtilityPreview(null)
    setSuccess(null)
    setError(null)
  }

  const previewRentSchedule = async () => {
    if (!selectedContract) return
    
    console.log('previewRentSchedule called with rentYear:', rentYear)
    
    try {
      const response = await paymentSchedulerService.preview({
        contract_id: selectedContract.id,
        type: 'rent',
        year: rentYear,
        payment_day: rentPaymentDay
      })
      console.log('Rent preview response:', response.data.data)
      setRentPreview(response.data.data)
      setError(null)
    } catch (error) {
      console.error('Error previewing rent schedule:', error)
      setError(error.response?.data?.message || 'Error al previsualizar programación')
    }
  }

  const scheduleRentPayments = async () => {
    if (!selectedContract) return
    
    try {
      setRentLoading(true)
      const response = await paymentSchedulerService.scheduleRent({
        contract_id: selectedContract.id,
        year: rentYear,
        payment_day: rentPaymentDay
      })
      setSuccess(`Pagos de renta programados: ${response.data.data.scheduled} creados, ${response.data.data.skipped} omitidos`)
      setRentPreview(null)
      fetchScheduleStatus()
      setError(null)
    } catch (error) {
      console.error('Error scheduling rent payments:', error)
      setError(error.response?.data?.message || 'Error al programar pagos de renta')
    } finally {
      setRentLoading(false)
    }
  }

  const previewUtilitySchedule = async () => {
    if (!selectedContract) {
      console.log('No contract selected')
      return
    }
    if (!utilityAmount) {
      console.log('No utility amount entered:', utilityAmount)
      setError('Por favor ingresa un monto para el servicio')
      return
    }
    
    const amount = parseFloat(utilityAmount)
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid amount:', utilityAmount)
      setError('Por favor ingresa un monto válido mayor a 0')
      return
    }
    
    console.log('Preview utility schedule:', {
      contract_id: selectedContract.id,
      type: utilityType,
      year: utilityYear,
      payment_day: utilityPaymentDay,
      amount: amount
    })
    
    try {
      const response = await paymentSchedulerService.preview({
        contract_id: selectedContract.id,
        type: utilityType,
        year: utilityYear,
        payment_day: utilityPaymentDay,
        amount: amount
      })
      console.log('Utility preview response dates:', response.data.data.payments_to_create.map(p => p.due_date))
      console.log('Utility preview response:', response.data.data)
      setUtilityPreview(response.data.data)
      setError(null)
    } catch (error) {
      console.error('Error previewing utility schedule:', error)
      console.error('Error response:', error.response?.data)
      setError(error.response?.data?.message || error.response?.data?.error || 'Error al previsualizar programación')
    }
  }

  const scheduleUtilityPayments = async () => {
    if (!selectedContract || !utilityAmount) return
    
    try {
      setUtilityLoading(true)
      const response = await paymentSchedulerService.scheduleUtility({
        contract_id: selectedContract.id,
        utility_type: utilityType,
        year: utilityYear,
        payment_day: utilityPaymentDay,
        amount: parseFloat(utilityAmount)
      })
      setSuccess(`Pagos de ${utilityType} programados: ${response.data.data.scheduled} creados, ${response.data.data.skipped} omitidos`)
      setUtilityPreview(null)
      fetchScheduleStatus()
      setError(null)
    } catch (error) {
      console.error('Error scheduling utility payments:', error)
      setError(error.response?.data?.message || 'Error al programar pagos de servicios')
    } finally {
      setUtilityLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
  }

  const getMonthName = (dueDate) => {
    // Handle both "YYYY-MM-DD" and "YYYY-MM" formats
    console.log('getMonthName input:', dueDate, 'Type:', typeof dueDate)
    
    // Fix timezone issue: append time to force local timezone parsing
    const dateStr = dueDate.includes('T') ? dueDate : `${dueDate}T12:00:00`
    const date = new Date(dateStr)
    
    console.log('Parsed date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth(), 'Local date parts:', date.getDate(), date.getMonth() + 1, date.getFullYear())
    
    // Get month name using local date parts
    const monthName = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    console.log('Month name result:', monthName)
    return monthName
  }

  const getMissingMonthsDisplay = (missingMonths) => {
    if (!missingMonths || missingMonths.length === 0) return ''
    return missingMonths.map(m => {
      const [year, month] = m.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toLocaleDateString('es-MX', { month: 'long' })
    }).join(', ')
  }

  const utilityTypes = [
    { value: 'electricity', label: 'Electricidad' },
    { value: 'water', label: 'Agua' },
    { value: 'gas', label: 'Gas' }
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programación de Pagos</h1>
          <p className="text-gray-500">Programa pagos automáticos de renta y servicios públicos</p>
        </div>
        <Link to="/payments" className="btn btn-secondary">
          Ver Todos los Pagos
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Contract Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Contrato</h2>
        {loadingContracts ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay contratos activos disponibles
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                onClick={() => handleContractSelect(contract)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedContract?.id === contract.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="font-medium text-gray-900">{contract.contract_number}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {contract.property?.name || 'Sin propiedad'}
                </div>
                <div className="text-sm text-gray-500">
                  Inicio: {formatDate(contract.start_date)}
                </div>
                <div className="text-sm font-medium text-primary-600 mt-2">
                  Renta: {formatCurrency(contract.monthly_rent)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedContract && (
        <>
          {/* Schedule Status */}
          {loadingStatus ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : scheduleStatus && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Programación - {scheduleStatus.year}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(scheduleStatus.types).map(([type, data]) => (
                  <div key={type} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900 capitalize">{type}</div>
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Programados:</span>
                        <span className="font-medium">{data.existing}/{data.expected}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">Faltantes:</span>
                        <span className="font-medium text-orange-600">{data.missing}</span>
                      </div>
                      {data.missingMonths.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {getMissingMonthsDisplay(data.missingMonths)}
                        </div>
                      )}
                      {data.missing > 0 && (
                        <button
                          onClick={() => {
                            setActiveTab(type === 'rent' ? 'rent' : 'utility')
                            if (type !== 'rent') {
                              setUtilityType(type)
                            }
                          }}
                          className="mt-2 text-xs text-primary-600 hover:text-primary-800 underline"
                        >
                          Programar ahora
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('rent')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rent'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pagos de Renta
              </button>
              <button
                onClick={() => setActiveTab('utility')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'utility'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Servicios Públicos
              </button>
            </nav>
          </div>

          {/* Rent Scheduling */}
          {activeTab === 'rent' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Programar Pagos de Renta</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <select
                    value={rentYear}
                    onChange={(e) => setRentYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día de Pago</label>
                  <select
                    value={rentPaymentDay}
                    onChange={(e) => setRentPaymentDay(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day} de cada mes</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={previewRentSchedule}
                    className="btn btn-secondary flex-1"
                  >
                    Previsualizar
                  </button>
                </div>
              </div>

              {rentPreview && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">
                        Se crearán {rentPreview.will_create} pagos ({rentPreview.will_skip} omitidos)
                      </span>
                      <button
                        onClick={scheduleRentPayments}
                        disabled={rentLoading || rentPreview.will_create === 0}
                        className="btn btn-primary"
                      >
                        {rentLoading ? 'Programando...' : 'Confirmar Programación'}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {/* Combine and sort all payments by date */}
                        {(() => {
                          const allPayments = [...rentPreview.payments_to_create.map(p => ({ ...p, status: 'create' })), 
                            ...rentPreview.payments_to_skip.map(p => ({ ...p, status: 'skip' }))]
                            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                          console.log('All sorted payments:', allPayments.map(p => ({ month: getMonthName(p.due_date), date: p.due_date, status: p.status })))
                          return allPayments.map((payment, index) => (
                          <tr key={index} className={payment.status === 'create' ? 'bg-green-50' : 'bg-gray-50'}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {getMonthName(payment.due_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{formatDate(payment.due_date)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {payment.status === 'create' ? formatCurrency(payment.amount) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {payment.status === 'create' ? (
                                <span className="text-green-600">Se creará</span>
                              ) : (
                                <span className="text-orange-600">Ya existe</span>
                              )}
                            </td>
                          </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Utility Scheduling */}
          {activeTab === 'utility' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Programar Servicios Públicos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                  <select
                    value={utilityType}
                    onChange={(e) => setUtilityType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {utilityTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <select
                    value={utilityYear}
                    onChange={(e) => setUtilityYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día de Pago</label>
                  <select
                    value={utilityPaymentDay}
                    onChange={(e) => setUtilityPaymentDay(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Mensual (MXN) *</label>
                  <input
                    type="number"
                    value={utilityAmount}
                    onChange={(e) => setUtilityAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {!utilityAmount && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Ingresa un monto para poder previsualizar</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mb-6">
                <button
                  onClick={previewUtilitySchedule}
                  className="btn btn-secondary"
                >
                  Previsualizar
                </button>
              </div>

              {utilityPreview && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">
                        Se crearán {utilityPreview.will_create} pagos ({utilityPreview.will_skip} omitidos)
                      </span>
                      <button
                        onClick={scheduleUtilityPayments}
                        disabled={utilityLoading || utilityPreview.will_create === 0}
                        className="btn btn-primary"
                      >
                        {utilityLoading ? 'Programando...' : 'Confirmar Programación'}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {/* Combine and sort all utility payments by date */}
                        {(() => {
                          const allPayments = [...utilityPreview.payments_to_create.map(p => ({ ...p, status: 'create' })), 
                            ...utilityPreview.payments_to_skip.map(p => ({ ...p, status: 'skip' }))]
                            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                          console.log('Utility sorted payments:', allPayments.map(p => ({ month: getMonthName(p.due_date), date: p.due_date, status: p.status })))
                          return allPayments.map((payment, index) => (
                          <tr key={index} className={payment.status === 'create' ? 'bg-green-50' : 'bg-gray-50'}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {getMonthName(payment.due_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{formatDate(payment.due_date)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {payment.status === 'create' ? formatCurrency(payment.amount) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {payment.status === 'create' ? (
                                <span className="text-green-600">Se creará</span>
                              ) : (
                                <span className="text-orange-600">Ya existe</span>
                              )}
                            </td>
                          </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedContract && (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un contrato</h3>
          <p className="text-gray-500">Selecciona un contrato arriba para comenzar a programar pagos</p>
        </div>
      )}
    </div>
  )
}

export default PaymentScheduler
