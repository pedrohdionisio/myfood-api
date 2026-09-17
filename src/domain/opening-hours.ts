import { DomainError } from './errors.js'

const MINUTES_IN_DAY = 1440
const MINUTES_IN_WEEK = 10080

const WEEKDAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const WEEKDAY_NAMES = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado'
]

export interface IShift {
  dayOfWeek: number
  opensAt: string
  closesAt: string
}

interface IWeeklyInterval {
  shift: IShift
  start: number
  end: number
}

function toMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':')

  return Number(hours) * 60 + Number(minutes)
}

function describe(shift: IShift): string {
  return `${WEEKDAY_NAMES[shift.dayOfWeek] ?? shift.dayOfWeek} ${shift.opensAt}–${shift.closesAt}`
}

// Turno que vira a madrugada ocupa tempo do dia seguinte, então a sobreposição é apurada sobre a
// semana inteira em minutos, não dia a dia: sexta 18:00–02:00 conflita com sábado 01:00–05:00.
function toWeeklyIntervals(shift: IShift): IWeeklyInterval[] {
  const opens = toMinutes(shift.opensAt)
  const closes = toMinutes(shift.closesAt)
  const start = shift.dayOfWeek * MINUTES_IN_DAY + opens
  const end = start + (closes > opens ? closes - opens : MINUTES_IN_DAY - opens + closes)

  if (end <= MINUTES_IN_WEEK) {
    return [{ shift, start, end }]
  }

  return [
    { shift, start, end: MINUTES_IN_WEEK },
    { shift, start: 0, end: end - MINUTES_IN_WEEK }
  ]
}

const weeklyMinuteFormatters = new Map<string, Intl.DateTimeFormat>()

function weeklyMinuteFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = weeklyMinuteFormatters.get(timeZone)

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
    weeklyMinuteFormatters.set(timeZone, formatter)
  }

  return formatter
}

function toWeeklyMinute(date: Date, timeZone: string): number {
  const parts = weeklyMinuteFormatter(timeZone).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  const dayOfWeek = WEEKDAY_ABBREVIATIONS.indexOf(read('weekday'))

  if (dayOfWeek < 0) {
    throw new Error(`Intl devolveu um dia da semana inesperado: ${read('weekday')}`)
  }

  return dayOfWeek * MINUTES_IN_DAY + Number(read('hour')) * 60 + Number(read('minute'))
}

export function isOpenAt(shifts: IShift[], date: Date, timeZone: string): boolean {
  const minute = toWeeklyMinute(date, timeZone)

  return shifts
    .flatMap(toWeeklyIntervals)
    .some((interval) => minute >= interval.start && minute < interval.end)
}

export function validateOpeningHours(shifts: IShift[]): void {
  for (const shift of shifts) {
    if (shift.opensAt === shift.closesAt) {
      throw new DomainError(
        `Turno de ${describe(shift)} abre e fecha no mesmo horário.`,
        `O turno de ${WEEKDAY_NAMES[shift.dayOfWeek] ?? shift.dayOfWeek} abre e fecha às ${shift.opensAt}. Para cobrir o dia inteiro, use 00:00 às 23:59.`
      )
    }
  }

  const intervals = shifts
    .flatMap(toWeeklyIntervals)
    .sort((left, right) => left.start - right.start)

  let previous: IWeeklyInterval | undefined

  for (const current of intervals) {
    if (previous && current.start < previous.end) {
      throw new DomainError(
        `Turnos sobrepostos: ${describe(previous.shift)} e ${describe(current.shift)}.`,
        `O turno de ${describe(previous.shift)} se sobrepõe ao de ${describe(current.shift)}.`,
        { shifts: [previous.shift, current.shift] }
      )
    }

    previous = current
  }
}
