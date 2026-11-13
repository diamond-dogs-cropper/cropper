// Соглашения проекта для строгой проверки SonarQube (docs/dev/conventions.md, 2026-11-13).
export default {
  rules: {
    // Классы по БЭМ: block, block__element, block--modifier, block__element--modifier.
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Класс должен быть в БЭМ: block__element--modifier' },
    ],
  },
}
