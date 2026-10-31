// Vitrine pública: busca por CEP, lista de lojas da cidade e gaveta da loja
import { configurado, SITE, CATS, DIAS, $, esc, digitos, fmtCep, semAcento, chaveCidade, iniciais, brl, zap, fmtTel, insta, aberto, toast,
  consultarCep, carregarLojas, preencherMidias, abrirPdf } from "./comum.js?v=5";

window.__ok = true;
const S = { lojas: [], carregou: false, cidade: null, cep: "", msg: "", buscando: false, cat: "Todas", q: "", aberta: null };
const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const ler = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

// Contato "Sua loja aqui"
$("#contato-num").textContent = fmtTel(SITE.whatsappContato);
$("#contato-link").href = `https://wa.me/${zap(SITE.whatsappContato)}?text=${encodeURIComponent(`Olá! Quero colocar minha loja na ${SITE.nome}.`)}`;

// ---------- Cidades ----------
function cidades() {
  const m = new Map();
  for (const l of S.lojas) {
    if (!l.cidade || !l.uf) continue;
    const k = l.cidadeChave || chaveCidade(l.cidade, l.uf);
    const c = m.get(k) || { nome: l.cidade, uf: String(l.uf).toUpperCase(), key: k, n: 0 };
    c.n++; m.set(k, c);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, "pt-BR"));
}
const lojasDaCidade = () => S.cidade ? S.lojas.filter(l => (l.cidadeChave || chaveCidade(l.cidade, l.uf)) === S.cidade.key) : [];

async function buscarCep(valor) {
  const d = digitos(valor); S.cep = d;
  if (d.length !== 8) { S.msg = "O CEP tem 8 números. Ex.: 63210-000"; renderTopo(); return; }
  S.buscando = true; S.msg = "Consultando o CEP…"; renderTopo();
  try {
    const r = await consultarCep(d);
    const key = chaveCidade(r.cidade, r.uf);
    const c = cidades().find(x => x.key === key);
    S.cidade = c || { nome: r.cidade, uf: r.uf, key, n: 0 };
    S.msg = ""; S.cat = "Todas"; S.q = ""; $("#q").value = "";
    guardar("vitrine-cidade", { ...S.cidade, cep: d });
  } catch (e) {
    S.cidade = null;
    S.msg = e.tipo === "nao_encontrado" ? `Não encontramos o CEP ${fmtCep(d)}. Confira os números.`
      : e.tipo === "invalido" ? "CEP inválido. Digite os 8 números."
      : "Não foi possível consultar o CEP agora. Escolha sua cidade na lista abaixo.";
  }
  S.buscando = false; renderTudo();
}
function escolherCidade(key) {
  const c = cidades().find(x => x.key === key); if (!c) return;
  S.cidade = c; S.cat = "Todas"; S.q = ""; $("#q").value = ""; S.msg = "";
  guardar("vitrine-cidade", { ...c, cep: S.cep }); renderTudo(); scrollTo({ top: 0 });
}
function trocarCidade() { S.cidade = null; S.msg = ""; guardar("vitrine-cidade", null); renderTudo(); setTimeout(() => $("#cep")?.focus(), 0); }

// ---------- Topo ----------
function renderTopo() {
  const t = $("#topo");
  const marca = `<a class="marca" href="./"><i>${esc(iniciais(SITE.nome)[0])}</i>${esc(SITE.nome)}</a>`;
  if (S.cidade) {
    const n = lojasDaCidade().length;
    t.innerHTML = `${marca}
      <div class="cidade-atual"><h1>${esc(S.cidade.nome)}</h1><span class="uf">${esc(S.cidade.uf)}</span></div>
      <p class="sub">${n} ${n === 1 ? "loja cadastrada" : "lojas cadastradas"}${S.cep ? ` · CEP <span class="mono">${esc(fmtCep(S.cep))}</span>` : ""}</p>
      <div><button class="btn btn-ghost btn-sm" data-acao="trocar">Trocar cidade ou CEP</button></div>`;
  } else {
    t.innerHTML = `${marca}
      <h1>As lojas da sua cidade, <em>num lugar só</em></h1>
      <p class="sub">Digite o CEP e veja o contato, o Instagram, os produtos e o catálogo de cada loja.</p>
      <form id="form-cep" class="cep-box" novalidate>
        <input id="cep" type="text" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" aria-label="CEP" value="${esc(fmtCep(S.cep))}">
        <button class="btn btn-amber" type="submit" ${S.buscando ? "disabled" : ""}>${S.buscando ? "Buscando…" : "Buscar lojas"}</button>
      </form>
      <div class="cep-msg" role="status">${esc(S.msg)}</div>`;
  }
}

// ---------- Conteúdo ----------
function renderCats(base) {
  const usadas = new Set(base.map(l => l.categoria));
  const cats = ["Todas", ...CATS.filter(c => usadas.has(c))];
  if (!cats.includes(S.cat)) S.cat = "Todas";
  $("#cats").innerHTML = cats.map(c => `<button class="chip" aria-pressed="${c === S.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}
function filtradas(base) {
  const q = semAcento(S.q);
  return base.filter(l => {
    if (S.cat !== "Todas" && l.categoria !== S.cat) return false;
    if (!q) return true;
    return semAcento([l.nome, l.categoria, l.descricao, l.bairro, l.endereco, ...(l.produtos || []).map(p => p.nome)].join(" ")).includes(q);
  }).sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || String(a.nome).localeCompare(b.nome, "pt-BR"));
}
const logoHTML = l => `<div class="logo"><span>${esc(iniciais(l.nome))}</span>${l.logo ? `<img data-midia="${esc(l.logo)}" alt="">` : ""}</div>`;
function seloHora(l) { const ab = aberto(l); return ab === true ? `<span class="selo aberto">Aberto agora</span>` : ab === false ? `<span class="selo fechado">Fechado</span>` : ""; }
function cardHTML(l) {
  const precos = (l.produtos || []).map(p => p.preco).filter(p => p !== "" && p != null && !isNaN(p));
  const min = precos.length ? Math.min(...precos) : null;
  const temCat = (l.catalogo || []).length || l.catalogoLink;
  return `<button class="card" data-loja="${esc(l.id)}">
    <div class="card-topo">${logoHTML(l)}<div style="min-width:0"><div class="cat-label">${esc(l.categoria || "Outros")}${l.bairro ? " · " + esc(l.bairro) : ""}</div><h3>${esc(l.nome)}</h3></div></div>
    ${l.descricao ? `<p>${esc(l.descricao)}</p>` : ""}
    <div class="selos">${l.destaque ? `<span class="selo dest">Destaque</span>` : ""}${seloHora(l)}${temCat ? `<span class="selo">Catálogo</span>` : ""}${l.instagram ? `<span class="selo">@${esc(insta(l.instagram))}</span>` : ""}</div>
    <div class="card-pe">${min != null ? `<div class="apartir">a partir de<b>${brl(min)}</b></div>` : `<div class="apartir">${(l.produtos || []).length ? l.produtos.length + " produtos" : "Ver detalhes"}</div>`}<span class="btn btn-sm">Ver loja →</span></div>
  </button>`;
}
function listaCidades(cs) {
  return `<div class="cidades">${cs.map(x => `<button class="cid" data-cidade="${esc(x.key)}"><b>${esc(x.nome)} – ${esc(x.uf)}</b><span>${x.n} ${x.n === 1 ? "loja" : "lojas"}</span></button>`).join("")}</div>`;
}
// Agrupa as lojas por categoria, na ordem da lista CATS
function porCategoria(lista) {
  const grupos = new Map();
  for (const l of lista) { const c = CATS.includes(l.categoria) ? l.categoria : "Outros"; (grupos.get(c) || grupos.set(c, []).get(c)).push(l); }
  return CATS.filter(c => grupos.has(c)).map(c => {
    const g = grupos.get(c);
    return `<section class="grupo"><div class="grupo-cab"><h2 class="secao-tit">${esc(c)}</h2><span class="conta">${g.length} ${g.length === 1 ? "loja" : "lojas"}</span>${g.length > 1 ? `<button class="btn btn-sm" data-ver-cat="${esc(c)}">Ver só ${esc(c)}</button>` : ""}</div>
      <div class="grade">${g.map(cardHTML).join("")}</div></section>`;
  }).join("");
}
function renderConteudo() {
  const c = $("#conteudo");
  $("#fixa").hidden = !S.cidade || !lojasDaCidade().length;
  if (!S.carregou) { c.innerHTML = ""; return; }
  const cs = cidades();
  if (!S.cidade) {
    $("#conta").textContent = cs.length ? `${cs.length} ${cs.length === 1 ? "cidade" : "cidades"} no guia` : "Nenhuma loja cadastrada ainda";
    c.innerHTML = cs.length ? listaCidades(cs) : `<div class="vazio"><h2>O guia está começando</h2><p>As lojas cadastradas aparecem aqui, separadas por cidade.</p></div>`;
    return;
  }
  const base = lojasDaCidade();
  if (!base.length) {
    $("#conta").textContent = "Nenhuma loja nesta cidade ainda";
    const outras = cs.filter(x => x.key !== S.cidade.key);
    c.innerHTML = `<div class="vazio"><h2>Ainda não há lojas em ${esc(S.cidade.nome)}</h2><p>Tem uma loja aí? Fale com a gente pelo WhatsApp logo abaixo e apareça primeiro.</p></div>
      ${outras.length ? `<h2 class="secao-tit">Cidades no guia</h2>${listaCidades(outras)}` : ""}`;
    return;
  }
  renderCats(base);
  const lista = filtradas(base);
  $("#conta").textContent = `${lista.length} ${lista.length === 1 ? "loja" : "lojas"}${S.cat !== "Todas" ? " em " + S.cat : ""}`;
  c.innerHTML = !lista.length ? `<div class="vazio"><h2>Nada encontrado</h2><p>Tente outra palavra ou escolha "Todas".</p></div>`
    : S.cat === "Todas" ? porCategoria(lista)
    : `<div class="grade">${lista.map(cardHTML).join("")}</div>`;
  preencherMidias(c);
}
function renderTudo() { renderTopo(); renderConteudo(); }

// ---------- Gaveta da loja ----------
function abrirPainel(html) {
  const o = $("#overlay");
  o.innerHTML = `<div class="painel" role="dialog" aria-modal="true">${html}</div>`;
  o.hidden = false; document.body.style.overflow = "hidden";
  preencherMidias(o);
}
function fecharPainel() {
  const o = $("#overlay"); o.hidden = true; o.innerHTML = ""; document.body.style.overflow = ""; S.aberta = null;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}
function mostrarLoja(id) {
  const l = S.lojas.find(x => x.id === id); if (!l) return;
  S.aberta = id;
  const z = zap(l.whatsapp), ig = insta(l.instagram), h = l.horario || {}, cat = l.catalogo || [];
  const msg = encodeURIComponent(`Olá! Vi a ${l.nome} na ${SITE.nome}.`);
  const local = [l.endereco, l.bairro, l.cidade && l.uf ? `${l.cidade} - ${l.uf}` : "", l.cep ? fmtCep(l.cep) : ""].filter(Boolean).join(", ");
  abrirPainel(`
    <div class="painel-cab">
      <div class="painel-topo"><span class="cat-label">${esc(l.categoria || "Outros")}${l.cidade ? ` · ${esc(l.cidade)} – ${esc(l.uf)}` : ""}</span><button class="fechar" data-acao="fechar" aria-label="Fechar">×</button></div>
      <div class="loja-cab">${logoHTML(l)}<div style="min-width:0"><h2>${esc(l.nome)}</h2><div class="selos" style="margin-top:8px">${seloHora(l)}</div></div></div>
      ${l.descricao ? `<p style="margin:0;color:rgba(255,255,255,.85)">${esc(l.descricao)}</p>` : ""}
      <div class="acoes-rapidas">
        ${z ? `<a class="btn btn-amber" target="_blank" rel="noopener" href="https://wa.me/${z}?text=${msg}">WhatsApp</a>` : ""}
        ${ig ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://instagram.com/${encodeURIComponent(ig)}">Instagram</a>` : ""}
        ${local ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}">Como chegar</a>` : ""}
      </div>
    </div>
    <div class="painel-corpo">
      ${(l.produtos || []).length ? `<div class="bloco"><h3>Produtos</h3><div class="prods">${l.produtos.map(p => `
        <div class="prod"><div class="foto">sem foto${p.foto ? `<img data-midia="${esc(p.foto)}" alt="" loading="lazy">` : ""}</div><b>${esc(p.nome)}</b>${p.preco !== "" && p.preco != null ? `<span class="preco">${brl(p.preco)}</span>` : ""}</div>`).join("")}</div></div>` : ""}
      ${cat.length || l.catalogoLink ? `<div class="bloco"><h3>Catálogo online</h3>
        ${l.catalogoLink ? `<a class="pdf" target="_blank" rel="noopener" href="${esc(l.catalogoLink)}"><span>LINK</span>Abrir catálogo completo</a>` : ""}
        ${cat.filter(c => c.tipo === "pdf").map(c => `<button class="pdf" data-pdf="${esc(c.id)}"><span>PDF</span>${esc(c.nome || "Catálogo")}</button>`).join("")}
        ${cat.some(c => c.tipo === "img") ? `<div class="paginas">${cat.filter(c => c.tipo === "img").map(c => `<img data-midia="${esc(c.id)}" alt="Página do catálogo" loading="lazy">`).join("")}</div>` : ""}
      </div>` : ""}
      <div class="bloco"><h3>Contato e endereço</h3>
        ${z ? `<div class="contato"><div><div class="rot">WhatsApp</div><span class="mono sel">${esc(fmtTel(l.whatsapp))}</span></div><button class="btn btn-sm" data-copiar="${esc(fmtTel(l.whatsapp))}">Copiar</button></div>` : ""}
        ${ig ? `<div class="contato"><div><div class="rot">Instagram</div><span class="mono sel">@${esc(ig)}</span></div></div>` : ""}
        ${local ? `<div class="contato"><div><div class="rot">Endereço</div>${esc(local)}</div></div>` : ""}
        ${h.abre ? `<div class="contato"><div><div class="rot">Horário</div>${(h.dias || []).map(d => DIAS[d]).join(", ") || "—"} · <span class="mono">${esc(h.abre)}–${esc(h.fecha)}</span></div></div>` : ""}
        ${!z && !ig && !local && !h.abre ? `<span class="rot">Sem contato cadastrado.</span>` : ""}
      </div>
    </div>`);
  if (location.hash !== "#loja-" + id) history.replaceState(null, "", "#loja-" + id);
}
function abrirDoHash() { const m = location.hash.match(/^#loja-([A-Za-z0-9_-]+)$/); if (m) mostrarLoja(m[1]); }

// ---------- Eventos ----------
$("#topo").addEventListener("submit", e => { e.preventDefault(); buscarCep($("#cep").value); });
$("#topo").addEventListener("input", e => {
  if (e.target.id !== "cep") return;
  e.target.value = fmtCep(e.target.value);
  if (digitos(e.target.value).length === 8 && !S.buscando) buscarCep(e.target.value);
});
$("#topo").addEventListener("click", e => { if (e.target.closest('[data-acao="trocar"]')) trocarCidade(); });
$("#q").addEventListener("input", e => { S.q = e.target.value; renderConteudo(); });
$("#cats").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (b) { S.cat = b.dataset.cat; renderConteudo(); } });
$("#conteudo").addEventListener("click", e => {
  const c = e.target.closest("[data-loja]"); if (c) return mostrarLoja(c.dataset.loja);
  const cid = e.target.closest("[data-cidade]"); if (cid) return escolherCidade(cid.dataset.cidade);
  const vc = e.target.closest("[data-ver-cat]"); if (vc) { S.cat = vc.dataset.verCat; renderConteudo(); scrollTo({ top: $("#fixa").offsetTop }); }
});
$("#overlay").addEventListener("click", async e => {
  if (e.target.id === "overlay") return fecharPainel();
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.acao === "fechar") fecharPainel();
  else if (t.dataset.pdf) abrirPdf(t.dataset.pdf);
  else if (t.dataset.copiar) {
    try { await navigator.clipboard.writeText(t.dataset.copiar); toast("Copiado"); } catch (err) { toast("Não foi possível copiar"); }
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#overlay").hidden) fecharPainel(); });
addEventListener("hashchange", abrirDoHash);

// ---------- Início ----------
const salvo = ler("vitrine-cidade");
if (salvo?.key) { S.cidade = { nome: salvo.nome, uf: salvo.uf, key: salvo.key, n: 0 }; S.cep = salvo.cep || ""; }
renderTudo();
(async () => {
  if (!configurado) {
    $("#conta").textContent = "";
    const a = $("#aviso"); a.hidden = false;
    a.textContent = "Site ainda não configurado: cole o firebaseConfig em js/config.js (veja o README).";
    return;
  }
  try { S.lojas = await carregarLojas(); }
  catch (e) { const a = $("#aviso"); a.hidden = false; a.textContent = "Não foi possível carregar as lojas. Verifique sua internet e recarregue a página."; }
  S.carregou = true;
  if (S.cidade) { const c = cidades().find(x => x.key === S.cidade.key); if (c) S.cidade = c; }
  renderTudo(); abrirDoHash();
})();
