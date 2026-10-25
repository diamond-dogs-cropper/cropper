function LoadingStatus({ children }: Readonly<{ children: string }>) {
  return <p className="visually-hidden" role="status">{children}</p>
}

function SkeletonLine({ size = 'medium' }: Readonly<{ size?: 'large' | 'medium' | 'small' }>) {
  return <span className={`skeleton skeleton-line skeleton-line--${size}`} />
}

export function TemplatesPageSkeleton() {
  return (
    <div className="page-skeleton">
      <LoadingStatus>Загружаем шаблоны…</LoadingStatus>
      <div aria-hidden="true" className="page-skeleton__content">
        <div className="list-toolbar">
          <span className="skeleton skeleton-input" />
          <SkeletonLine size="small" />
        </div>
        <div className="panel template-table template-table--skeleton">
          <div className="template-table__head">
            <span>Плашка</span>
            <span>Название</span>
            <span>Параметры</span>
            <span>Создан</span>
            <span>Действия</span>
          </div>
          <div className="template-table__rows">
            {[0, 1, 2].map((row) => (
              <div className="template-row template-row--skeleton" key={row}>
                <span className="skeleton skeleton-thumbnail" />
                <span className="skeleton-stack">
                  <SkeletonLine size="medium" />
                  <SkeletonLine size="large" />
                </span>
                <SkeletonLine size="medium" />
                <SkeletonLine size="small" />
                <span className="skeleton skeleton-button" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TemplatePageSkeleton() {
  return (
    <section aria-busy="true" className="template-page page-skeleton">
      <LoadingStatus>Загружаем шаблон…</LoadingStatus>
      <div aria-hidden="true">
        <div className="page-head">
          <div>
            <span className="skeleton skeleton-heading" />
            <SkeletonLine size="large" />
          </div>
          <SkeletonLine size="small" />
        </div>
        <div className="panel template-share template-share--skeleton">
          <div className="template-share__main skeleton-stack skeleton-stack--roomy">
            <span className="skeleton skeleton-subheading" />
            <SkeletonLine size="large" />
            <span className="skeleton skeleton-link" />
            <span className="skeleton skeleton-button skeleton-button--wide" />
            <span className="skeleton skeleton-subheading" />
            <SkeletonLine size="large" />
            <SkeletonLine size="medium" />
          </div>
          <aside className="template-summary skeleton-stack">
            <span className="skeleton skeleton-subheading" />
            <SkeletonLine size="medium" />
            <SkeletonLine size="large" />
            <SkeletonLine size="medium" />
          </aside>
        </div>
      </div>
    </section>
  )
}
