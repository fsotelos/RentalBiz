import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const Settings = () => {
  const { user, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  })
  const [preferences, setPreferences] = useState({
    email: true,
    payment_reminder_days: 5,
    contract_expiry_days: 30
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setMessage('')
  }

  const handlePreferenceChange = (e) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const result = await updateProfile(formData)
    if (result.success) {
      setMessage('Perfil actualizado correctamente')
    } else {
      setMessage(result.message)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">Configuración</h1><p className="text-gray-500">Gestiona tu cuenta y preferencias</p></div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm ${message.includes('correctamente') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Información Personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="first_name" className="label">Nombre</label>
              <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} className="input" />
            </div>
            <div>
              <label htmlFor="last_name" className="label">Apellido</label>
              <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="label">Teléfono</label>
            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input" />
          </div>
          <div>
            <label htmlFor="address" className="label">Dirección</label>
            <textarea id="address" name="address" value={formData.address} onChange={handleChange} className="input" rows={3} />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Preferencias de Notificaciones</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input id="email" name="email" type="checkbox" checked={preferences.email} onChange={handlePreferenceChange} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
              <label htmlFor="email" className="ml-2 text-sm text-gray-700">Recibir notificaciones por email</label>
            </div>
            <div>
              <label htmlFor="payment_reminder_days" className="label">Días de anticipación para recordatorios de pago</label>
              <input id="payment_reminder_days" name="payment_reminder_days" type="number" min="1" max="30" value={preferences.payment_reminder_days} onChange={handlePreferenceChange} className="input w-32" />
            </div>
            <div>
              <label htmlFor="contract_expiry_days" className="label">Días de anticipación para contratos por vencer</label>
              <input id="contract_expiry_days" name="contract_expiry_days" type="number" min="1" max="90" value={preferences.contract_expiry_days} onChange={handlePreferenceChange} className="input w-32" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
        </div>
      </form>
    </div>
  )
}

export default Settings
