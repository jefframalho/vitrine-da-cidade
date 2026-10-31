// Funções compartilhadas entre a vitrine (index.html) e o painel (admin.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig, SITE, PLANOS } from "./config.js?v=6";

export { SITE, PLANOS };
export const configurado = !String(firebaseConfig.apiKey || "").includes("COLE_AQUI");
export const app = configurado ? initializeApp(firebaseConfig) : null;
export const db = configurado ? getFirestore(app) : null;
export const auth = configurado ? getAuth(app) : null;

export const CATS = ["Mercadinho","Moda","Calçados","Perfumaria e beleza","Farmácia","Lanchonete","Restaurante","Celulares e eletrônicos","Material de construção","Agropecuária","Papelaria","Serviços","Outros"];
export const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
export const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export const $ = s => document.querySelector(s);
export const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const digitos = s => String(s || "").replace(/\D/g, "");
export const fmtCep = c => { const d = digitos(c).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d; };
export const semAcento = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
export const chaveCidade = (cidade, uf) => semAcento(cidade).replace(/\s+/g, "-") + "_" + String(uf || "").toUpperCase();
export const iniciais = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
export const brl = n => (n === "" || n == null || isNaN(n)) ? "" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function zap(t) { let d = digitos(t); if (!d) return ""; if (d.length <= 11) d = "55" + d; return d; }
export function fmtTel(t) {
  const d = digitos(t).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d[2]} ${d.slice(3,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return t || "";
}
export const insta = h => String(h || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
export function aberto(l) {
  const h = l.horario;
  if (!h || !h.abre || !h.fecha || !Array.isArray(h.dias)) return null;
  const n = new Date();
  if (!h.dias.includes(n.getDay())) return false;
  const m = n.getHours() * 60 + n.getMinutes();
  const [a1, a2] = h.abre.split(":").map(Number), [f1, f2] = h.fecha.split(":").map(Number);
  return m >= a1 * 60 + a2 && m < f1 * 60 + f2;
}
export function toast(t) {
  const e = $("#toast"); if (!e) return;
  e.textContent = t; e.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2400);
}

// ---------- API de CEP: ViaCEP, com BrasilAPI de reserva ----------
async function comTempo(url, ms = 6000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); return r; } finally { clearTimeout(t); }
}
/** Retorna {cep, logradouro, bairro, cidade, uf}.
 *  Lança {tipo:"invalido"|"nao_encontrado"|"rede"}. */
export async function consultarCep(valor) {
  const cep = digitos(valor);
  if (cep.length !== 8) throw { tipo: "invalido" };
  let falhouRede = false;
  try {
    const r = await comTempo(`https://viacep.com.br/ws/${cep}/json/`);
    if (r.ok) {
      const j = await r.json();
      if (j && !j.erro && j.localidade) return { cep, logradouro: j.logradouro || "", bairro: j.bairro || "", cidade: j.localidade, uf: j.uf };
      if (j && j.erro) throw { tipo: "nao_encontrado" };
    } else if (r.status === 400) throw { tipo: "invalido" };
  } catch (e) { if (e && e.tipo) throw e; falhouRede = true; }
  // Reserva: BrasilAPI
  try {
    const r = await comTempo(`https://brasilapi.com.br/api/cep/v1/${cep}`);
    if (r.status === 404) throw { tipo: "nao_encontrado" };
    if (r.ok) { const j = await r.json(); return { cep, logradouro: j.street || "", bairro: j.neighborhood || "", cidade: j.city, uf: j.state }; }
  } catch (e) { if (e && e.tipo) throw e; }
  throw { tipo: falhouRede ? "rede" : "nao_encontrado" };
}

// ---------- Dados ----------
export async function carregarLojas() {
  const snap = await getDocs(collection(db, "lojas"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Fotos e PDFs ficam na coleção "midias" como data URL (plano grátis do Firebase)
const cacheMidia = new Map();
export function midiaURL(id) {
  if (!cacheMidia.has(id)) {
    cacheMidia.set(id, getDoc(doc(db, "midias", id)).then(s => {
      if (!s.exists()) throw new Error("midia ausente");
      return s.data().dados;
    }).catch(e => { cacheMidia.delete(id); throw e; }));
  }
  return cacheMidia.get(id);
}
export function preencherMidias(raiz = document) {
  raiz.querySelectorAll("img[data-midia]:not([src])").forEach(img => {
    midiaURL(img.dataset.midia).then(u => { img.src = u; }).catch(() => img.remove());
  });
}
export async function abrirPdf(id) {
  const janela = window.open("", "_blank");
  try {
    const dataUrl = await midiaURL(id);
    const blob = await (await fetch(dataUrl)).blob();
    const url = URL.createObjectURL(blob);
    if (janela) janela.location.href = url; else location.href = url;
  } catch (e) { if (janela) janela.close(); toast("Não foi possível abrir o catálogo."); }
}

// ---------- Planos ----------
export function hojeISO(d = new Date()) {
  const z = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function diasAte(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number); const alvo = new Date(a, m - 1, d);
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.round((alvo - h) / 86400000);
}
export const fmtData = iso => iso ? iso.split("-").reverse().join("/") : "";
export const planoPorId = id => PLANOS.find(p => p.id === id) || PLANOS[0];
/** Plano que vale hoje: o pago, se estiver dentro da validade; senão, o primeiro (grátis). */
export function planoAtivo(l) {
  const p = planoPorId(l.plano);
  if (p === PLANOS[0] || !p.preco) return p;
  const dias = diasAte(l.planoAte);
  return dias != null && dias >= 0 ? p : PLANOS[0];
}
export const rankPlano = l => PLANOS.indexOf(planoAtivo(l)); // maior = plano mais alto
