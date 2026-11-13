import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './app/styles/global.css'

const root = document.querySelector('#root')
if (!root) {
  throw new Error('В index.html нет элемента #root')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
