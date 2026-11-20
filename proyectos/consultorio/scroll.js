// Movimiento ligado al scroll: cada elemento con data-scroll recibe --e (entrada, 0 a 1) y --p (paso por la pantalla, 0 a 1).
// Todo se calcula en un solo requestAnimationFrame por scroll y solo mueve transform y opacity.
const els = [...document.querySelectorAll('[data-scroll]')];
const nav = document.querySelector('.nav');
const darks = [...document.querySelectorAll('#implante, .dark')];

// la frase que se ilumina palabra por palabra
const statement = document.querySelector('[data-words]');
let words = [];
if (statement) {
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t.trim()) { frag.append(t); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s); words.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(statement);
}

const clamp = (x) => Math.min(1, Math.max(0, x));
function update() {
  const vh = innerHeight;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
    el.style.setProperty('--e', clamp((vh - r.top) / (vh * 0.6)).toFixed(3));
    el.style.setProperty('--p', clamp((vh - r.top) / (vh + r.height)).toFixed(3));
  }
  if (words.length) {
    const r = statement.getBoundingClientRect();
    const t = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
    const lit = Math.round(t * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  }
  if (nav) {
    // la barra se oscurece sobre las secciones negras (el implante y la primera visita)
    const over = darks.some((s) => { const r = s.getBoundingClientRect(); return r.top < 26 && r.bottom > 26; });
    nav.classList.toggle('nav--dark', over);
  }
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
addEventListener('resize', update);
update();

// formulario: valida en línea y arma el correo de la cita
const form = document.querySelector('#cita-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    for (const f of form.querySelectorAll('[required]')) {
      const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.setAttribute('aria-invalid', bad); f.closest('.field').classList.toggle('is-bad', bad);
      if (bad && ok) { f.focus(); ok = false; }
    }
    if (!ok) return;
    const d = new FormData(form);
    const body = `Nombre: ${d.get('nombre')}\nCorreo: ${d.get('correo')}\nTratamiento: ${d.get('tratamiento')}\nDía: ${d.get('dia')}\nTurno: ${d.get('turno')}`;
    location.href = `mailto:citas@estudioayni.example?subject=${encodeURIComponent('Pedido de cita')}&body=${encodeURIComponent(body)}`;
    form.querySelector('.form-note').textContent = 'Se abrió tu correo con el pedido listo para enviar.';
  });
}
