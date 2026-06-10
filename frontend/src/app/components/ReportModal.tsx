import { useState } from 'react'
import { X, Flag } from 'lucide-react'
import { getApiUrl } from '../../utils/api'
import { useLanguage } from '../context/LanguageContext'

interface ReportModalProps {
  reportedProductId?: string
  reportedUserId?: string
  targetName: string
  onClose: () => void
}

export function ReportModal({ reportedProductId, reportedUserId, targetName, onClose }: ReportModalProps) {
  const { t } = useLanguage()
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const reportTypes = [
    { value: 'fake_product', label: t.reportTypeFakeProduct },
    { value: 'fraud', label: t.reportTypeFraud },
    { value: 'inappropriate', label: t.reportTypeInappropriate },
    { value: 'spam', label: t.reportTypeSpam },
    { value: 'other', label: t.reportTypeOther },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) { setError(t.errReportTypeRequired); return }
    if (!description.trim()) { setError(t.errReportDescRequired); return }
    setError('')
    setIsSubmitting(true)

    const token = localStorage.getItem('token')
    if (!token) { setError(t.errLoginToReport); setIsSubmitting(false); return }

    try {
      const body: Record<string, string> = { type, description }
      if (reportedProductId) body.reportedProductId = reportedProductId
      if (reportedUserId) body.reportedUserId = reportedUserId

      const res = await fetch(getApiUrl('/api/reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Error')
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.reportSuccessTitle}</h3>
            <p className="text-sm text-gray-600 mb-4">{t.reportSuccessDesc}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg font-medium hover:bg-[#E65100] transition-colors"
            >
              {t.reportCloseBtn}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900">{t.reportTitle}</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {t.reportingLabel} <span className="font-medium text-gray-900">{targetName}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.reportTypeLabel} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {reportTypes.map((rt) => (
                    <label key={rt.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="reportType"
                        value={rt.value}
                        checked={type === rt.value}
                        onChange={() => setType(rt.value)}
                        className="w-4 h-4 accent-[#EE4D2D]"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{rt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.reportDescLabel} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder={t.reportDescPlaceholder}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent outline-none resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{description.length}/1000</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.reportSubmitting : t.reportSubmitBtn}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
