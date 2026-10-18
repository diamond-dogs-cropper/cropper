import { SiteHeader } from '../../../widgets/site-header/ui/SiteHeader'
import { ButtonLink } from '../../../shared/ui/ButtonLink'
import { routePaths } from '../../../app/router/routePaths'

const steps = [
  {
    number: '01',
    title: 'Создайте шаблон',
    description: 'Укажите размеры, фон, формат файла и охранные отступы.',
  },
  {
    number: '02',
    title: 'Передайте ссылку',
    description: 'Отправьте одну ссылку представителям компаний.',
  },
  {
    number: '03',
    title: 'Получите единый формат',
    description: 'Каждый загрузит логотип, настроит его и скачает результат.',
  },
]

export function Component() {
  return (
    <div className="home-page">
      <SiteHeader
        action={<ButtonLink to={routePaths.login}>Создать шаблон</ButtonLink>}
        withMark
      />

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Для организаторов мероприятий</p>
            <h1>Логотипы разные. Формат — единый.</h1>
            <p className="hero-copy__description">
              Задайте размер и отступы плашки. Отправьте ссылку компаниям — каждая
              подготовит свой логотип по вашим требованиям.
            </p>
            <ButtonLink size="large" to={routePaths.login}>
              Создать шаблон
            </ButtonLink>
          </div>

          <div className="preview-card" aria-label="Пример обработки логотипа">
            <div className="preview-card__heading">
              <strong>Один логотип. Нужный формат.</strong>
              <span>400 × 220 px</span>
            </div>
            <div className="preview-panel">
              <span>01 / Исходный файл</span>
              <div className="logo-example logo-example--source">☄ <b>orbit</b></div>
              <small>Лишние поля и произвольный размер</small>
            </div>
            <div className="preview-panel">
              <span className="preview-panel__status">✓ Готово к скачиванию</span>
              <span>02 / Готовая плашка</span>
              <div className="logo-example logo-example--result">☄ <b>orbit</b></div>
              <small>Обрезано, вписано и отцентрировано</small>
            </div>
          </div>
        </section>

        <section className="steps-section" aria-labelledby="steps-title">
          <h2 id="steps-title">От шаблона до готового логотипа</h2>
          <ol className="steps-grid">
            {steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <aside className="participant-note">
          <strong>Вам нужно подготовить логотип?</strong>
          <p>
            Откройте ссылку на шаблон, которую прислал организатор. В ней уже заданы
            размер плашки, фон и отступы.
          </p>
        </aside>
      </main>
    </div>
  )
}
