import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type DragEventHandler,
  type PointerEventHandler,
  type ReactNode,
  type SubmitEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { getPublicTemplate, uploadLogo } from '../../../features/templates/api/publicTemplatesApi'
import {
  CENTERED_PLACEMENT,
  FULL_CROP,
  exportLogo,
  getAcceptValue,
  getDownloadName,
  getLogoGeometry,
  hasOwnBackground,
  loadLogo,
  removeBackground,
  suggestCrop,
  type CropArea,
  type LoadedLogo,
  type Placement,
} from '../../../features/templates/lib/logoFile'
import {
  describeBackground,
  describePadding,
  describeUploadFormats,
  getFormatLabel,
} from '../../../features/templates/lib/templateText'
import type { Logo, Template } from '../../../features/templates/model/templates.types'
import { ApiError } from '../../../shared/api/apiClient'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Brand } from '../../../shared/ui/Brand'
import { FormField } from '../../../shared/ui/FormField'
import { getErrorProps } from '../../../shared/ui/getErrorProps'
import { CropTour } from './CropTour'
import { LogoCanvas } from './LogoCanvas'
import { SentStep } from './SentStep'

type LoadState = { templateId: string } & (
  | { status: 'loading' }
  | { status: 'ready'; template: Template }
  | { message: string; status: 'error' }
  | { message: string; status: 'missing' }
)

const SNAP_DISTANCE = 0.01
const MAX_STRETCH = 1.5

function snapToCenter(position: number, available: number, size: number): number {
  return Math.abs((position - 0.5) * available) < size * SNAP_DISTANCE ? 0.5 : position
}

function describeOffset(x: number, y: number): string {
  const parts = []
  if (x) {
    parts.push(`${x > 0 ? '→' : '←'} ${Math.abs(x)} px`)
  }
  if (y) {
    parts.push(`${y > 0 ? '↓' : '↑'} ${Math.abs(y)} px`)
  }
  return parts.length > 0 ? parts.join(', ') : 'по центру'
}

function PublicStatus({ message, title }: Readonly<{ message: string; title: string }>) {
  return (
    <main className="status-page">
      <p className="status-page__code">Cropper</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <Link className="button-link button-link--large" to={routePaths.home} viewTransition>
        На главную
      </Link>
    </main>
  )
}

function RecipientPageSkeleton() {
  return (
    <div aria-busy="true" className="recipient-page page-skeleton">
      <RecipientHeader />
      <output className="visually-hidden">Загружаем параметры шаблона…</output>
      <main aria-hidden="true" className="recipient-main">
        <div className="recipient-title skeleton-stack">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-line skeleton-line--large" />
        </div>
        <div className="recipient-grid">
          <section className="panel recipient-workspace recipient-workspace--skeleton">
            <span className="skeleton skeleton-subheading" />
            <span className="skeleton recipient-stage" />
          </section>
          <aside className="panel recipient-sidebar skeleton-stack skeleton-stack--roomy">
            <span className="skeleton skeleton-subheading" />
            <span className="skeleton skeleton-line skeleton-line--medium" />
            <span className="skeleton skeleton-line skeleton-line--large" />
            <span className="skeleton skeleton-line skeleton-line--medium" />
          </aside>
        </div>
      </main>
    </div>
  )
}

export function Component() {
  const { templateId = '' } = useParams()
  const [result, setResult] = useState<LoadState | null>(null)
  const load: LoadState =
    result?.templateId === templateId ? result : { status: 'loading', templateId }

  useEffect(() => {
    let isCurrent = true

    getPublicTemplate(templateId)
      .then(
        (template) => isCurrent && setResult({ status: 'ready', template, templateId }),
      )
      .catch((error: unknown) => {
        if (!isCurrent) {
          return
        }
        if (error instanceof ApiError && error.status === 404) {
          setResult({
            message: 'Проверьте адрес ссылки или попросите организатора прислать новую.',
            status: 'missing',
            templateId,
          })
          return
        }
        setResult({
          message: 'Не удалось связаться с сервером. Обновите страницу и попробуйте ещё раз.',
          status: 'error',
          templateId,
        })
      })

    return () => {
      isCurrent = false
    }
  }, [templateId])

  if (load.status === 'loading') {
    return <RecipientPageSkeleton />
  }

  if (load.status === 'missing') {
    return <PublicStatus message={load.message} title="Ссылка не найдена" />
  }

  if (load.status === 'error') {
    return <PublicStatus message={load.message} title="Не удалось открыть ссылку" />
  }

  if (!load.template.is_open) {
    return (
      <PublicStatus
        message="Организатор больше не принимает логотипы по этой ссылке. Свяжитесь с ним, если вам всё ещё нужно подготовить файл."
        title="Сбор логотипов завершён"
      />
    )
  }

  return <RecipientEditor template={load.template} />
}

function RecipientEditor({ template }: Readonly<{ template: Template }>) {
  const [source, setSource] = useState<LoadedLogo | null>(null)
  const [cleaned, setCleaned] = useState<LoadedLogo | null>(null)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [crop, setCrop] = useState<CropArea>(FULL_CROP)
  const [placement, setPlacement] = useState<Placement>(CENTERED_PLACEMENT)
  const [fileError, setFileError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const sending = useLogoSending(template.id)
  const sent = sending.sent
  const selectionId = useRef(0)
  const logo = cleaned ?? source
  useRevokeOnChange(source)
  useRevokeOnChange(cleaned)

  async function selectFile(file: File) {
    const currentSelection = selectionId.current + 1
    selectionId.current = currentSelection
    setFileError(null)
    setExportError(null)
    setIsPreparing(true)

    try {
      const nextLogo = await loadLogo(file, template.upload_formats)
      if (selectionId.current !== currentSelection) {
        URL.revokeObjectURL(nextLogo.url)
        return
      }
      setSource(nextLogo)
      setCleaned(null)
      setBackgroundError(null)
      setCrop(suggestCrop(nextLogo.image))
      setPlacement(CENTERED_PLACEMENT)
      setIsCropping(false)
    } catch (error) {
      if (selectionId.current === currentSelection) {
        setFileError(error instanceof Error ? error.message : 'Не удалось прочитать файл')
      }
    } finally {
      if (selectionId.current === currentSelection) {
        setIsPreparing(false)
      }
    }
  }

  function replaceFile() {
    selectionId.current += 1
    setSource(null)
    setCleaned(null)
    setFileError(null)
    setExportError(null)
  }

  async function clearBackground() {
    if (!source) {
      return
    }
    const currentSelection = selectionId.current
    setBackgroundError(null)
    setIsRemovingBackground(true)

    try {
      const result = await removeBackground(source)
      if (selectionId.current === currentSelection) {
        setCleaned(result)
      } else {
        URL.revokeObjectURL(result.url)
      }
    } catch (error) {
      setBackgroundError(error instanceof Error ? error.message : 'Не удалось убрать фон')
    } finally {
      setIsRemovingBackground(false)
    }
  }

  async function download() {
    if (!logo) {
      return
    }
    setExportError(null)

    try {
      const url = URL.createObjectURL(await exportLogo({ crop, logo, placement, template }))
      const link = document.createElement('a')
      link.href = url
      link.download = getDownloadName(logo.fileName, template)
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Не удалось подготовить файл')
    }
  }

  // организатору всегда уходит PNG, в формат шаблона его переводит сервер при скачивании
  const preparePng = () => {
    if (!logo) {
      return Promise.reject(new Error('Логотип не загружен'))
    }
    return exportLogo({ crop, logo, placement, template }, 'png')
  }

  if (sent && logo) {
    return (
      <div className="recipient-page">
        <RecipientHeader />
        <main className="recipient-main">
          <header className="recipient-title">
            <h1>Логотип отправлен</h1>
            <p className="recipient-title__meta">{template.name} · Подготовка логотипа завершена</p>
          </header>
          <SentStep
            crop={crop}
            fileName={getDownloadName(logo.fileName, template)}
            logo={logo}
            onDownload={() => void download()}
            placement={placement}
            sent={sent}
            template={template}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="recipient-page">
      <RecipientHeader />
      <main className="recipient-main">
        <header className="recipient-title">
          <h1>{logo ? 'Разместите и отправьте логотип' : 'Загрузите логотип'}</h1>
          <p className="recipient-title__meta">
            {template.name} · {template.width} × {template.height} px ·{' '}
            {getFormatLabel(template.output_format)}
          </p>
        </header>

        {logo === null ? (
          <UploadStep
            error={fileError}
            isPreparing={isPreparing}
            onSelect={(file) => void selectFile(file)}
            template={template}
          />
        ) : null}
        {logo && isCropping ? (
          <CropStep
            crop={crop}
            logo={logo}
            onApply={() => setIsCropping(false)}
            onChange={setCrop}
            onReplace={replaceFile}
          />
        ) : null}
        {logo && !isCropping ? (
          <PlacementStep
            crop={crop}
            exportError={exportError}
            logo={logo}
            onChange={setPlacement}
            background={{
              error: backgroundError,
              isRemoved: cleaned !== null,
              isRemoving: isRemovingBackground,
              onRemove: () => void clearBackground(),
              onRestore: () => setCleaned(null),
            }}
            onCrop={() => setIsCropping(true)}
            onDownload={() => void download()}
            onReplace={replaceFile}
            onSend={(company) => void sending.send(company, preparePng)}
            placement={placement}
            sendError={sending.error}
            isSending={sending.isSending}
            template={template}
          />
        ) : null}
      </main>
    </div>
  )
}

function useRevokeOnChange(logo: LoadedLogo | null) {
  useEffect(() => {
    return () => {
      if (logo) {
        URL.revokeObjectURL(logo.url)
      }
    }
  }, [logo])
}

function useLogoSending(templateId: string) {
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState<Logo | null>(null)

  async function send(company: string, preparePng: () => Promise<Blob>) {
    setError(null)
    setIsSending(true)

    try {
      setSent(await uploadLogo(templateId, company, await preparePng()))
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? getErrorMessage(requestError)
          : 'Не удалось отправить логотип. Попробуйте ещё раз.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return { error, isSending, send, sent }
}

function RecipientHeader() {
  return (
    <header className="recipient-header">
      <Link aria-label="Cropper — на главную" className="recipient-header__brand" to={routePaths.home} viewTransition>
        <Brand label="Cropper" withMark />
      </Link>
    </header>
  )
}

interface UploadStepProps {
  error: string | null
  isPreparing: boolean
  onSelect: (file: File) => void
  template: Template
}

function UploadStep({ error, isPreparing, onSelect, template }: Readonly<UploadStepProps>) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      onSelect(file)
    }
    event.target.value = ''
  }
  const handleDrop: DragEventHandler<HTMLLabelElement> = (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      onSelect(file)
    }
  }
  const formats = describeUploadFormats(template.upload_formats)
  const transparentFormats = template.upload_formats.filter((format) => format !== 'jpg')

  return (
    <div className="recipient-grid">
      <section className="panel recipient-workspace">
        <h2>Загрузите логотип</h2>
        {error ? <p className="recipient-error" role="alert">{error}</p> : null}
        <div className="recipient-stage recipient-stage--upload">
          <label
            className={error ? 'recipient-dropzone recipient-dropzone--error' : 'recipient-dropzone'}
            htmlFor="recipient-logo"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              accept={getAcceptValue(template.upload_formats)}
              id="recipient-logo"
              onChange={handleChange}
              type="file"
            />
            <strong>{isPreparing ? 'Проверяем файл…' : 'Перетащите сюда логотип'}</strong>
            <span>или выберите файл на компьютере</span>
            <span className="primary-button" aria-hidden="true">Выбрать файл</span>
            <small>{formats} · до 10 МБ</small>
          </label>
        </div>
      </section>

      <TemplateRequirements template={template}>
        <h2>Какой файл выбрать</h2>
        <p>Принимаются файлы {formats}, до 10 МБ.</p>
        {transparentFormats.length > 0 ? (
          <p>Лучше всего подойдёт {describeUploadFormats(transparentFormats)} с прозрачным фоном.</p>
        ) : null}
        {template.upload_formats.includes('jpg') ? (
          <p>У JPG лишние поля убираются на следующем шаге.</p>
        ) : null}
      </TemplateRequirements>
    </div>
  )
}

function TemplateRequirements({
  children,
  template,
}: Readonly<{ children?: ReactNode; template: Template }>) {
  return (
    <aside className="panel recipient-sidebar recipient-requirements">
      <h2>Требования</h2>
      <dl className="recipient-specs">
        <div>
          <dt>Плашка</dt>
          <dd>{template.width} × {template.height} px</dd>
        </div>
        <div>
          <dt>Готовый файл</dt>
          <dd>{getFormatLabel(template.output_format)}</dd>
        </div>
        <div>
          <dt>Фон</dt>
          <dd>{describeBackground(template.background_color)}</dd>
        </div>
        <div>
          <dt>Отступы</dt>
          <dd>{describePadding(template)}</dd>
        </div>
      </dl>
      {template.description ? (
        <p className="recipient-note">{template.description}</p>
      ) : null}
      {children}
    </aside>
  )
}

interface CropStepProps {
  crop: CropArea
  logo: LoadedLogo
  onApply: () => void
  onChange: (crop: CropArea) => void
  onReplace: () => void
}

interface CropInteraction {
  crop: CropArea
  mode: 'move' | 'ne' | 'nw' | 'se' | 'sw'
  startX: number
  startY: number
}

function CropStep({ crop, logo, onApply, onChange, onReplace }: Readonly<CropStepProps>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const interaction = useRef<CropInteraction | null>(null)

  const beginInteraction = (
    mode: CropInteraction['mode'],
  ): PointerEventHandler<HTMLElement> => (event) => {
    event.preventDefault()
    event.stopPropagation()
    viewportRef.current?.setPointerCapture(event.pointerId)
    interaction.current = { crop, mode, startX: event.clientX, startY: event.clientY }
  }

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const active = interaction.current
    const viewport = viewportRef.current
    if (!active || !viewport) {
      return
    }

    const bounds = viewport.getBoundingClientRect()
    const dx = (event.clientX - active.startX) / bounds.width
    const dy = (event.clientY - active.startY) / bounds.height
    const minimum = 0.04
    let { height, width, x, y } = active.crop

    if (active.mode === 'move') {
      x = Math.min(1 - width, Math.max(0, x + dx))
      y = Math.min(1 - height, Math.max(0, y + dy))
    } else {
      if (active.mode.includes('w')) {
        const nextX = Math.min(x + width - minimum, Math.max(0, x + dx))
        width += x - nextX
        x = nextX
      }
      if (active.mode.includes('e')) {
        width = Math.min(1 - x, Math.max(minimum, width + dx))
      }
      if (active.mode.includes('n')) {
        const nextY = Math.min(y + height - minimum, Math.max(0, y + dy))
        height += y - nextY
        y = nextY
      }
      if (active.mode.includes('s')) {
        height = Math.min(1 - y, Math.max(minimum, height + dy))
      }
    }

    onChange({ height, width, x, y })
  }

  const stopInteraction = () => {
    interaction.current = null
  }

  return (
    <div className="recipient-grid">
      <section className="panel recipient-workspace">
        <div className="recipient-workspace__head">
          <div>
            <h2>Обрежьте лишние поля</h2>
            <p>{logo.fileName} · {logo.image.naturalWidth} × {logo.image.naturalHeight} px</p>
          </div>
          <button onClick={onReplace} type="button">Заменить файл</button>
        </div>
        <div className="recipient-stage recipient-stage--crop">
          <div
            className="crop-editor__viewport"
            onPointerCancel={stopInteraction}
            onPointerMove={handlePointerMove}
            onPointerUp={stopInteraction}
            ref={viewportRef}
            style={{
              aspectRatio: `${logo.image.naturalWidth} / ${logo.image.naturalHeight}`,
              width: `min(100%, ${Math.min(600, (340 * logo.image.naturalWidth) / logo.image.naturalHeight)}px)`,
            }}
          >
            <img alt="Загруженный логотип" draggable={false} src={logo.url} />
            <div
              className="crop-editor__shade"
              style={{
                clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x * 100}% ${crop.y * 100}%, ${crop.x * 100}% ${(crop.y + crop.height) * 100}%, ${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%, ${(crop.x + crop.width) * 100}% ${crop.y * 100}%, ${crop.x * 100}% ${crop.y * 100}%)`,
              }}
            />
            <div
              className="crop-editor__frame"
              data-tour="frame"
              onPointerDown={beginInteraction('move')}
              style={{
                height: `${crop.height * 100}%`,
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.width * 100}%`,
              }}
            >
              {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                <button
                  aria-label={`Изменить рамку: ${corner}`}
                  className={`crop-editor__handle crop-editor__handle--${corner}`}
                  key={corner}
                  onPointerDown={beginInteraction(corner)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
        <p className="recipient-workspace__hint">
          Перетащите края рамки, чтобы убрать лишние поля. Сам логотип не обрезайте.
        </p>
      </section>

      <aside className="panel recipient-sidebar recipient-crop-actions">
        <h2>Рамка обрезки</h2>
        <button
          className="outline-button recipient-autocrop"
          data-tour="auto"
          onClick={() => onChange(suggestCrop(logo.image))}
          type="button"
        >
          Автообрезка
        </button>
        <p>Рамка уже стоит по краям логотипа. Если нужно, поправьте её.</p>
        <button className="primary-button" data-tour="apply" onClick={onApply} type="button">
          Применить обрезку
        </button>
        <button onClick={() => { onChange(FULL_CROP); onApply() }} type="button">
          Продолжить без обрезки
        </button>
      </aside>
      <CropTour />
    </div>
  )
}

interface BackgroundControl {
  error: string | null
  isRemoved: boolean
  isRemoving: boolean
  onRemove: () => void
  onRestore: () => void
}

interface PlacementStepProps {
  background: BackgroundControl
  crop: CropArea
  exportError: string | null
  isSending: boolean
  logo: LoadedLogo
  onChange: (placement: Placement) => void
  onCrop: () => void
  onDownload: () => void
  onReplace: () => void
  onSend: (company: string) => void
  placement: Placement
  sendError: string | null
  template: Template
}

function PlacementStep({
  background,
  crop,
  exportError,
  isSending,
  logo,
  onChange,
  onCrop,
  onDownload,
  onReplace,
  onSend,
  placement,
  sendError,
  template,
}: Readonly<PlacementStepProps>) {
  const plateRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ placement: Placement; x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const hasBackground = useMemo(
    () => hasOwnBackground(logo.image, template.background_color),
    [logo, template.background_color],
  )

  const geometry = getLogoGeometry(logo, crop, template, placement)
  const safeWidth = template.width - template.padding_left - template.padding_right
  const safeHeight = template.height - template.padding_top - template.padding_bottom
  const offsetX = Math.round((safeWidth - geometry.width) * (placement.x - 0.5))
  const offsetY = Math.round((safeHeight - geometry.height) * (placement.y - 0.5))
  const isStretched = logo.sourceFormat !== 'svg' && geometry.width / geometry.sourceWidth > MAX_STRETCH

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { placement, x: event.clientX, y: event.clientY }
    setIsDragging(true)
  }

  const stopDragging = () => {
    dragStart.current = null
    setIsDragging(false)
  }

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const start = dragStart.current
    const plate = plateRef.current
    if (!start || !plate) {
      return
    }

    const bounds = plate.getBoundingClientRect()
    const availableX = safeWidth - geometry.width
    const availableY = safeHeight - geometry.height
    const deltaX = ((event.clientX - start.x) / bounds.width) * template.width
    const deltaY = ((event.clientY - start.y) / bounds.height) * template.height
    const x = availableX > 0 ? Math.min(1, Math.max(0, start.placement.x + deltaX / availableX)) : 0.5
    const y = availableY > 0 ? Math.min(1, Math.max(0, start.placement.y + deltaY / availableY)) : 0.5

    onChange({
      ...placement,
      x: snapToCenter(x, availableX, template.width),
      y: snapToCenter(y, availableY, template.height),
    })
  }

  return (
    <div className="recipient-grid">
      <section className="panel recipient-workspace">
        <div className="recipient-workspace__head">
          <div><h2>Логотип на плашке</h2><p>{logo.fileName}</p></div>
          <div>
            <button onClick={onCrop} type="button">Обрезать</button>
            <button onClick={onReplace} type="button">Заменить файл</button>
          </div>
        </div>
        <div className="recipient-stage recipient-stage--placement">
          <div
            className={template.background_color ? 'placement-plate' : 'placement-plate plate--transparent'}
            onPointerCancel={stopDragging}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            ref={plateRef}
            style={{
              aspectRatio: `${template.width} / ${template.height}`,
              width: `min(100%, ${Math.round(Math.min(600, (380 * template.width) / template.height))}px)`,
            }}
          >
            <LogoCanvas crop={crop} logo={logo} placement={placement} template={template} />
            <div
              className="placement-plate__safe-area"
              style={{
                bottom: `${(template.padding_bottom / template.height) * 100}%`,
                left: `${(template.padding_left / template.width) * 100}%`,
                right: `${(template.padding_right / template.width) * 100}%`,
                top: `${(template.padding_top / template.height) * 100}%`,
              }}
            />
            {isDragging ? (
              <>
                <div
                  className={`placement-plate__guide placement-plate__guide--vertical${offsetX ? '' : ' placement-plate__guide--centered'}`}
                  style={{ left: `${((template.padding_left + safeWidth / 2) / template.width) * 100}%` }}
                />
                <div
                  className={`placement-plate__guide placement-plate__guide--horizontal${offsetY ? '' : ' placement-plate__guide--centered'}`}
                  style={{ top: `${((template.padding_top + safeHeight / 2) / template.height) * 100}%` }}
                />
              </>
            ) : null}
          </div>
        </div>
        <div className="recipient-scale">
          <label htmlFor="logo-scale">Размер</label>
          <input
            id="logo-scale"
            max="100"
            min="20"
            onChange={(event) => onChange({ ...placement, scale: Number(event.target.value) })}
            type="range"
            value={placement.scale}
          />
          <output htmlFor="logo-scale">{placement.scale} %</output>
          <button className="outline-button" onClick={() => onChange({ ...placement, x: 0.5, y: 0.5 })} type="button">
            Центрировать
          </button>
          <span>{describeOffset(offsetX, offsetY)}</span>
        </div>
        <p className="recipient-workspace__hint">
          Логотип можно перетаскивать. Оранжевая рамка — охранная зона, в готовый файл она не попадёт.
        </p>
        {isStretched ? (
          <p aria-atomic="true" aria-live="polite" className="recipient-warning">
            Логотип растянут больше исходного размера и может выглядеть размытым. Загрузите файл
            покрупнее или оставьте этот.
          </p>
        ) : null}
        {hasBackground ? (
          <div className="recipient-warning">
            <p>
              У логотипа свой фон — на плашке будет виден прямоугольник. Можно убрать его
              автоматически или загрузить PNG с прозрачным фоном или SVG.
            </p>
            <button
              className="outline-button"
              disabled={background.isRemoving}
              onClick={background.onRemove}
              type="button"
            >
              {background.isRemoving ? 'Убираем фон…' : 'Убрать фон'}
            </button>
          </div>
        ) : null}
        {background.isRemoved ? (
          <div className="recipient-notice">
            <p>Фон убран. Проверьте края логотипа на плашке.</p>
            <button className="outline-button" onClick={background.onRestore} type="button">
              Вернуть фон
            </button>
          </div>
        ) : null}
        {background.error ? <p className="recipient-error" role="alert">{background.error}</p> : null}
      </section>

      <TemplateRequirements template={template}>
        <SendForm
          error={sendError ?? exportError}
          format={getFormatLabel(template.output_format)}
          isSending={isSending}
          onDownload={onDownload}
          onSend={onSend}
        />
      </TemplateRequirements>
    </div>
  )
}

interface SendFormProps {
  error: string | null
  format: string
  isSending: boolean
  onDownload: () => void
  onSend: (company: string) => void
}

function SendForm({ error, format, isSending, onDownload, onSend }: Readonly<SendFormProps>) {
  const [company, setCompany] = useState('')
  const [isChecked, setIsChecked] = useState(false)
  const name = company.trim()
  const companyError = isChecked && !name ? 'Укажите название компании' : undefined

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsChecked(true)
    if (name) {
      onSend(name)
    }
  }

  return (
    <form className="recipient-send" noValidate onSubmit={handleSubmit}>
      <FormField error={companyError} htmlFor="company" label="Название компании">
        <input
          {...getErrorProps('company', companyError)}
          autoComplete="organization"
          id="company"
          maxLength={100}
          name="company"
          onChange={(event) => setCompany(event.target.value)}
          placeholder="ООО «Ромашка»"
          value={company}
        />
      </FormField>
      {error ? <p className="recipient-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={isSending} type="submit">
        {isSending ? 'Отправляем…' : 'Отправить организатору'}
      </button>
      <button className="outline-button" onClick={onDownload} type="button">
        Скачать {format} себе
      </button>
    </form>
  )
}
