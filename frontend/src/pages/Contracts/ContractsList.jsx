import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { contractService } from '../../services/api'

const ContractsList = () => {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    fetchContracts()
  }, [pagination.page])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const response = await contractService.getAll({
        page: pagination.page,
        limit: pagination.limit
      })
      setContracts(response.data.data.contracts)
      setPagination(prev => ({ ...prev, ...response.data.data.pagination }))
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      terminated: 'bg-gray-100 text-gray-700',
      renewed: 'bg-blue-100 text-blue-700'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-MX')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500">Gestiona tus contratos de arrendamiento</p>
        </div>
        <Link to="/contracts/new" className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Contrato
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contratos</h3>
          <p className="text-gray-500 mb-4">Crea tu primer contrato de arrendamiento</p>
          <Link to="/contracts/new" className="btn btn-primary">
            Crear Contrato
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propiedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inquilino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{contract.contract_number}</div>
                    <div className="text-sm text-gray-500">
                      ${parseFloat(contract.monthly_rent).toLocaleString('es-MX')}/mes
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{contract.property?.name}</div>
                    <div className="text-sm text-gray-500">{contract.property?.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {contract.tenant?.first_name} {contract.tenant?.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{contract.tenant?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(contract.status)}`}>
                      {contract.status === 'active' ? 'Activo' : contract.status === 'pending' ? 'Pendiente' : contract.status === 'expired' ? 'Vencido' : contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/contracts/${contract.id}`} className="text-primary-600 hover:text-primary-900 mr-4">
                      Ver detalles
                    </Link>
                    <Link to={`/contracts/${contract.id}/edit`} className="text-blue-600 hover:text-blue-900">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-600">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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

export default ContractsList
