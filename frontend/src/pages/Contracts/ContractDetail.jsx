import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contractService } from '../../services/api'

const ContractDetail = () => {
  const { id } = useParams()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await contractService.getById(id)
        setContract(response.data.data.contract)
      } catch (error) {
        console.error('Error fetching contract:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchContract()
  }, [id])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
  }

  const formatDate = (date) => new Date(date).toLocaleDateString('es-MX')

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>
  }

  if (!contract) {
    return <div className="card text-center py-12"><h2 className="text-xl font-semibold text-gray-900">Contrato no encontrado</h2><Link to="/contracts" className="btn btn-primary mt-4">Volver</Link></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/contracts" className="text-gray-500 hover:text-gray-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
          <div><h1 className="text-2xl font-bold text-gray-900">{contract.contract_number}</h1><p className="text-gray-500">{contract.property?.name}</p></div>
        </div>
        <Link to={`/contracts/${id}/edit`} className="btn btn-secondary">Editar</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Contrato</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-gray-500 text-sm">Período</dt><dd className="font-medium">{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</dd></div>
              <div><dt className="text-gray-500 text-sm">Renta Mensual</dt><dd className="font-medium text-primary-600">{formatCurrency(contract.monthly_rent)}</dd></div>
              <div><dt className="text-gray-500 text-sm">Frecuencia de Pago</dt><dd className="font-medium capitalize">{contract.payment_frequency}</dd></div>
              <div><dt className="text-gray-500 text-sm">Día de Pago</dt><dd className="font-medium">Día {contract.payment_day}</dd></div>
              {contract.security_deposit && <div><dt className="text-gray-500 text-sm">Depósito</dt><dd className="font-medium">{formatCurrency(contract.security_deposit)}</dd></div>}
            </dl>
          </div>

          {contract.payments && contract.payments.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pagos Recientes</h2>
              <div className="space-y-2">
                {contract.payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="font-medium capitalize">{payment.type}</p><p className="text-sm text-gray-500">{formatDate(payment.due_date)}</p></div>
                    <div className="text-right"><p className="font-medium">{formatCurrency(payment.amount)}</p><span className={`text-xs px-2 py-1 rounded-full ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : payment.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${contract.status === 'active' ? 'bg-green-100 text-green-700' : contract.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{contract.status}</span>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Propiedad</h2>
            <div className="flex items-center mb-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center"><svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div>
              <div className="ml-3"><p className="font-medium">{contract.property?.name}</p><p className="text-sm text-gray-500">{contract.property?.address}</p></div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Arrendador</h2>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"><span className="text-primary-600 font-medium">{contract.landlord?.first_name[0]}{contract.landlord?.last_name[0]}</span></div>
              <div className="ml-3"><p className="font-medium">{contract.landlord?.first_name} {contract.landlord?.last_name}</p><p className="text-sm text-gray-500">{contract.landlord?.email}</p></div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Arrendatario</h2>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 font-medium">{contract.tenant?.first_name[0]}{contract.tenant?.last_name[0]}</span></div>
              <div className="ml-3"><p className="font-medium">{contract.tenant?.first_name} {contract.tenant?.last_name}</p><p className="text-sm text-gray-500">{contract.tenant?.email}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContractDetail
