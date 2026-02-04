import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, CheckCircle, AlertCircle, Building2, User } from 'lucide-react';
import api from '../../services/api';

export default function Extracts() {
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [error, setError] = useState('');

  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i);
  }

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoadingContracts(true);
      const response = await api.get('/extracts/contracts');
      setContracts(response.data);
      if (response.data.length > 0) {
        setSelectedContract(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError('Error al cargar los contratos');
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!selectedContract) {
      setError('Por favor selecciona un contrato');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Realizar la petición para obtener el PDF
      const response = await api.get('/extracts/certificate', {
        params: {
          contractId: selectedContract,
          month: selectedMonth,
          year: selectedYear
        },
        responseType: 'blob' // Importante para archivos binarios
      });

      // Crear un blob con el PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${selectedContract}-${selectedYear}-${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error generating certificate:', err);
      setError(err.response?.data?.error || 'Error al generar el certificado');
    } finally {
      setLoading(false);
    }
  };

  const selectedContractData = contracts.find(c => c.id === selectedContract);

  if (loadingContracts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary-600" />
          Extractos y Certificados
        </h1>
        <p className="mt-2 text-gray-600">
          Genera certificados de paz y salvo en PDF con el balance de pagos por periodo
        </p>
      </div>

      {/* Tarjeta principal */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes contratos disponibles
            </h3>
            <p className="text-gray-600">
              Necesitas tener al menos un contrato activo para generar certificados
            </p>
          </div>
        ) : (
          <>
            {/* Selector de contrato */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Contrato
              </label>
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contract_number} - {contract.property.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Información del contrato seleccionado */}
            {selectedContractData && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Propiedad</p>
                      <p className="font-medium text-gray-900">{selectedContractData.property.name}</p>
                      <p className="text-sm text-gray-600">{selectedContractData.property.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Arrendatario</p>
                      <p className="font-medium text-gray-900">
                        {selectedContractData.tenant.first_name} {selectedContractData.tenant.last_name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selector de periodo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo del Certificado
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Mes</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Año</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Información del certificado */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">
                    ¿Qué incluye el certificado?
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Información del arrendatario y contrato</li>
                    <li>• Estado de pagos: Renta, Luz, Agua, Gas y otros servicios</li>
                    <li>• Totales pagados y pendientes por concepto</li>
                    <li>• Certificación de paz y salvo o deuda pendiente</li>
                    <li>• Documento descargable en formato PDF</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botón de generación */}
            <button
              onClick={handleGenerateCertificate}
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generando certificado...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Generar Certificado PDF
                </>
              )}
            </button>

            {/* Nota adicional */}
            <p className="mt-4 text-xs text-gray-500 text-center">
              El certificado se descargará automáticamente y puede ser compartido desde tu dispositivo
            </p>
          </>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Sobre los certificados
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            • Los certificados muestran el estado de todos los pagos del periodo seleccionado
          </p>
          <p>
            • Solo se certifican como "Paz y Salvo" los periodos con todos los pagos aprobados
          </p>
          <p>
            • Tanto arrendatarios como arrendadores pueden generar certificados
          </p>
          <p>
            • El PDF es compatible con cualquier dispositivo móvil o computador
          </p>
        </div>
      </div>
    </div>
  );
}
