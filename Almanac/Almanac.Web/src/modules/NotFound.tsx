import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, useI18n } from 'archon-ui'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="p-6">
      <EmptyState icon={<FileQuestion size={40} />} title={t('web.notFound.title')} description={t('web.notFound.description')} action={<Button onClick={() => navigate('/')}>{t('web.notFound.back')}</Button>} />
    </div>
  )
}
