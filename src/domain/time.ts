export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo'

const businessDateFormatters = new Map<string, Intl.DateTimeFormat>()

function businessDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = businessDateFormatters.get(timeZone)

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    businessDateFormatters.set(timeZone, formatter)
  }

  return formatter
}

/**
 * Dia de negócio como YYYY-MM-DD no fuso do restaurante. Um pedido das 23h de sexta pertence a
 * sexta, não a sábado UTC — en-CA já formata nessa ordem, sem montagem manual.
 */
export function toBusinessDate(date: Date, timeZone: string = BUSINESS_TIME_ZONE): string {
  return businessDateFormatter(timeZone).format(date)
}
