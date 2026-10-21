export function formatDate(value?: string | null, locale = 'pt-BR'): string {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function formatDateTime(value?: string | null, locale = 'pt-BR'): string {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatRelative(value?: string | null, locale = 'pt-BR'): string {
  if (!value) {
    return ''
  }

  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit)
    }
  }

  return formatter.format(0, 'second')
}

export function formatNumber(value: number, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function fillTemplate(text: string, ...values: (string | number)[]): string {
  return values.reduce<string>((current, value, index) => current.replaceAll(`{${index}}`, String(value)), text)
}
