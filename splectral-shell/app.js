// splectral-shell — the browser's shell: the menu from what is available,
// routing (#<ext>/<page>[/<param>]), pages hosted. Pages read the local
// model (splectral-model), fed by the transport; they act through it.
// A page module's default export is a component: ({ state, param, act, html }).

import { createModel } from '/m/splectral-model/index.js'
import { connectTransport } from '/m/splectral-transport/browser.js'

const { createElement: h, useState, useEffect } = window.React
const html = window.htm.bind(h)
const model = createModel({ keep: 1000 })
const transport = connectTransport({ model, onSnapshot: snap => model.restore(snap) })
const act = action => transport.act(action)
const pages = new Map()

function useModel () {
  const [state, setState] = useState(model.snapshot())
  useEffect(() => {
    let pending = false
    const off = model.subscribe(() => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => { pending = false; setState(model.snapshot()) })
    })
    // What arrived before this subscription (the snapshot, often).
    setState(model.snapshot())
    return off
  }, [])
  return state
}

function useRoute () {
  const [route, setRoute] = useState(location.hash.slice(1))
  useEffect(() => { const f = () => setRoute(location.hash.slice(1)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return route
}

const keyOf = e => `${e.ext}/${e.page}${e.param ? '/' + encodeURIComponent(e.param) : ''}`

function Shell () {
  const state = useModel()
  const route = useRoute()
  const [menu, setMenu] = useState([])
  const nodeCount = Object.keys(state.nodes).length
  useEffect(() => { fetch('/menu').then(r => r.json()).then(setMenu) }, [nodeCount])
  const current = menu.find(e => keyOf(e) === route) || menu[0]
  const [Page, setPage] = useState(null)
  useEffect(() => {
    if (!current) return
    const load = pages.get(current.module) || import(current.module).then(m => m.default)
    pages.set(current.module, load)
    load.then(p => setPage(() => p))
  }, [current && current.module])
  return html`
    <header><h1>Splectral</h1><span class="meta" data-version=${state.version}>${nodeCount} nodes · ${Object.keys(state.resources).length} resources · event ${state.version}</span></header>
    <div class="layout">
      <nav data-menu>${menu.map(e => html`<a href=${'#' + keyOf(e)} class=${current && keyOf(e) === keyOf(current) ? 'on' : ''} data-page=${keyOf(e)}>${e.title}</a>`)}</nav>
      <main data-current=${current ? keyOf(current) : ''}>${current && Page ? html`<${Page} state=${state} param=${current.param} act=${act} html=${html} />` : html`<p class="muted">Waiting for a source…</p>`}</main>
    </div>`
}

window.ReactDOM.createRoot(document.getElementById('app')).render(html`<${Shell} />`)
