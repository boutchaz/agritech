import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useSearch } from '@tanstack/react-router'
import { submitSiamRdv } from '@/lib/api/public-rdv'

const days = [
  { label: 'Lun 20/04', date: '20/04' },
  { label: 'Mar 21/04', date: '21/04' },
  { label: 'Mer 22/04', date: '22/04' },
  { label: 'Jeu 23/04', date: '23/04' },
  { label: 'Ven 24/04', date: '24/04' },
  { label: 'Sam 25/04', date: '25/04' },
  { label: 'Dim 26/04', date: '26/04' },
  { label: 'Lun 27/04', date: '27/04' },
]

const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
const fullSlots = new Set(['20/04-09:00', '20/04-10:00', '21/04-09:00'])

const createSchema = (t: TFunction<'common'>) =>
  z.object({
    nom: z.string().min(2, t('siamRdv.validation.nameMin')),
    entreprise: z.string().optional(),
    tel: z.string().min(8, t('siamRdv.validation.phoneRequired')).regex(
      /^\+?[0-9\s\-()]{8,30}$/,
      t('siamRdv.validation.phoneInvalid', { defaultValue: 'Numéro de téléphone invalide' }),
    ),
    email: z
      .string()
      .email(t('siamRdv.validation.emailInvalid'))
      .optional()
      .or(z.literal('')),
    surface: z.string().optional(),
    region: z.string().optional(),
    culture: z.array(z.string()).optional(),
    culture_autre: z.string().optional(),
    creneau: z.string().min(1, t('siamRdv.validation.slotRequired')),
  })

type SiamRdvFormData = z.infer<ReturnType<typeof createSchema>>

export function RdvRequestPage({
  badgeText,
  title,
  subtitle,
}: {
  badgeText: string
  title: string
  subtitle: string
}) {
  const { t } = useTranslation()
  const searchParams = useSearch({ strict: false }) as Record<string, string | undefined>
  const source = searchParams?.source || undefined
  const [showCultureOther, setShowCultureOther] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedName, setSubmittedName] = useState('')
  const [submittedSlot, setSubmittedSlot] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmittingToApi, setIsSubmittingToApi] = useState(false)

  const schema = useMemo(() => createSchema(t), [t])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<SiamRdvFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      entreprise: '',
      tel: '',
      email: '',
      surface: '',
      region: '',
      culture: [],
      culture_autre: '',
      creneau: '',
    },
  })

  const slots = useMemo(
    () => days.flatMap((d) => times.map((t) => ({ key: `${d.date}-${t}`, dateLabel: d.label, time: t }))),
    [],
  )

  const selectedSlot = useWatch({ control, name: 'creneau' })

  const onSubmit = async (data: SiamRdvFormData) => {
    setSubmitError('')
    setIsSubmittingToApi(true)
    try {
      await submitSiamRdv({
        nom: data.nom,
        entreprise: data.entreprise,
        tel: data.tel,
        email: data.email,
        surface: data.surface,
        region: data.region,
        culture: data.culture,
        culture_autre: data.culture_autre,
        creneau: data.creneau,
        source,
      })
      setSubmittedName(data.nom || '')
      setSubmittedSlot(data.creneau || '')
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t('siamRdv.error.submitFailed', { defaultValue: "Impossible d'envoyer votre demande. Veuillez reessayer." }),
      )
    } finally {
      setIsSubmittingToApi(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f7f2] text-[#1a1a1a]">
      <section className="bg-[#1d6b3a] px-6 py-12 text-center">
        <span className="inline-block rounded-full bg-[#c8892a] px-4 py-1 text-xs font-medium uppercase tracking-[0.12em] text-white">
          {badgeText}
        </span>
        <h1 className="mt-5 text-3xl font-semibold text-white md:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/80 md:text-base">{subtitle}</p>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        {!submitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="rounded-xl border border-[#d9d4c7] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-[#1d6b3a]">
                {t('siamRdv.sections.info', { defaultValue: 'Vos informations' })}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  {...register('nom')}
                  placeholder={t('siamRdv.form.namePlaceholder', { defaultValue: 'Nom complet *' })}
                  className="rounded-md border border-[#d9d4c7] px-3 py-2"
                />
                <input
                  {...register('entreprise')}
                  placeholder={t('siamRdv.form.companyPlaceholder', { defaultValue: 'Entreprise / Exploitation' })}
                  className="rounded-md border border-[#d9d4c7] px-3 py-2"
                />
                <input
                  {...register('tel')}
                  placeholder={t('siamRdv.form.phonePlaceholder', { defaultValue: 'Telephone *' })}
                  className="rounded-md border border-[#d9d4c7] px-3 py-2"
                />
                <input
                  {...register('email')}
                  type="email"
                  placeholder={t('siamRdv.form.emailPlaceholder', { defaultValue: 'Email' })}
                  className="rounded-md border border-[#d9d4c7] px-3 py-2"
                />
              </div>
              {errors.nom ? <p className="mt-2 text-sm text-red-600">{errors.nom.message}</p> : null}
              {errors.tel ? <p className="mt-1 text-sm text-red-600">{errors.tel.message}</p> : null}
              {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
            </div>

            <div className="rounded-xl border border-[#d9d4c7] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-[#1d6b3a]">
                {t('siamRdv.sections.farm', { defaultValue: 'Votre exploitation' })}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <select {...register('surface')} className="rounded-md border border-[#d9d4c7] px-3 py-2">
                  <option value="">{t('siamRdv.form.surface', { defaultValue: 'Surface cultivee' })}</option>
                  <option>{t('siamRdv.surface.lt50', { defaultValue: 'Moins de 50 ha' })}</option>
                  <option>{t('siamRdv.surface.s50_150', { defaultValue: '50 - 150 ha' })}</option>
                  <option>{t('siamRdv.surface.s150_300', { defaultValue: '150 - 300 ha' })}</option>
                  <option>{t('siamRdv.surface.s300_600', { defaultValue: '300 - 600 ha' })}</option>
                  <option>{t('siamRdv.surface.gt600', { defaultValue: 'Plus de 600 ha' })}</option>
                </select>
                <select {...register('region')} className="rounded-md border border-[#d9d4c7] px-3 py-2">
                  <option value="">{t('siamRdv.form.region', { defaultValue: 'Region' })}</option>
                  <option value="Meknes-Fes">{t('siamRdv.regions.meknesFes', { defaultValue: 'Meknès-Fès' })}</option>
                  <option value="Souss-Massa">{t('siamRdv.regions.soussMassa', { defaultValue: 'Souss-Massa' })}</option>
                  <option value="Marrakech-Safi">{t('siamRdv.regions.marrakechSafi', { defaultValue: 'Marrakech-Safi' })}</option>
                  <option value="Beni Mellal-Khenifra">{t('siamRdv.regions.beniMellal', { defaultValue: 'Béni Mellal-Khénifra' })}</option>
                  <option value="Rabat-Sale">{t('siamRdv.regions.rabatSale', { defaultValue: 'Rabat-Salé' })}</option>
                  <option value="Tanger-Tetouan">{t('siamRdv.regions.tangerTetouan', { defaultValue: 'Tanger-Tétouan' })}</option>
                  <option value="Oriental">{t('siamRdv.regions.oriental', { defaultValue: 'Oriental' })}</option>
                  <option value="Autre">{t('siamRdv.regions.other', { defaultValue: 'Autre' })}</option>
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {[
                  { value: 'Olivier', labelKey: 'siamRdv.crops.olive' },
                  { value: 'Agrumes', labelKey: 'siamRdv.crops.citrus' },
                  { value: 'Avocat', labelKey: 'siamRdv.crops.avocado' },
                  { value: 'Palmier dattier', labelKey: 'siamRdv.crops.datePalm' },
                  { value: 'Cereales', labelKey: 'siamRdv.crops.cereals' },
                  { value: 'Maraichage', labelKey: 'siamRdv.crops.vegetables' },
                ].map((crop) => (
                  <label key={crop.value} className="rounded-full border border-[#d9d4c7] px-3 py-1">
                    <input {...register('culture')} value={crop.value} type="checkbox" className="mr-2" />
                    {t(crop.labelKey, { defaultValue: crop.value })}
                  </label>
                ))}
                <label className="rounded-full border border-[#d9d4c7] px-3 py-1">
                  <input
                    type="checkbox"
                    className="mr-2"
                    onChange={(e) => {
                      setShowCultureOther(e.target.checked)
                      if (!e.target.checked) setValue('culture_autre', '')
                    }}
                  />
                  {t('siamRdv.form.other', { defaultValue: 'Autre' })}
                </label>
              </div>
              {showCultureOther ? (
                <input
                  {...register('culture_autre')}
                  placeholder={t('siamRdv.form.otherCulturePlaceholder', { defaultValue: 'Precisez votre culture' })}
                  className="mt-3 w-full rounded-md border border-[#d9d4c7] px-3 py-2"
                />
              ) : null}
            </div>

            <div className="rounded-xl border border-[#d9d4c7] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-[#1d6b3a]">
                {t('siamRdv.sections.slot', { defaultValue: 'Choisissez votre creneau' })}
              </h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {slots.map((slot) => {
                  const isFull = fullSlots.has(slot.key)
                  const picked = selectedSlot === slot.key
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      disabled={isFull}
                      onClick={() => setValue('creneau', slot.key, { shouldValidate: true })}
                      className={`rounded-md border px-2 py-2 text-left text-xs ${
                        isFull
                          ? 'cursor-not-allowed border-[#d9d4c7] bg-gray-100 text-gray-400'
                          : picked
                            ? 'border-[#1d6b3a] bg-[#e8f5ec]'
                            : 'border-[#d9d4c7] bg-white hover:border-[#1d6b3a]'
                      }`}
                    >
                      <div>{slot.dateLabel}</div>
                      <div className="font-semibold">{slot.time}</div>
                    </button>
                  )
                })}
              </div>
              <input type="hidden" {...register('creneau')} />
              {errors.creneau ? <p className="mt-2 text-sm text-red-600">{errors.creneau.message}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isSubmittingToApi}
              className="w-full rounded-lg bg-[#1d6b3a] px-4 py-3 font-medium text-white hover:bg-[#2e8b50] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingToApi
                ? t('siamRdv.form.submitting', { defaultValue: 'Envoi en cours...' })
                : t('siamRdv.form.submit', { defaultValue: 'Confirmer ma demande de rendez-vous' })}
            </button>
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          </form>
        ) : (
          <div className="rounded-xl border border-[#d9d4c7] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1d6b3a]">
              {t('siamRdv.success.title', { defaultValue: 'Demande envoyee !' })}
            </h2>
            <p className="mt-2 text-[#555]">
              {t('siamRdv.success.message', {
                defaultValue: 'Bonjour {{name}}, votre demande pour le creneau {{slot}} a bien ete recue.',
                name: submittedName || t('siamRdv.success.fallbackName', { defaultValue: 'a vous' }),
                slot: submittedSlot.replace('-', ' a '),
              })}
            </p>
            <p className="mt-2 text-sm text-[#888]">
              {t('siamRdv.success.subtext', { defaultValue: 'Notre equipe vous contacte dans les 24h.' })}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

