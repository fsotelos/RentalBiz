import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { paymentService } from '../../services/api'
import PaymentDetail from './PaymentDetail'

const ApprovalDashboard = () => {
  const { isLandlord } = useAuth()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!isLandlord) return
    fetchPendingApprovals()
  }, [isLandlord, pagination.page])

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true)
      const response = await paymentService.getPendingApprovals({
        page: pagination.page,
        limit: pagination.limit
      })
      setApprovals(response.data.data.payments || [])
      setPagination(prev => ({
        ...prev,
        ...response.data.data.pagination,
        summary: response.data.data.summary
      }))
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (paymentId, notes = '') => {
    try {
      setActionLoading(true)
      await paymentService.approvePayment(paymentId, { notes })
      fetchPendingApprovals()
      setShowModal(false)
      setSelectedPayment(null)
    } catch (error) {
      console.error('Error approving payment:', error)
      alert(error.response?.data?.message || 'Error al aprobar el pago')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (paymentId, reason) => {
    try {
      setActionLoading(true)
      await paymentService.rejectPayment(paymentId, { rejection_reason: reason })
      fetchPendingApprovals()
      setShowModal(false)
      setSelectedPayment(null)
    } catch (error) {
      console.error('Error rejecting payment:', error)
      alert(error.response?.data?.message || 'Error al rechazar el pago')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
  
  const formatDate = (date) => 
    date ? new Date(date).toLocaleDateString('es-MX') : '-'

  const getStatusBadge = (status) => {
    const badges = {
      pending_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-blue-100 text-blue-700'
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

  if (!isLandlord) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso denegado</h3>
        <p className="text-gray-500">Solo los arrendadores pueden acceder a esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprobación de Pagos</h1>
          <p className="text-gray-500">Revisa y aprueba los pagos enviados por inquilinos</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-600">
            {pagination.summary?.total || 0}
          </div>
          <div className="text-sm text-gray-500">Pendientes de aprobación</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin aprobaciones pendientes</h3>
          <p className="text-gray-500">No hay pagos pendientes de tu aprobación.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inquilino</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enviado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {approvals.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.reference_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.user?.first_name} {payment.user?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.contract?.property?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getTypeLabel(payment.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.submitted_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment)
                          setShowModal(true)
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        Revisar
                      </button>
                      <button
                        onClick={() => handleApprove(payment.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        disabled={actionLoading}
                      >
                        Aprobar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      {showModal && selectedPayment && (
        <PaymentDetail
          payment={selectedPayment}
          onClose={() => {
            setShowModal(false)
            setSelectedPayment(null)
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
          mode="approval"
        />
      )}
    </div>
  )
}

export default ApprovalDashboard
