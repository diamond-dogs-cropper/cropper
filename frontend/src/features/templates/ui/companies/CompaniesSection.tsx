import { useState } from 'react'
import { useConfirm } from '../../../../shared/ui/ConfirmDialog'
import { DownloadIcon, PlusIcon } from '../../../../shared/ui/icons'
import { SearchField } from '../../../../shared/ui/SearchField'
import { SegmentedControl } from '../../../../shared/ui/SegmentedControl'
import { getArchiveUrl } from '../../api/templatesApi'
import {
  getCompanyName,
  getCompanyState,
  isReady,
  isWaiting,
  type CompanyFilter,
} from '../../lib/companies'
import { getFormatLabel } from '../../lib/templateText'
import type { CompanyData } from '../../lib/useCompanyData'
import { useCompanyOperations, type Notice } from '../../lib/useCompanyOperations'
import type { Logo, Recipient, Template } from '../../model/templates.types'
import { PlateThumb } from '../PlateThumb'
import { AddCompaniesDialog } from './AddCompaniesDialog'
import { CompanyRow, type CompanyActions } from './CompanyRow'
import { EditCompanyDialog } from './EditCompanyDialog'
import { LogoGrid } from './LogoGrid'
import { UnboundLogoRow } from './UnboundLogoRow'

type View = 'list' | 'logos'

interface CompaniesSectionProps {
  data: CompanyData
  template: Template
  update: (change: (data: CompanyData) => CompanyData) => void
}

function matches(query: string, ...values: (string | null)[]) {
  return values.some(value => value?.toLowerCase().includes(query))
}

function NoticeLine({ notice }: Readonly<{ notice: Notice | null }>) {
  if (!notice) {
    return null
  }
  return notice.tone === 'error' ? (
    <p className="form-error" role="alert">{notice.text}</p>
  ) : (
    <output className="companies__notice">{notice.text}</output>
  )
}

function EmptyLogos({ template }: Readonly<{ template: Template }>) {
  return (
    <div className="logos__empty">
      <PlateThumb box={{ height: 72, width: 128 }} template={template} />
      <p>
        Логотипов пока нет. Отправьте ссылку компаниям — готовые файлы появятся здесь, уже{' '}
        {template.width} × {template.height}&nbsp;px в {getFormatLabel(template.output_format)}.
      </p>
    </div>
  )
}

function CompaniesIntro({ onAdd }: Readonly<{ onAdd: () => void }>) {
  return (
    <div className="companies-intro">
      <p>
        <strong>Знаете, у кого собираете логотипы?</strong> Добавьте компании списком — будет видно,
        кто ещё не прислал, а у каждой появится своя ссылка: файл сразу попадёт в её строку.
      </p>
      <button className="outline-button" onClick={onAdd} type="button">
        <PlusIcon />
        Добавить компании
      </button>
    </div>
  )
}

export function CompaniesSection({ data, template, update }: Readonly<CompaniesSectionProps>) {
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<CompanyFilter>('all')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<'add' | Recipient | null>(null)
  const [confirm, confirmDialog] = useConfirm()
  const operations = useCompanyOperations(template, update, confirm)
  const { logos, recipients } = data
  const hasList = recipients.length > 0
  const query = search.trim().toLowerCase()

  const names = new Map(recipients.flatMap(item => (item.logo && item.company ? [[item.logo.id, item.company]] : [])))
  const boundIds = new Set(recipients.map(item => item.logo?.id))
  const unbound = logos.filter(logo => !boundIds.has(logo.id))
  const counted = recipients.filter(item => getCompanyState(item) !== 'skip')
  const ready = recipients.filter(isReady)
  const waiting = recipients.filter(isWaiting)
  const toInvite = waiting.filter(item => item.email)
  const activeFilter = filter === 'unbound' && unbound.length === 0 ? 'all' : filter

  const visibleRows = recipients.filter(item => {
    const byFilter = { all: true, ready: isReady(item), unbound: false, waiting: isWaiting(item) }
    return byFilter[activeFilter] && matches(query, item.company, item.email, item.note)
  })
  const visibleUnbound = ['all', 'unbound'].includes(activeFilter)
    ? unbound.filter(logo => matches(query, logo.company))
    : []
  const visibleLogos = logos.filter(logo => matches(query, names.get(logo.id) ?? logo.company))

  const actions: CompanyActions = {
    onChange: operations.change,
    onDelete: recipient => void operations.remove(recipient),
    onDeleteLogo: recipient => {
      if (recipient.logo) {
        void operations.removeLogo(recipient.logo, getCompanyName(recipient))
      }
    },
    onEdit: setDialog,
    onInvite: recipients => void operations.invite(recipients),
  }
  const deleteLogo = (logo: Logo) =>
    void operations.removeLogo(logo, names.get(logo.id) ?? logo.company)

  const filterOptions: { label: string; value: CompanyFilter }[] = [
    { label: `Все · ${recipients.length}`, value: 'all' },
    { label: `Ждём · ${waiting.length}`, value: 'waiting' },
    { label: `Готово · ${ready.length}`, value: 'ready' },
    ...(unbound.length > 0
      ? [{ label: `Не из списка · ${unbound.length}`, value: 'unbound' as const }]
      : []),
  ]

  const showGrid = !hasList || view === 'logos'
  const isEmptyResult = showGrid
    ? logos.length > 0 && visibleLogos.length === 0
    : visibleUnbound.length + visibleRows.length === 0

  return (
    <section aria-labelledby="companies-title" className="logos companies">
      <div className="logos__bar">
        <h2 id="companies-title">
          {hasList ? 'Компании' : 'Логотипы'}{' '}
          <span className="logos__count">
            {hasList ? `готово ${ready.length} из ${counted.length}` : logos.length}
          </span>
        </h2>
        {hasList ? (
          <SegmentedControl
            label="Вид"
            name="companies-view"
            onChange={setView}
            options={[
              { label: 'Список', value: 'list' },
              { label: `Логотипы · ${logos.length}`, value: 'logos' },
            ]}
            value={view}
          />
        ) : null}
        {hasList || logos.length > 0 ? (
          <SearchField label="Найти компанию" onChange={setSearch} value={search} />
        ) : null}
        {hasList ? (
          <button className="outline-button" onClick={() => setDialog('add')} type="button">
            <PlusIcon />
            Добавить
          </button>
        ) : null}
        {logos.length > 0 ? (
          <a className="outline-button" download href={getArchiveUrl(template.id)}>
            <DownloadIcon />
            Скачать все · ZIP
          </a>
        ) : null}
      </div>

      {hasList ? null : <CompaniesIntro onAdd={() => setDialog('add')} />}

      {hasList && view === 'list' ? (
        <div className="companies__filters">
          <SegmentedControl
            label="Показать"
            name="companies-filter"
            onChange={setFilter}
            options={filterOptions}
            value={activeFilter}
          />
          {template.is_open && toInvite.length > 0 ? (
            <button
              className="outline-button"
              disabled={operations.pendingId === 'invite'}
              onClick={() => void operations.invite(toInvite)}
              type="button"
            >
              {operations.pendingId === 'invite'
                ? 'Отправляем…'
                : `Отправить письма ждущим · ${toInvite.length}`}
            </button>
          ) : null}
        </div>
      ) : null}

      <NoticeLine notice={operations.notice} />

      {showGrid && logos.length === 0 ? <EmptyLogos template={template} /> : null}
      {showGrid && visibleLogos.length > 0 ? (
        <LogoGrid
          logos={visibleLogos}
          names={names}
          onDelete={deleteLogo}
          pendingId={operations.pendingId}
          template={template}
        />
      ) : null}

      {!showGrid && visibleUnbound.length + visibleRows.length > 0 ? (
        <ul className="panel company-list">
          {visibleUnbound.map(logo => (
            <UnboundLogoRow
              isBusy={operations.pendingId === logo.id}
              key={logo.id}
              logo={logo}
              onBind={(recipient, logo) => void operations.bind(recipient, logo)}
              onDelete={deleteLogo}
              recipients={recipients}
              template={template}
            />
          ))}
          {visibleRows.map(recipient => (
            <CompanyRow
              actions={actions}
              isBusy={operations.pendingId === recipient.id}
              key={recipient.id}
              recipient={recipient}
              template={template}
            />
          ))}
        </ul>
      ) : null}

      {isEmptyResult ? (
        <p className="page-note">
          {query ? `По запросу «${search.trim()}» ничего не найдено.` : 'Здесь пока никого нет.'}
        </p>
      ) : null}

      {confirmDialog}
      {dialog === 'add' ? (
        <AddCompaniesDialog
          existing={recipients}
          onAdd={async items => {
            await operations.add(items)
            setFilter('all')
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog && dialog !== 'add' ? (
        <EditCompanyDialog
          onClose={() => setDialog(null)}
          onSave={async changes => {
            await operations.save(dialog, changes)
            setDialog(null)
          }}
          recipient={dialog}
        />
      ) : null}
    </section>
  )
}
