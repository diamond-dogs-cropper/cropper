function LoadingStatus({ children }: Readonly<{ children: string }>) {
  return <output className="visually-hidden">{children}</output>
}

function SkeletonLine({ size = 'medium' }: Readonly<{ size?: 'large' | 'medium' | 'small' }>) {
  return <span className={`skeleton skeleton-line skeleton-line--${size}`} />
}

export function TemplatesPageSkeleton() {
  return (
    <div className="page-skeleton">
      <LoadingStatus>Загружаем шаблоны…</LoadingStatus>
      <div aria-hidden="true">
        <div className="list-toolbar">
          <span className="skeleton skeleton-input" />
          <SkeletonLine size="small" />
        </div>
        <div className="panel template-list template-list--skeleton">
          {[0, 1, 2].map((row) => (
            <div className="template-row" key={row}>
              <span className="skeleton skeleton-thumbnail" />
              <span className="skeleton-stack">
                <SkeletonLine size="medium" />
                <SkeletonLine size="large" />
              </span>
              <SkeletonLine size="medium" />
              <SkeletonLine size="small" />
              <span />
            </div>
          ))}
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
        <span className="skeleton skeleton-line skeleton-line--small back-link" />
        <div className="panel template-hero template-hero--skeleton">
          <span className="skeleton template-hero__plate" />
          <div className="skeleton-stack skeleton-stack--roomy">
            <span className="skeleton skeleton-heading" />
            <SkeletonLine size="large" />
            <span className="skeleton skeleton-link" />
          </div>
        </div>
      </div>
    </section>
  )
}
