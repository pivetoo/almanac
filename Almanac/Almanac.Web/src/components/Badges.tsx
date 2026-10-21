import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useI18n } from 'archon-ui'
import { statusHintKey, statusLabelKey, statusVariant, typeIcon, typeLabelKey } from '../lib/docMeta'
import type { DocumentStatusValue, DocumentTypeValue } from '../types/almanac'

export function StatusBadge({ status }: { status: DocumentStatusValue }) {
  const { t } = useI18n()

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Badge variant={statusVariant[status]} dot>
              {t(statusLabelKey[status])}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t(statusHintKey[status])}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function TypeBadge({ type }: { type: DocumentTypeValue }) {
  const { t } = useI18n()
  const Icon = typeIcon[type]

  return (
    <Badge variant="soft-neutral" className="gap-1">
      <Icon size={12} />
      {t(typeLabelKey[type])}
    </Badge>
  )
}
