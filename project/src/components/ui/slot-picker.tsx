import * as React from 'react'
import { addDays, format, isSameDay, type Locale } from 'date-fns'
import { Calendar, Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

export type Slot = { date: Date; time: string }

type SlotPickerProps = {
  value?: Slot | null
  onChange?: (slot: Slot | null) => void
  days?: number
  times?: string[]
  locale?: Locale
  className?: string
  invalid?: boolean
  dayLabel?: string
  timeLabel?: string
  selectedLabel?: (slot: Slot) => string
}

const DEFAULT_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

export const SlotPicker = React.forwardRef<HTMLDivElement, SlotPickerProps>(
  (
    {
      value,
      onChange,
      days = 7,
      times = DEFAULT_TIMES,
      locale,
      className,
      invalid,
      dayLabel = 'Pick a day',
      timeLabel = 'Pick a time',
      selectedLabel,
    },
    ref,
  ) => {
    const dayList = React.useMemo(() => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return Array.from({ length: days }, (_, i) => addDays(start, i + 1))
    }, [days])

    const [selectedDay, setSelectedDay] = React.useState<Date>(
      value?.date ?? dayList[0],
    )

    const toggle = (day: Date, time: string) => {
      if (value && isSameDay(value.date, day) && value.time === time) {
        onChange?.(null)
      } else {
        onChange?.({ date: day, time })
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-border bg-background p-4',
          invalid && 'border-red-400',
          className,
        )}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{dayLabel}</span>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {dayList.map((day) => {
            const active = isSameDay(day, selectedDay)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'flex min-w-[64px] flex-col items-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50',
                )}
              >
                <span className="opacity-70">
                  {format(day, 'EEE', { locale })}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {format(day, 'd', { locale })}
                </span>
                <span className="opacity-70">
                  {format(day, 'MMM', { locale })}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>{timeLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {times.map((time) => {
            const checked =
              !!value &&
              isSameDay(value.date, selectedDay) &&
              value.time === time
            const id = `slot-${format(selectedDay, 'yyyy-MM-dd')}-${time}`
            return (
              <label
                key={time}
                htmlFor={id}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50',
                )}
              >
                <span>{time}</span>
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => toggle(selectedDay, time)}
                />
              </label>
            )
          })}
        </div>

        {value && (
          <p className="mt-3 text-xs text-muted-foreground">
            {selectedLabel
              ? selectedLabel(value)
              : `${format(value.date, 'PPP', { locale })} · ${value.time}`}
          </p>
        )}
      </div>
    )
  },
)
SlotPicker.displayName = 'SlotPicker'
