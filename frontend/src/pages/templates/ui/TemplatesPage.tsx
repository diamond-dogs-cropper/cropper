export function Component() {
  return (
    <section className="templates-page" aria-labelledby="templates-title">
      <div>
        <p className="eyebrow">Кабинет организатора</p>
        <h1 id="templates-title">Шаблоны</h1>
        <p>Здесь появятся созданные вами шаблоны подготовки логотипов.</p>
      </div>
      <div className="empty-state">
        <h2>Шаблонов пока нет</h2>
        <p>Следующим шагом добавим редактор и создание первого шаблона.</p>
      </div>
    </section>
  )
}
