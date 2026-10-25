import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type DragEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { getPublicTemplate } from '../../../features/templates/api/publicTemplatesApi'
import {
  CENTERED_PLACEMENT,
  FULL_CROP,
  exportLogo,
  getAcceptValue,
  getDownloadName,
  getLogoGeometry,
  loadLogo,
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
import type { Template } from '../../../features/templates/model/templates.types'
import { ApiError } from '../../../shared/api/apiClient'
import { Brand } from '../../../shared/ui/Brand'
import { LogoCanvas } from './LogoCanvas'

type LoadState = { templateId: string } & (
  | { status: 'loading' }
  | { status: 'ready'; template: Template }
  | { message: string; status: 'error' }
  | { message: string; status: 'missing' }
)

type Step = 1 | 2 | 3 | 4

const STEPS: Array<{ label: string; value: Step }> = [
  { label: 'Загрузка', value: 1 },
  { label: 'Обрезка', value: 2 },
  { label: 'Размещение', value: 3 },
  { label: 'Скачивание', value: 4 },
]

const STEP_DESCRIPTIONS: Record<Step, string> = {
  1: 'Загрузите исходный файл. Затем выберите обрезку и разместите логотип на плашке.',
  2: 'Автообрезка предложит рамку. Проверьте её и примените обрезку — после этого начнётся размещение.',
  3: 'Обрезка применена. Настройте масштаб и положение, сохраняя логотип внутри охранной зоны.',
  4: 'Предпросмотр готового файла без рамки выделения, охранной зоны и направляющих.',
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
      <p className="visually-hidden" role="status">Загружаем параметры шаблона…</p>
      <main aria-hidden="true" className="recipient-main">
        <div className="recipient-title skeleton-stack">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-line skeleton-line--large" />
        </div>
        <div className="recipient-steps recipient-steps--skeleton">
          {[0, 1, 2, 3].map((step) => <span className="skeleton" key={step} />)}
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
        if (!isCurrent) return
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
  const [step, setStep] = useState<Step>(1)
  const [logo, setLogo] = useState<LoadedLogo | null>(null)
  const [crop, setCrop] = useState<CropArea>(FULL_CROP)
  const [placement, setPlacement] = useState<Placement>(CENTERED_PLACEMENT)
  const [fileError, setFileError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [output, setOutput] = useState<Blob | null>(null)
  const selectionId = useRef(0)
  const downloadUrl = useMemo(() => (output ? URL.createObjectURL(output) : null), [output])

  useEffect(() => {
    return () => {
      if (logo) URL.revokeObjectURL(logo.url)
    }
  }, [logo])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

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
      setLogo(nextLogo)
      setCrop(suggestCrop(nextLogo.image))
      setPlacement(CENTERED_PLACEMENT)
      setOutput(null)
      setStep(2)
    } catch (error) {
      if (selectionId.current === currentSelection) {
        setFileError(error instanceof Error ? error.message : 'Не удалось прочитать файл')
      }
    } finally {
      if (selectionId.current === currentSelection) setIsPreparing(false)
    }
  }

  function replaceFile() {
    selectionId.current += 1
    setLogo(null)
    setOutput(null)
    setFileError(null)
    setExportError(null)
    setStep(1)
  }

  async function openResult() {
    if (!logo) return
    setExportError(null)
    setIsExporting(true)

    try {
      setOutput(await exportLogo(logo, crop, template, placement))
      setStep(4)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Не удалось подготовить файл')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="recipient-page">
      <RecipientHeader />
      <main className="recipient-main">
        <header className="recipient-title">
          <h1>Подготовьте логотип</h1>
          <p className="recipient-title__meta">
            {template.name} · {template.width} × {template.height} px ·{' '}
            {getFormatLabel(template.output_format)}
          </p>
          <p className="recipient-title__description">{STEP_DESCRIPTIONS[step]}</p>
        </header>

        <nav className="recipient-steps" aria-label="Этапы подготовки логотипа">
          {STEPS.map((item) => (
            <span aria-current={step === item.value ? 'step' : undefined} key={item.value}>
              {item.value}. {item.label}
            </span>
          ))}
        </nav>

        {step === 1 ? (
          <UploadStep
            error={fileError}
            isPreparing={isPreparing}
            onSelect={(file) => void selectFile(file)}
            template={template}
          />
        ) : null}
        {step === 2 && logo ? (
          <CropStep
            crop={crop}
            logo={logo}
            onApply={() => setStep(3)}
            onChange={setCrop}
            onReplace={replaceFile}
          />
        ) : null}
        {step === 3 && logo ? (
          <PlacementStep
            crop={crop}
            error={exportError}
            isExporting={isExporting}
            logo={logo}
            onBack={() => setStep(2)}
            onChange={setPlacement}
            onPreview={() => void openResult()}
            placement={placement}
            template={template}
          />
        ) : null}
        {step === 4 && logo && output && downloadUrl ? (
          <ResultStep
            crop={crop}
            downloadUrl={downloadUrl}
            fileName={getDownloadName(logo.fileName, template)}
            logo={logo}
            onBack={() => setStep(3)}
            placement={placement}
            template={template}
          />
        ) : null}
      </main>
    </div>
  )
}

function RecipientHeader() {
  return (
    <header className="recipient-header">
      <Link aria-label="Cropper — на главную" className="recipient-header__brand" to={routePaths.home} viewTransition>
        <Brand label="Cropper" withMark />
      </Link>
      <nav aria-label="Основная навигация">
        <Link to={routePaths.home} viewTransition>На главную</Link>
        <Link to={routePaths.templates} viewTransition>Мои шаблоны</Link>
        <Link to={routePaths.login} viewTransition>Аккаунт</Link>
      </nav>
    </header>
  )
}

type UploadStepProps = {
  error: string | null
  isPreparing: boolean
  onSelect: (file: File) => void
  template: Template
}

function UploadStep({ error, isPreparing, onSelect, template }: Readonly<UploadStepProps>) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (file) onSelect(file)
    event.target.value = ''
  }
  const handleDrop: DragEventHandler<HTMLLabelElement> = (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) onSelect(file)
  }
  const formats = describeUploadFormats(template.upload_formats)

  return (
    <div className="recipient-grid">
      <section className="panel recipient-workspace">
        <h2>Загрузите логотип</h2>
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
        {error ? <p className="recipient-error" role="alert">{error}</p> : null}
      </section>

      <TemplateRequirements template={template}>
        <h2>Какой файл выбрать</h2>
        <p>
          Лучше использовать SVG или PNG с прозрачным фоном. Для JPG можно вручную убрать
          лишние поля на следующем шаге.
        </p>
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
      <h2>Требования шаблона</h2>
      <p><strong>{template.width} × {template.height} px · {getFormatLabel(template.output_format)}</strong></p>
      <p>Фон: {describeBackground(template.background_color)}</p>
      <p>Отступы: {describePadding(template)}</p>
      {children}
    </aside>
  )
}

type CropStepProps = {
  crop: CropArea
  logo: LoadedLogo
  onApply: () => void
  onChange: (crop: CropArea) => void
  onReplace: () => void
}

type CropInteraction = {
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
    if (!active || !viewport) return

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
      if (active.mode.includes('e')) width = Math.min(1 - x, Math.max(minimum, width + dx))
      if (active.mode.includes('n')) {
        const nextY = Math.min(y + height - minimum, Math.max(0, y + dy))
        height += y - nextY
        y = nextY
      }
      if (active.mode.includes('s')) height = Math.min(1 - y, Math.max(minimum, height + dy))
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
          Перетащите края рамки, чтобы убрать лишние поля. Сохраните все значимые части логотипа.
        </p>
      </section>

      <aside className="panel recipient-sidebar recipient-crop-actions">
        <h2>Рамка обрезки</h2>
        <button className="primary-button" onClick={onApply} type="button">Применить обрезку</button>
        <button className="outline-button" onClick={() => { onChange(FULL_CROP); onApply() }} type="button">
          Без обрезки
        </button>
        <button onClick={() => onChange(suggestCrop(logo.image))} type="button">
          Отменить изменения рамки
        </button>
        <p>Масштаб и положение будут доступны после применения обрезки или выбора «Без обрезки».</p>
      </aside>
    </div>
  )
}

type PlacementStepProps = {
  crop: CropArea
  error: string | null
  isExporting: boolean
  logo: LoadedLogo
  onBack: () => void
  onChange: (placement: Placement) => void
  onPreview: () => void
  placement: Placement
  template: Template
}

function PlacementStep({
  crop,
  error,
  isExporting,
  logo,
  onBack,
  onChange,
  onPreview,
  placement,
  template,
}: Readonly<PlacementStepProps>) {
  const plateRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ placement: Placement; x: number; y: number } | null>(null)

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { placement, x: event.clientX, y: event.clientY }
  }

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const start = dragStart.current
    const plate = plateRef.current
    if (!start || !plate) return

    const bounds = plate.getBoundingClientRect()
    const geometry = getLogoGeometry(logo, crop, template, start.placement)
    const availableX = template.width - template.padding_left - template.padding_right - geometry.width
    const availableY = template.height - template.padding_top - template.padding_bottom - geometry.height
    const deltaX = ((event.clientX - start.x) / bounds.width) * template.width
    const deltaY = ((event.clientY - start.y) / bounds.height) * template.height

    onChange({
      ...placement,
      x: availableX > 0 ? Math.min(1, Math.max(0, start.placement.x + deltaX / availableX)) : 0.5,
      y: availableY > 0 ? Math.min(1, Math.max(0, start.placement.y + deltaY / availableY)) : 0.5,
    })
  }

  return (
    <div className="recipient-grid">
      <section className="panel recipient-workspace">
        <div className="recipient-workspace__head">
          <div><h2>Разместите логотип</h2><p>{logo.fileName}</p></div>
          <div><button onClick={() => onChange(CENTERED_PLACEMENT)} type="button">Сбросить</button><button onClick={onBack} type="button">Обрезать заново</button></div>
        </div>
        <div className="recipient-stage recipient-stage--placement">
          <div
            className={template.background_color ? 'placement-plate' : 'placement-plate plate--transparent'}
            onPointerCancel={() => { dragStart.current = null }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragStart.current = null }}
            ref={plateRef}
            style={{ aspectRatio: `${template.width} / ${template.height}` }}
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
          </div>
        </div>
        <p className="recipient-workspace__hint">
          Синяя рамка — охранная зона {template.width - template.padding_left - template.padding_right} ×{' '}
          {template.height - template.padding_top - template.padding_bottom} px. В готовом файле она не отображается.
        </p>
      </section>

      <aside className="panel recipient-sidebar recipient-scale">
        <h2>Масштаб</h2>
        <label htmlFor="logo-scale">Размер логотипа</label>
        <output htmlFor="logo-scale">{placement.scale} %</output>
        <input
          id="logo-scale"
          max="100"
          min="20"
          onChange={(event) => onChange({ ...placement, scale: Number(event.target.value) })}
          type="range"
          value={placement.scale}
        />
        <button className="outline-button" onClick={() => onChange({ ...placement, x: 0.5, y: 0.5 })} type="button">
          Центрировать
        </button>
        <p>Перетаскивайте логотип мышью внутри плашки. Изменяйте масштаб без искажения пропорций.</p>
        {error ? <p className="recipient-error" role="alert">{error}</p> : null}
        <button className="primary-button" disabled={isExporting} onClick={onPreview} type="button">
          {isExporting ? 'Готовим файл…' : 'Предпросмотр'}
        </button>
      </aside>
    </div>
  )
}

type ResultStepProps = {
  crop: CropArea
  downloadUrl: string
  fileName: string
  logo: LoadedLogo
  onBack: () => void
  placement: Placement
  template: Template
}

function ResultStep({
  crop,
  downloadUrl,
  fileName,
  logo,
  onBack,
  placement,
  template,
}: Readonly<ResultStepProps>) {
  return (
    <div className="recipient-grid">
      <section className="panel recipient-workspace">
        <h2>Проверьте результат</h2>
        <div className="recipient-stage recipient-stage--result">
          <div
            className={template.background_color ? 'result-plate' : 'result-plate plate--transparent'}
            style={{ aspectRatio: `${template.width} / ${template.height}` }}
          >
            <LogoCanvas crop={crop} logo={logo} placement={placement} template={template} />
          </div>
        </div>
        <p className="recipient-result__name">{fileName}</p>
        <p className="recipient-workspace__hint">Серый фон вокруг плашки не входит в изображение.</p>
      </section>

      <TemplateRequirements template={template}>
        <a className="primary-button" download={fileName} href={downloadUrl}>
          Скачать {getFormatLabel(template.output_format)}
        </a>
        <button className="outline-button" onClick={onBack} type="button">Вернуться к правкам</button>
        <p>После скачивания передайте готовый файл организатору удобным способом.</p>
      </TemplateRequirements>
    </div>
  )
}
