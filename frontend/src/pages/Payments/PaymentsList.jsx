import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { paymentService, contractService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PaymentForm from '../../components/Forms/PaymentForm'

const PaymentsList = () => {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [showForm, setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [selectedTenant, setSelectedTenant] = useState('')

  const isLandlord = user?.role === 'landlord'

  useEffect(() => {
    fetchPayments()
    if (isLandlord) {
      fetchContracts()
    }
  }, [pagination.page])

  const fetchContracts = async () => {
    try {
      const response = await contractService.getAll()
      setContracts(response.data.data.contracts || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await paymentService.getAll({ page: pagination.page, limit: pagination.limit })
      setPayments(response.data.data.payments)
      setPagination(prev => ({ ...prev, ...response.data.data.pagination }))
    } catch (error) {
      console.error('Error fetching payments:', error)
      // Don't show alert, just set empty array
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePayment = async (data) => {
    try {
      setSubmitting(true)
      await paymentService.create(data)
      alert('Pago creado exitosamente')
      setShowForm(false)
      fetchPayments()
    } catch (error) {
      console.error('Error creating payment:', error)
      alert(error.response?.data?.message || 'Error al crear el pago')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdatePayment = async (data) => {
    try {
      setSubmitting(true)
      await paymentService.update(editingPayment.id, data)
      alert('Pago actualizado exitosamente')
      setEditingPayment(null)
      setShowForm(false)
      fetchPayments()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert(error.response?.data?.message || 'Error al actualizar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setDeletingId(paymentId)
      await paymentService.delete(paymentId)
      alert('Pago eliminado exitosamente')
      fetchPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert(error.response?.data?.message || 'Error al eliminar el pago')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditClick = (payment) => {
    if (!['pending', 'paid'].includes(payment.status)) {
      alert('Solo se pueden editar pagos pendientes o pagados')
      return
    }
    setEditingPayment(payment)
    setShowForm(true)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingPayment(null)
  }

  const handleStatusChange = async (paymentId, newStatus) => {
    try {
      setUpdatingStatusId(paymentId)
      
      // Always use the update endpoint for status changes
      await paymentService.update(paymentId, { status: newStatus })
      
      // Refresh the list
      fetchPayments()
    } catch (error) {
      console.error('Error updating status:', error)
      alert(error.response?.data?.message || 'Error al actualizar el estado')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
  
  const formatDate = (date) => 
    new Date(date).toLocaleDateString('es-MX')

  const formatMonthYear = (date) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      pending_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      partial: 'bg-orange-100 text-orange-700'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      pending_approval: 'Pendiente Aprobación',
      approved: 'Aprobado',
      paid: 'Pagado',
      overdue: 'Vencido',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
      partial: 'Parcial'
    }
    return labels[status] || status
  }

  const getTypeLabel = (type) => {
    const labels = {
      rent: 'Renta',
      electricity: 'Electricidad',
      water: 'Agua',
      gas: 'Gas',
      deposit: 'Depósito',
      maintenance: 'Mantenimiento',
      other: 'Otro'
    }
    return labels[type] || type
  }

  const getTenantName = (payment) => {
    const tenant = payment.contract?.tenant
    if (!tenant) return '-'
    
    // Try name field first, then construct from first_name and last_name
    if (tenant.name) return tenant.name
    if (tenant.first_name || tenant.last_name) {
      return `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim()
    }
    return tenant.email || '-'
  }

  // Get unique tenants from contracts
  const uniqueTenants = [...new Map(
    contracts
      .filter(c => c.tenant && c.tenant_id) // Only include contracts with valid tenant data
      .map(c => [c.tenant_id, c.tenant])
  ).values()]

  // Filter payments by selected tenant
  const filteredPayments = selectedTenant
    ? payments.filter(p => p.contract?.tenant_id === selectedTenant)
    : payments

  // Separate into Rentas and Servicios
  const rentPayments = filteredPayments.filter(p => p.type === 'rent')
  const servicePayments = filteredPayments.filter(p => p.type !== 'rent')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500">Historial y seguimiento de pagos</p>
        </div>
        {isLandlord && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Crear Pago</span>
          </button>
        )}
      </div>

      {/* Tenant Filter */}
      {isLandlord && uniqueTenants.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por Inquilino:</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos los inquilinos</option>
              {uniqueTenants.map(tenant => {
                const tenantName = tenant.name || `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || tenant.email
                return (
                  <option key={tenant.id} value={tenant.id}>
                    {tenantName}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPayment ? 'Editar Pago' : 'Crear Nuevo Pago'}
              </h2>
            </div>
            <div className="p-6">
              <PaymentForm
                payment={editingPayment}
                onSubmit={editingPayment ? handleUpdatePayment : handleCreatePayment}
                onCancel={handleFormCancel}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
          <p className="text-gray-500">Aún no se han registrado pagos</p>
        </div>
      ) : (
        <>
          {/* Rentas Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Rentas</span>
            </h2>
            {rentPayments.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500">No hay pagos de renta{selectedTenant ? ' para este inquilino' : ''}</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rentPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.reference_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatMonthYear(payment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.contract?.property?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLandlord && ['pending', 'paid'].includes(payment.status) ? (
                            <select
                              value={payment.status}
                              onChange={(e) => handleStatusChange(payment.id, e.target.value)}
                              disabled={updatingStatusId === payment.id}
                              className={`px-3 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer ${getStatusBadge(payment.status)} ${
                                updatingStatusId === payment.id ? 'opacity-50 cursor-wait' : ''
                              }`}
                            >
                              <option value="pending" className="bg-white text-gray-900">Pendiente</option>
                              <option value="approved" className="bg-white text-gray-900">Aprobado</option>
                              <option value="paid" className="bg-white text-gray-900">Pagado</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                              {getStatusLabel(payment.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link to={`/payments/${payment.id}`} className="text-primary-600 hover:text-primary-900">
                              Ver
                            </Link>
                            {isLandlord && ['pending', 'paid'].includes(payment.status) && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleEditClick(payment)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Editar
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
                                  disabled={deletingId === payment.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  {deletingId === payment.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Servicios Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Servicios</span>
            </h2>
            {servicePayments.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500">No hay pagos de servicios{selectedTenant ? ' para este inquilino' : ''}</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {servicePayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.reference_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatMonthYear(payment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getTypeLabel(payment.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.contract?.property?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLandlord && ['pending', 'paid'].includes(payment.status) ? (
                            <select
                              value={payment.status}
                              onChange={(e) => handleStatusChange(payment.id, e.target.value)}
                              disabled={updatingStatusId === payment.id}
                              className={`px-3 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer ${getStatusBadge(payment.status)} ${
                                updatingStatusId === payment.id ? 'opacity-50 cursor-wait' : ''
                              }`}
                            >
                              <option value="pending" className="bg-white text-gray-900">Pendiente</option>
                              <option value="approved" className="bg-white text-gray-900">Aprobado</option>
                              <option value="paid" className="bg-white text-gray-900">Pagado</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                              {getStatusLabel(payment.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link to={`/payments/${payment.id}`} className="text-primary-600 hover:text-primary-900">
                              Ver
                            </Link>
                            {isLandlord && ['pending', 'paid'].includes(payment.status) && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleEditClick(payment)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Editar
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
                                  disabled={deletingId === payment.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  {deletingId === payment.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-600">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
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

export default PaymentsList
