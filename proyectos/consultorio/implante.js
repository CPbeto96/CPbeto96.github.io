// Implante dental en 3D: se arma con geometría propia (sin modelos externos) y se mueve con el scroll.
// La sección #implante mide varias pantallas; el lienzo queda fijo (sticky) mientras el progreso p va de 0 a 1.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const section = document.querySelector('#implante');
const canvas = section.querySelector('canvas');
const labels = [...section.querySelectorAll('[data-part]')];
const panels = [...section.querySelectorAll('[data-from]')];
const hint = section.querySelector('.scroll-hint');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  section.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

// luces: una principal cálida, un contraluz frío que dibuja el borde del metal
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fc4ff, 3.0); rim.position.set(-4, 2, -4); scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- materiales ----------
const titanio = new THREE.MeshPhysicalMaterial({ color: 0xc4c8cf, metalness: 1, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.25 });
const pilarMat = new THREE.MeshPhysicalMaterial({ color: 0xd8b878, metalness: 1, roughness: 0.22 });
const porcelana = new THREE.MeshPhysicalMaterial({ color: 0xf3efe6, metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0xfff6e8) });

// ---------- implante (tornillo) ----------
const LEN = 1.7, R_TOP = 0.3, R_BOT = 0.2;
const radiusAt = (y) => lerp(R_TOP, R_BOT, -y / LEN); // y de 0 (arriba) a -LEN
const bodyProfile = [];
bodyProfile.push(new THREE.Vector2(0, -LEN - 0.06));
bodyProfile.push(new THREE.Vector2(R_BOT * 0.55, -LEN - 0.04));
bodyProfile.push(new THREE.Vector2(R_BOT * 0.92, -LEN + 0.06));
for (let i = 0; i <= 20; i++) { const y = -LEN + 0.08 + (i / 20) * (LEN - 0.12); bodyProfile.push(new THREE.Vector2(radiusAt(y) - 0.03, y)); }
bodyProfile.push(new THREE.Vector2(R_TOP + 0.02, -0.02));
bodyProfile.push(new THREE.Vector2(R_TOP + 0.02, 0.06));
bodyProfile.push(new THREE.Vector2(0.16, 0.06));
bodyProfile.push(new THREE.Vector2(0, 0.06));
const body = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 96), titanio);

// la rosca: un tubo que sigue una hélice sobre el cono
const helix = [];
const TURNS = 12;
for (let i = 0; i <= 1200; i++) {
  const t = i / 1200, a = t * TURNS * Math.PI * 2, y = -0.12 - t * (LEN - 0.22);
  const r = radiusAt(y) - 0.012;
  helix.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
}
const thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 1800, 0.042, 10, false), titanio);
thread.scale.set(1, 1, 1);
const implante = new THREE.Group(); implante.add(body, thread);

// ---------- pilar (abutment) ----------
const pilarProfile = [
  new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.27, 0.08), new THREE.Vector2(0.27, 0.16),
  new THREE.Vector2(0.21, 0.22), new THREE.Vector2(0.19, 0.5), new THREE.Vector2(0.15, 0.6), new THREE.Vector2(0, 0.62)
];
const pilar = new THREE.Group();
pilar.add(new THREE.Mesh(new THREE.LatheGeometry(pilarProfile, 6 * 12), pilarMat));
const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 6), pilarMat); hex.position.y = -0.08; pilar.add(hex);

// ---------- corona de porcelana (muela con cuatro cúspides) ----------
const cg = new THREE.SphereGeometry(1, 128, 96);
const pos = cg.attributes.position, v = new THREE.Vector3();
for (let i = 0; i < pos.count; i++) {
  v.fromBufferAttribute(pos, i);
  const th = Math.atan2(v.z, v.x), rxz = Math.hypot(v.x, v.z);
  let y = v.y, s = 1;
  // costados rectos, como una muela
  s *= 1 + 0.12 * smooth(-0.2, 0.5, y) - 0.05 * Math.cos(4 * th);
  // cuello que baja hacia el pilar
  s *= lerp(1, 0.58, smooth(-0.25, -1, y));
  y = y > 0 ? y * 0.62 : y * 0.95;
  // cúspides y surco central
  if (v.y > 0.25) {
    const cusp = Math.pow(Math.abs(Math.cos(2 * th + Math.PI / 4)), 2.5) * smooth(0.3, 0.75, rxz);
    y += 0.16 * cusp * smooth(0.25, 0.7, v.y);
    y -= 0.2 * Math.exp(-(rxz * rxz) / 0.09) * smooth(0.6, 1, v.y);
  }
  pos.setXYZ(i, v.x * s, y, v.z * s * 0.92);
}
cg.computeVertexNormals();
const corona = new THREE.Mesh(cg, porcelana);
corona.scale.setScalar(0.52);

// ---------- conjunto ----------
const model = new THREE.Group();
model.add(implante, pilar, corona);
scene.add(model);
// posiciones armadas (y) y separadas
const BASE = { implante: 0, pilar: 0.06, corona: 0.86 };
const OPEN = { implante: -0.5, pilar: 0.45, corona: 1.75 };

// puntos de cada pieza para colocar las etiquetas en pantalla
const anchors = { corona: corona, pilar: pilar, implante: implante };
// las etiquetas se calculan a la derecha de cada pieza en pantalla (no giran con el modelo)
const anchorOffset = { corona: new THREE.Vector3(0, 0, 0), pilar: new THREE.Vector3(0, 0.3, 0), implante: new THREE.Vector3(0, -0.75, 0) };
const labelGap = { corona: 0.72, pilar: 0.42, implante: 0.5 };

let W = 0, H = 0, phone = false;
function resize() {
  const r = canvas.getBoundingClientRect();
  W = Math.round(r.width); H = Math.round(r.height);
  phone = W < 700;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  draw();
}

let progress = 0, idle = 0;
function readProgress() {
  const r = section.getBoundingClientRect();
  const total = section.offsetHeight - innerHeight;
  progress = Math.min(1, Math.max(0, -r.top / total));
}

const tmp = new THREE.Vector3();
function draw() {
  const p = progress;
  // separación: 0.28 a 0.5 se abre, 0.78 a 0.95 se vuelve a armar
  const open = smooth(0.26, 0.5, p) * (1 - smooth(0.76, 0.94, p));
  implante.position.y = lerp(BASE.implante, OPEN.implante, open);
  pilar.position.y = lerp(BASE.pilar, OPEN.pilar, open);
  corona.position.y = lerp(BASE.corona, OPEN.corona, open);

  model.rotation.y = -0.6 + p * Math.PI * 2.4 + idle;
  model.rotation.x = 0.18 * Math.sin(p * Math.PI) - 0.05;
  model.rotation.z = lerp(0.22, 0, smooth(0, 0.25, p)) - 0.12 * open;

  // la cámara se acerca al principio y en la escena final
  const dist = phone ? lerp(10.5, 15.5, open) : lerp(8, 11.2, open);
  camera.position.set(0, lerp(0.2, 0.05, p), dist);
  camera.lookAt(0, lerp(-0.25, 0.05, open), 0);
  if (hint) hint.style.opacity = 1 - smooth(0.01, 0.06, p);
  // en escritorio el modelo va a la derecha del texto; en el celular queda arriba, centrado
  model.position.x = phone ? -0.55 * open : lerp(1.15, 1.45, open);
  model.position.y = phone ? 0.6 + 0.45 * open : 0;

  renderer.render(scene, camera);

  // etiquetas sobre cada pieza mientras está separado
  for (const el of labels) {
    const name = el.dataset.part, obj = anchors[name];
    obj.updateWorldMatrix(true, false);
    obj.getWorldPosition(tmp); tmp.y += anchorOffset[name].y; tmp.x += labelGap[name]; tmp.project(camera);
    const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = open > 0.6 ? (open - 0.6) / 0.4 : 0;
  }
  // textos: cada panel aparece en su tramo del recorrido
  for (const el of panels) {
    const a = +el.dataset.from, b = +el.dataset.to;
    const o = Math.min(smooth(a, a + 0.05, p), 1 - smooth(b - 0.05, b, p));
    el.style.opacity = a === 0 ? 1 - smooth(b - 0.05, b, p) : o;
    el.style.transform = `translateY(${(1 - o) * 24}px)`;
    el.style.visibility = (a === 0 ? p < b : o > 0.01) ? 'visible' : 'hidden';
  }
}

let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => { ticking = false; readProgress(); draw(); });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', resize);

// un giro muy lento mientras la sección está a la vista (no con movimiento reducido)
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (visible && !reduce) { idle += dt * 0.12; draw(); }
  requestAnimationFrame(loop);
}

readProgress();
resize();
section.classList.add('is-ready');
requestAnimationFrame(loop);
