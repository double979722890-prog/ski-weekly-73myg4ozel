/* Minimal stand-in for the dashboard runtime: serves the embedded datasets, filters, links and drawings. */
(function () {
  const DATA = window.SKI_DATA || {};
  const state = { station: 'DE', cat: 'goggles' };
  try { const s = JSON.parse(localStorage.getItem('ski-params') || '{}'); Object.assign(state, s); } catch (e) { /* storage unavailable */ }
  const draws = [];
  const listeners = [];
  const css = getComputedStyle(document.documentElement);
  const colors = ['--sk-s1', '--sk-s2', '--sk-s3', '--sk-s4', '--sk-s5', '--sk-s6', '--sk-s7', '--sk-s8']
    .map((v) => css.getPropertyValue(v).trim() || '#3b6db3');
  let scheduled = false;

  function visible(el) { return !el.closest('[hidden]'); }
  function runAll() {
    scheduled = false;
    for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } }
    for (const d of draws) {
      document.querySelectorAll('[data-draw="' + d.name + '"]').forEach((el) => {
        if (!visible(el)) return;
        try { d.fn(el); } catch (e) { console.error(d.name, e); }
      });
    }
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(runAll); } }

  window.dash = {
    colors,
    data(id) {
      const rows = DATA[id];
      return rows ? { status: 'ok', data: rows, columns: rows.length ? Object.keys(rows[0]) : [], meta: [], refreshing: false }
                  : { status: 'missing', data: [], columns: [], meta: [] };
    },
    params() { return Object.assign({}, state); },
    setParams(p) {
      Object.assign(state, p);
      try { localStorage.setItem('ski-params', JSON.stringify(state)); } catch (e) { /* ignore */ }
      schedule();
    },
    resetParams() { state.station = 'DE'; state.cat = 'goggles'; schedule(); },
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) { location.hash = name; } },
    onData(fn) { listeners.push(fn); },
    draw(name, fn) { draws.push({ name, fn: typeof fn === 'function' ? fn : (fn.update ? (el) => fn.update(el, fn.mount && fn.mount(el)) : () => {}) }); },
    refresh() { schedule(); },
    calc() {}, loader() {},
  };

  document.addEventListener('DOMContentLoaded', () => {
    const upd = document.getElementById('sk-updated');
    if (upd && DATA.__meta) upd.textContent = DATA.__meta.updated_text;
    new MutationObserver(schedule).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    let w = window.innerWidth;
    window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - w) > 20) { w = window.innerWidth; schedule(); } });
    runAll();
  });
})();
