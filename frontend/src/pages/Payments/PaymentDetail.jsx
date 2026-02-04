import { useState } from 'react'

const PaymentDetail = ({ payment, onClose, onApprove, onReject, loading, mode = 'view' }) => {
  const [rejectReason, setRejectReason] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

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
      pending_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-blue-100 text-blue-700',
      overdue: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      partial: 'bg-orange-100 text-orange-700'
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

  const handleApprove = () => {
    if (onApprove) {
      onApprove(payment.id, approveNotes)
    }
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Por favor ingresa una razón para rechazar el pago')
      return
    }
    if (onReject) {
      onReject(payment.id, rejectReason)
    }
  }

  const canApproveReject = mode === 'approval' && payment.status === 'pending_approval'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Detalles del Pago</h2>
            <p className="text-sm text-gray-500">Referencia: {payment.reference_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Amount */}
          <div className="flex items-center justify-between">
            <div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                {payment.status === 'pending_approval' ? 'Pendiente de Aprobación' : 
                 payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
              <div className="text-sm text-gray-500">{payment.currency}</div>
            </div>
          </div>

          {/* Payment Info Grid */}
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-500">Referencia Bancaria</label>
              <p className="mt-1 text-gray-900">{payment.reference_number || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Referencia Banco</label>
              <p className="mt-1 text-gray-900">{payment.bank_reference || '-'}</p>
            </div>
          </div>

          {/* Related Information */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Información Relacionada</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500">Propiedad</label>
                <p className="text-gray-900">{payment.contract?.property?.name || '-'}</p>
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
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-500">Notas</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {payment.status === 'rejected' && payment.rejection_reason && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-red-600">Razón del Rechazo</label>
              <p className="mt-1 text-red-700 whitespace-pre-wrap">{payment.rejection_reason}</p>
            </div>
          )}

          {/* Approval History */}
          {payment.approvals && payment.approvals.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Historial de Aprobación</h3>
              <div className="space-y-2">
                {payment.approvals.map((approval, index) => (
                  <div key={approval.id || index} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        approval.status === 'approved' ? 'bg-green-100 text-green-700' :
                        approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {approval.status === 'approved' ? 'Aprobado' :
                         approval.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                      <span className="text-gray-500">{formatDate(approval.created_at)}</span>
                    </div>
                    {approval.approver && (
                      <p className="text-gray-600 mt-1">Por: {approval.approver.first_name} {approval.approver.last_name}</p>
                    )}
                    {approval.rejection_reason && (
                      <p className="text-red-600 mt-1">Razón: {approval.rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Actions */}
          {canApproveReject && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Acciones de Aprobación</h3>
              
              {/* Approve Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas de Aprobación (opcional)</label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  rows={2}
                  placeholder="Notas opcionales..."
                />
              </div>

              {showRejectForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-red-600">Razón del Rechazo</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="mt-1 block w-full border border-red-300 rounded-md shadow-sm p-2"
                      rows={3}
                      placeholder="Explain why this payment is being rejected..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleReject}
                      disabled={loading || !rejectReason.trim()}
                      className="btn btn-danger disabled:opacity-50"
                    >
                      {loading ? 'Procesando...' : 'Confirmar Rechazo'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false)
                        setRejectReason('')
                      }}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="btn btn-success"
                  >
                    {loading ? 'Procesando...' : 'Aprobar Pago'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading}
                    className="btn btn-danger"
                  >
                    Rechazar Pago
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentDetail
