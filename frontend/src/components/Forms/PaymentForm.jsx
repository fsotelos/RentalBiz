import { useState, useEffect } from 'react'
import { contractService } from '../../services/api'

const PaymentForm = ({ payment = null, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    contract_id: '',
    type: 'rent',
    amount: '',
    due_date: '',
    payment_method: '',
    notes: ''
  })
  const [contracts, setContracts] = useState([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    if (payment) {
      setFormData({
        contract_id: payment.contract_id || '',
        type: payment.type || 'rent',
        amount: payment.amount || '',
        due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
        payment_method: payment.payment_method || '',
        notes: payment.notes || ''
      })
    }
  }, [payment])

  const fetchContracts = async () => {
    try {
      setLoadingContracts(true)
      const response = await contractService.getAll({ status: 'active', limit: 100 })
      setContracts(response.data.data.contracts || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoadingContracts(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.contract_id) {
      newErrors.contract_id = 'Debes seleccionar un contrato'
    }
    if (!formData.type) {
      newErrors.type = 'Debes seleccionar un tipo de pago'
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0'
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Debes seleccionar una fecha de vencimiento'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount)
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contract Selection */}
      <div>
        <label htmlFor="contract_id" className="block text-sm font-medium text-gray-700 mb-1">
          Contrato *
        </label>
        <select
          id="contract_id"
          name="contract_id"
          value={formData.contract_id}
          onChange={handleChange}
          disabled={!!payment || loadingContracts}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            errors.contract_id ? 'border-red-500' : 'border-gray-300'
          } ${payment || loadingContracts ? 'bg-gray-100' : ''}`}
        >
          <option value="">Selecciona un contrato</option>
          {contracts.map(contract => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_number} - {contract.property?.name} ({contract.tenant?.first_name} {contract.tenant?.last_name})
            </option>
          ))}
        </select>
        {errors.contract_id && <p className="text-red-500 text-sm mt-1">{errors.contract_id}</p>}
      </div>

      {/* Payment Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Pago *
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            errors.type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="rent">Renta</option>
          <option value="electricity">Electricidad</option>
          <option value="water">Agua</option>
          <option value="gas">Gas</option>
          <option value="deposit">Depósito</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="other">Otro</option>
        </select>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Monto *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            placeholder="0.00"
            className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
      </div>

      {/* Due Date */}
      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de Vencimiento *
        </label>
        <input
          type="date"
          id="due_date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            errors.due_date ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.due_date && <p className="text-red-500 text-sm mt-1">{errors.due_date}</p>}
      </div>

      {/* Payment Method */}
      <div>
        <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
          Método de Pago
        </label>
        <select
          id="payment_method"
          name="payment_method"
          value={formData.payment_method}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Selecciona un método</option>
          <option value="cash">Efectivo</option>
          <option value="bank_transfer">Transferencia Bancaria</option>
          <option value="credit_card">Tarjeta de Crédito</option>
          <option value="debit_card">Tarjeta de Débito</option>
          <option value="check">Cheque</option>
          <option value="online">Pago en Línea</option>
          <option value="other">Otro</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Notas adicionales sobre el pago..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{payment ? 'Actualizar Pago' : 'Crear Pago'}</span>
        </button>
      </div>
    </form>
  )
}

export default PaymentForm
