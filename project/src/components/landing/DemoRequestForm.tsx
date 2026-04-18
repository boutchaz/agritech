import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isValidPhoneNumber } from 'react-phone-number-input'
import { format, type Locale } from 'date-fns'
import { enUS, fr, arMA } from 'date-fns/locale'
import type { TFunction } from 'i18next'
import { Loader2 } from 'lucide-react'

import FormField from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { SlotPicker, type Slot } from '@/components/ui/slot-picker'

const createSchema = (tr: TFunction) => {
  const m = (key: string, fallback: string) => tr(key, { defaultValue: fallback })
  return z.object({
    name: z.string().min(2, m('landing.contact.validation.name', 'Enter your full name')),
    email: z
      .email(m('landing.contact.validation.emailInvalid', 'Invalid email'))
      .min(1, m('landing.contact.validation.emailRequired', 'Email required')),
    phone: z
      .string()
      .min(1, m('landing.contact.validation.phoneRequired', 'Phone required'))
      .refine(
        (v) => isValidPhoneNumber(v),
        m('landing.contact.validation.phoneInvalid', 'Invalid phone number'),
      ),
    size: z.string().min(1, m('landing.contact.validation.sizeRequired', 'Select farm size')),
    message: z.string().optional(),
    slot: z.custom<Slot>(
      (v) => !!v && v instanceof Object && 'date' in v && 'time' in v,
      { message: m('landing.contact.validation.slotRequired', 'Pick a time slot') },
    ),
  })
}

type FormData = z.infer<ReturnType<typeof createSchema>>

const LOCALE_MAP: Record<string, Locale> = { en: enUS, fr, ar: arMA }

export function DemoRequestForm() {
  const { t, i18n } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const locale = LOCALE_MAP[i18n.language] ?? enUS

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      size: '',
      message: '',
      slot: undefined as unknown as Slot,
    },
  })

  const onSubmit = async (data: FormData) => {
    const slot = data.slot
    const body =
      `Name: ${data.name}%0A` +
      `Email: ${data.email}%0A` +
      `Phone: ${data.phone}%0A` +
      `Farm Size: ${data.size}%0A` +
      `Slot: ${format(slot.date, 'PPP', { locale })} ${slot.time}%0A` +
      `Message: ${data.message ?? ''}`
    window.location.assign(`mailto:contact@agrogina.com?subject=Demo Request&body=${body}`)
    toast.success(t('landing.contact.success', 'Demo request sent'))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label={t('landing.contact.formName')}
          htmlFor="demo-name"
          required
          error={errors.name?.message}
        >
          <Input
            id="demo-name"
            autoComplete="name"
            invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>

        <FormField
          label={t('landing.contact.formEmail')}
          htmlFor="demo-email"
          required
          error={errors.email?.message}
        >
          <Input
            id="demo-email"
            type="email"
            autoComplete="email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label={t('landing.contact.formPhone')}
          htmlFor="demo-phone"
          required
          error={errors.phone?.message}
        >
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                id="demo-phone"
                international
                defaultCountry="MA"
                value={field.value}
                onChange={(v) => field.onChange(v ?? '')}
                invalid={!!errors.phone}
              />
            )}
          />
        </FormField>

        <FormField
          label={t('landing.contact.formSize')}
          htmlFor="demo-size"
          required
          error={errors.size?.message}
        >
          <NativeSelect
            id="demo-size"
            invalid={!!errors.size}
            {...register('size')}
          >
            <option value="">{t('landing.contact.formSizePlaceholder')}</option>
            <option value="1">{t('landing.contact.formSize1')}</option>
            <option value="2">{t('landing.contact.formSize2')}</option>
            <option value="3">{t('landing.contact.formSize3')}</option>
            <option value="4">{t('landing.contact.formSize4')}</option>
          </NativeSelect>
        </FormField>
      </div>

      <FormField
        label={t('landing.contact.formSlot', 'Preferred demo slot')}
        required
        error={errors.slot?.message as string | undefined}
      >
        <Controller
          name="slot"
          control={control}
          render={({ field }) => (
            <SlotPicker
              value={field.value ?? null}
              onChange={(v) => field.onChange(v ?? undefined)}
              locale={locale}
              invalid={!!errors.slot}
              dayLabel={t('landing.contact.slotPickDay', 'Pick a day')}
              timeLabel={t('landing.contact.slotPickTime', 'Pick a time')}
            />
          )}
        />
      </FormField>

      <FormField
        label={t('landing.contact.formMsg')}
        htmlFor="demo-message"
      >
        <Textarea id="demo-message" rows={3} {...register('message')} />
      </FormField>

      <Button
        type="submit"
        variant="default"
        size="lg"
        disabled={isSubmitting}
        className="min-h-[52px] w-full text-base font-semibold"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('landing.contact.submit')}
      </Button>
    </form>
  )
}

export default DemoRequestForm
