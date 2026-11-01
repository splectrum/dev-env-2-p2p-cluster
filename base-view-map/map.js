// base-view-map — the map of the abstract world: hosts as frames, nodes as
// shapes inside them (filled when the host controls them, outlined when
// they joined from elsewhere), their resources beside them, links between
// nodes, recent activity drawn on top: requests, changes, nodes arriving
// and leaving. It reads the abstract world only.

const W = 300 // a host's frame
const NODE_R = 26

function layout (state) {
  const hosts = Object.keys(state.hosts).sort()
  const byHost = Object.fromEntries(hosts.map(h => [h, Object.values(state.nodes).filter(n => n.host === h).sort((a, b) => a.uri.localeCompare(b.uri))]))
  const at = {}
  hosts.forEach((h, i) => byHost[h].forEach((n, j) => { at[n.uri] = { x: 40 + i * (W + 40) + W / 2, y: 110 + j * 150 } }))
  const height = 160 + Math.max(1, ...hosts.map(h => byHost[h].length)) * 150
  return { hosts, byHost, at, width: 40 + hosts.length * (W + 40), height }
}

export default function Map ({ state, html }) {
  const { hosts, byHost, at, width, height } = layout(state)
  const last = state.activity.length ? state.activity[state.activity.length - 1].time || 0 : 0
  const recent = (kind, ms = 4000) => state.activity.filter(e => e.kind === kind && last - (e.time || 0) < ms)
  const answered = new Set(recent('requestAnswered').map(e => e.uri))
  const changed = new Set(recent('changed').map(e => e.uri))
  const says = state.activity.filter(e => e.kind === 'say')
  const say = says.length ? says[says.length - 1].text : null
  const links = Object.values(state.links).filter(l => at[l.from] && at[l.to])
  const colour = n => n.status === 'running' ? 'var(--ok)' : n.status === 'starting' ? 'var(--warn)' : 'var(--gone)'
  return html`
    <section data-map>
      ${say ? html`<p data-say-now style=${{ fontSize: '17px', margin: '0 0 8px' }}>${say}</p>` : null}
      <svg viewBox=${`0 0 ${Math.max(width, 380)} ${height}`} style=${{ width: '100%', maxWidth: `${Math.max(width, 380)}px`, height: 'auto' }} role="img" aria-label="The map of hosts, nodes and resources">
        ${hosts.map((h, i) => html`
          <g data-host=${h}>
            <rect x=${40 + i * (W + 40)} y="20" width=${W} height=${height - 40} rx="12" fill="var(--panel)" stroke="var(--line)" />
            <text x=${40 + i * (W + 40) + 14} y="46" fill="var(--muted)" font-size="14">${h}</text>
          </g>`)}
        ${links.map(l => html`<line data-link=${l.id} data-open=${l.open ? 'yes' : 'no'} x1=${at[l.from].x} y1=${at[l.from].y} x2=${at[l.to].x} y2=${at[l.to].y} stroke=${l.open ? 'var(--accent)' : 'var(--line)'} stroke-width=${l.open ? 3 : 1.5} stroke-dasharray=${l.open ? '' : '4 4'} />`)}
        ${hosts.flatMap(h => byHost[h]).map(n => {
          const p = at[n.uri]
          const res = Object.values(state.resources).filter(r => r.node === n.uri)
          const busy = res.some(r => answered.has(r.uri))
          return html`
            <g data-node=${n.uri} data-status=${n.status} data-controlled=${n.controlled ? 'yes' : 'no'}>
              ${busy ? html`<circle data-request cx=${p.x} cy=${p.y} r=${NODE_R + 10} fill="none" stroke="var(--accent)" stroke-width="3" opacity="0.7" />` : null}
              <circle cx=${p.x} cy=${p.y} r=${NODE_R} fill=${n.controlled ? colour(n) : 'var(--panel)'} stroke=${colour(n)} stroke-width="4" />
              <text x=${p.x} y=${p.y + NODE_R + 18} text-anchor="middle" font-size="13" fill="var(--fg)">${n.uri}</text>
              ${res.map((r, k) => html`
                <g data-resource=${r.uri} data-changed=${changed.has(r.uri) ? 'yes' : 'no'}>
                  <circle cx=${p.x - 50 + k * 50} cy=${p.y + NODE_R + 44} r=${changed.has(r.uri) ? 11 : 8} fill=${changed.has(r.uri) ? 'var(--accent)' : 'var(--line)'} />
                  <text x=${p.x - 50 + k * 50} y=${p.y + NODE_R + 66} text-anchor="middle" font-size="11" fill="var(--muted)">${r.uri.split('/').pop()}</text>
                </g>`)}
            </g>`
        })}
      </svg>
      <p class="muted" style=${{ fontSize: '13px' }}>Filled: controlled by its host's manager · outlined: joined from elsewhere · green running, amber starting, grey gone · a ring: a request answered · a blue dot: a resource just changed.</p>
    </section>`
}
