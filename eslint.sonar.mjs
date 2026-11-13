// Соглашения проекта для строгой проверки SonarQube (docs/dev/conventions.md, 2026-11-13).
export default [
  {
    rules: {
      // React рендерит «ничего» через null, API отдаёт отсутствующие значения как null.
      'unicorn/no-null': 'off',
      // Компоненты называются PascalCase, остальные модули camelCase.
      'unicorn/filename-case': ['error', { cases: { camelCase: true, pascalCase: true } }],
      // props и ref — устоявшиеся имена React.
      'unicorn/prevent-abbreviations': ['error', { replacements: { props: false, ref: false } }],
    },
  },
  {
    // Разметка страницы читается целиком, дробить её ради 60 строк не стоит.
    files: ['**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
]
