// Telar Urbano: movimiento ligado al scroll (foto del inicio, galería horizontal) y el carrito que arma el pedido.
const clamp = (x) => Math.min(1, Math.max(0, x));
const hero = document.querySelector('.hero__photo');
const look = document.querySelector('#coleccion');
const track = look && look.querySelector('.look__track');
const reveals = [...document.querySelectorAll('[data-reveal]')];

function update() {
  const vh = innerHeight;
  if (hero) {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--p', clamp((vh - r.top) / (vh + r.height)).toFixed(3));
  }
  if (look && track) {
    const r = look.getBoundingClientRect();
    const total = look.offsetHeight - vh;
    const p = clamp(-r.top / total);
    const max = track.scrollWidth - track.parentElement.clientWidth;
    track.style.transform = `translate3d(${-p * max}px, 0, 0)`;
    look.style.setProperty('--p', p.toFixed(3));
  }
  for (const el of reveals) {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--e', clamp((vh - r.top) / (vh * 0.5)).toFixed(3));
  }
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
addEventListener('resize', update);
update();

// ---------- filtros del catálogo ----------
const chips = [...document.querySelectorAll('.chip')];
const items = [...document.querySelectorAll('.product')];
chips.forEach((c) => c.addEventListener('click', () => {
  chips.forEach((x) => x.setAttribute('aria-pressed', x === c));
  const cat = c.dataset.cat;
  items.forEach((it) => { it.hidden = cat !== 'todo' && it.dataset.cat !== cat; });
}));

// ---------- carrito ----------
const cart = [];
const drawer = document.querySelector('#carrito');
const list = drawer.querySelector('.cart__list');
const totalEl = drawer.querySelector('.cart__total strong');
const countEls = document.querySelectorAll('[data-count]');
const sendBtn = drawer.querySelector('.cart__send');
const money = (n) => 'Bs ' + n.toLocaleString('es-BO');

function render() {
  list.innerHTML = '';
  if (!cart.length) list.innerHTML = '<li class="cart__empty">Tu carrito está vacío. Elige una prenda y su talla.</li>';
  cart.forEach((it, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<img src="${it.img}" alt=""><div><strong>${it.name}</strong><span>Talla ${it.size} · ${money(it.price)}</span></div><button type="button" aria-label="Quitar ${it.name}">Quitar</button>`;
    li.querySelector('button').addEventListener('click', () => { cart.splice(i, 1); render(); });
    list.append(li);
  });
  const total = cart.reduce((s, it) => s + it.price, 0);
  totalEl.textContent = money(total);
  countEls.forEach((el) => { el.textContent = cart.length; });
  sendBtn.toggleAttribute('aria-disabled', !cart.length);
  const text = 'Hola Telar Urbano, quiero hacer este pedido:\n' + cart.map((it) => `- ${it.name}, talla ${it.size}: ${money(it.price)}`).join('\n') + `\nTotal: ${money(total)}`;
  sendBtn.href = cart.length ? 'https://wa.me/?text=' + encodeURIComponent(text) : '#carrito';
}
function openCart(open) {
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', !open);
  document.body.classList.toggle('cart-open', open);
  if (open) drawer.querySelector('.cart__close').focus();
}
document.querySelectorAll('[data-open-cart]').forEach((b) => b.addEventListener('click', () => openCart(true)));
drawer.querySelector('.cart__close').addEventListener('click', () => openCart(false));
drawer.querySelector('.cart__scrim').addEventListener('click', () => openCart(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) openCart(false); });

items.forEach((it) => {
  const btn = it.querySelector('.add');
  btn.addEventListener('click', () => {
    const size = it.querySelector('select').value;
    cart.push({ name: it.dataset.name, price: +it.dataset.price, size, img: it.querySelector('img').getAttribute('src') });
    render();
    btn.textContent = 'Agregado ✓';
    btn.classList.add('is-done');
    setTimeout(() => { btn.textContent = 'Agregar al carrito'; btn.classList.remove('is-done'); }, 1400);
    document.querySelector('.nav__cart').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.3,.7,.4,1)' });
  });
});
render();
