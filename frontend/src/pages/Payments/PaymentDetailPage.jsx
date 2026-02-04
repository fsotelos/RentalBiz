import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PaymentForm from '../../components/Forms/PaymentForm'

const PaymentDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showMarkPaidForm, setShowMarkPaidForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [markPaidData, setMarkPaidData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    reference_number: '',
    bank_reference: '',
    notes: ''
  })

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    try {
      setLoading(true)
      const response = await paymentService.getById(id)
      setPayment(response.data.data.payment)
    } catch (error) {
      console.error('Error fetching payment:', error)
      // Silently handle 404 errors - payment not found
      if (error.response?.status !== 404) {
        console.error('Unexpected error loading payment:', error.response?.data?.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePayment = async (data) => {
    try {
      setSubmitting(true)
      await paymentService.update(id, data)
      alert('Pago actualizado exitosamente')
      setShowEditForm(false)
      fetchPayment()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert(error.response?.data?.message || 'Error al actualizar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAsPaid = async (e) => {
    e.preventDefault()
    
    if (!markPaidData.payment_method) {
      alert('Debes seleccionar un método de pago')
      return
    }

    try {
      setSubmitting(true)
      await paymentService.markAsPaid(id, markPaidData)
      alert('Pago marcado como pagado exitosamente')
      setShowMarkPaidForm(false)
      fetchPayment()
    } catch (error) {
      console.error('Error marking payment as paid:', error)
      alert(error.response?.data?.message || 'Error al marcar el pago como pagado')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = async () => {
    if (!confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await paymentService.delete(id)
      alert('Pago eliminado exitosamente')
      navigate('/payments')
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert(error.response?.data?.message || 'Error al eliminar el pago')
    }
  }

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
  
  const formatDate = (date) => 
    date ? new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : '-'

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
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

  const isLandlord = user?.role === 'landlord'
  const canEdit = isLandlord && ['pending', 'paid'].includes(payment?.status)
  const canMarkPaid = (isLandlord || payment?.user_id === user?.id) && ['pending', 'paid'].includes(payment?.status)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!payment) {
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/payments')}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Detalle del Pago</h1>
              <p className="text-gray-500">Referencia: {payment.reference_number}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canMarkPaid && (
            <button
              onClick={() => setShowMarkPaidForm(true)}
              className="btn btn-success"
            >
              Marcar como Pagado
            </button>
          )}
          {canEdit && (
            <>
              <button
                onClick={() => setShowEditForm(true)}
                className="btn btn-secondary"
              >
                Editar
              </button>
              <button
                onClick={handleDeletePayment}
                className="btn btn-danger"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="card">
        {/* Status and Amount */}
        <div className="flex items-center justify-between p-6 border-b">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </span>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Tipo de Pago</label>
              <p className="mt-1 text-gray-900">{getTypeLabel(payment.type)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Fecha de Vencimiento</label>
              <p className="mt-1 text-gray-900">{formatDate(payment.due_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Fecha de Pago</label>
              <p className="mt-1 text-gray-900">{formatDate(payment.payment_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Método de Pago</label>
              <p className="mt-1 text-gray-900">
                {payment.payment_method ? 
                  payment.payment_method.replace('_', ' ').charAt(0).toUpperCase() + payment.payment_method.replace('_', ' ').slice(1) 
                  : '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Referencia</label>
              <p className="mt-1 text-gray-900">{payment.reference_number || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Referencia Bancaria</label>
              <p className="mt-1 text-gray-900">{payment.bank_reference || '-'}</p>
            </div>
          </div>

          {/* Related Information */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Información Relacionada</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500">Propiedad</label>
                <p className="text-gray-900 font-medium">{payment.contract?.property?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Dirección</label>
                <p className="text-gray-900">{payment.contract?.property?.address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Inquilino</label>
                <p className="text-gray-900">
                  {payment.user ? `${payment.user.first_name} ${payment.user.last_name}` : '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Email del Inquilino</label>
                <p className="text-gray-900">{payment.user?.email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">Notas</label>
              <p className="text-gray-900 whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Editar Pago</h2>
            </div>
            <div className="p-6">
              <PaymentForm
                payment={payment}
                onSubmit={handleUpdatePayment}
                onCancel={() => setShowEditForm(false)}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Marcar como Pagado</h2>
            </div>
            <form onSubmit={handleMarkAsPaid} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago *</label>
                <input
                  type="date"
                  value={markPaidData.payment_date}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                <select
                  value={markPaidData.payment_method}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Selecciona un método</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="check">Cheque</option>
                  <option value="card">Tarjeta</option>
                  <option value="deposit">Depósito</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia Bancaria</label>
                <input
                  type="text"
                  value={markPaidData.bank_reference}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, bank_reference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Referencia del banco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={markPaidData.notes}
                  onChange={(e) => setMarkPaidData({ ...markPaidData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Notas adicionales..."
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidForm(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Marcar como Pagado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentDetailPage
