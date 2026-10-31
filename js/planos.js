// Página pública de planos, montada a partir de PLANOS em config.js
import { SITE, PLANOS } from "./config.js?v=6";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl = n => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
let zap = String(SITE.whatsappContato || "").replace(/\D/g, ""); if (zap.length <= 11) zap = "55" + zap;
const recomendado = PLANOS.find(p => p.id === "destaque") ? "destaque" : PLANOS[PLANOS.length - 1].id;

document.querySelector("#planos").innerHTML = PLANOS.map(p => {
  const msg = encodeURIComponent(`Olá! Quero colocar minha loja na ${SITE.nome} no plano ${p.nome}.`);
  return `<article class="plano${p.id === recomendado ? " recomendado" : ""}">
    ${p.id === recomendado ? `<span class="plano-tag">Mais escolhido</span>` : ""}
    <h2>${esc(p.nome)}</h2>
    <div class="plano-preco">${p.preco ? `<b class="mono">${brl(p.preco)}</b><span>/mês</span>` : `<b>Grátis</b>`}</div>
    <ul>${p.vantagens.map(v => `<li>${esc(v)}</li>`).join("")}</ul>
    <a class="btn ${p.id === recomendado ? "btn-amber" : "btn-brand"}" target="_blank" rel="noopener" href="https://wa.me/${zap}?text=${msg}">Quero o ${esc(p.nome)}</a>
  </article>`;
}).join("");
