// The page of a scenario: its steps, the step running, its messages; a
// button to run it. Generic: any scenario, any world.
const { useState, useEffect } = window.React

export default function Scenario ({ state, param, act, html }) {
  const [sc, setSc] = useState(null)
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState(null)
  useEffect(() => { fetch(`/scenario/${param}`).then(r => r.json()).then(setSc) }, [param])
  if (!sc) return html`<p class="muted">Loading…</p>`
  const mine = state.activity.filter(e => e.scenario === param)
  const done = new Set(mine.filter(e => e.kind === 'scenarioStep').map(e => e.step))
  const says = mine.filter(e => e.kind === 'say')
  const run = async () => { setRunning(true); setOutcome(null); const r = await act({ action: 'run-scenario', with: { id: param } }); setOutcome(r); setRunning(false) }
  return html`
    <section data-scenario=${param}>
      <h2>${sc.title}</h2>
      ${sc.description ? html`<p class="muted">${sc.description}</p>` : null}
      <button data-run onClick=${run} disabled=${running}>${running ? 'Running…' : 'Run'}</button>
      ${outcome ? html`<span data-outcome=${outcome.ok ? 'ok' : 'failed'}> ${outcome.ok ? 'Done.' : outcome.error}</span>` : null}
      <ol>${sc.steps.map((s, i) => html`<li data-step=${i} data-done=${done.has(i) ? 'yes' : 'no'} style=${{ opacity: done.has(i) ? 1 : 0.6 }}>${s.say || s.do || s.await}</li>`)}</ol>
      <h3>Messages</h3>
      <div data-says>${says.map(e => html`<p data-say>${e.text}</p>`)}</div>
    </section>`
}
