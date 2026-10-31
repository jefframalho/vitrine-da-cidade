// Monta a ficha da loja (usada na gaveta da vitrine e na página própria loja.html)
import { SITE, DIAS, esc, fmtCep, iniciais, brl, zap, fmtTel, insta, aberto, planoAtivo } from "./comum.js?v=6";

export const logoHTML = l => `<div class="logo"><span>${esc(iniciais(l.nome))}</span>${l.logo ? `<img data-midia="${esc(l.logo)}" alt="">` : ""}</div>`;
export function seloHora(l) {
  const ab = aberto(l);
  return ab === true ? `<span class="selo aberto">Aberto agora</span>` : ab === false ? `<span class="selo fechado">Fechado</span>` : "";
}
export function seloPlano(l) {
  const p = planoAtivo(l);
  return p.pagina ? `<span class="selo dest">${esc(p.nome)}</span>` : p.destaque ? `<span class="selo dest">${esc(p.nome)}</span>` : "";
}
/** Produtos e catálogo que o plano da loja permite mostrar */
export function conteudoPermitido(l) {
  const p = planoAtivo(l);
  return {
    plano: p,
    produtos: (l.produtos || []).slice(0, p.maxProdutos),
    catalogo: p.catalogo ? (l.catalogo || []) : [],
    catalogoLink: p.catalogo ? (l.catalogoLink || "") : ""
  };
}
export function linkPagina(l) { return `loja.html?id=${encodeURIComponent(l.id)}`; }

/** opts.fechar: mostra o botão de fechar (gaveta). opts.pagina: está na página própria. */
export function detalheHTML(l, opts = {}) {
  const { plano, produtos, catalogo: cat, catalogoLink } = conteudoPermitido(l);
  const z = zap(l.whatsapp), ig = insta(l.instagram), h = l.horario || {};
  const msg = encodeURIComponent(`Olá! Vi a ${l.nome} na ${SITE.nome}.`);
  const local = [l.endereco, l.bairro, l.cidade && l.uf ? `${l.cidade} - ${l.uf}` : "", l.cep ? fmtCep(l.cep) : ""].filter(Boolean).join(", ");
  return `
    <div class="painel-cab">
      <div class="painel-topo"><span class="cat-label">${esc(l.categoria || "Outros")}${l.cidade ? ` · ${esc(l.cidade)} – ${esc(l.uf)}` : ""}</span>${opts.fechar ? `<button class="fechar" data-acao="fechar" aria-label="Fechar">×</button>` : ""}</div>
      <div class="loja-cab">${logoHTML(l)}<div style="min-width:0"><h2>${esc(l.nome)}</h2><div class="selos" style="margin-top:8px">${seloPlano(l)}${seloHora(l)}</div></div></div>
      ${l.descricao ? `<p style="margin:0;color:rgba(255,255,255,.85)">${esc(l.descricao)}</p>` : ""}
      <div class="acoes-rapidas">
        ${z ? `<a class="btn btn-amber" target="_blank" rel="noopener" href="https://wa.me/${z}?text=${msg}">WhatsApp</a>` : ""}
        ${ig ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://instagram.com/${encodeURIComponent(ig)}">Instagram</a>` : ""}
        ${local ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}">Como chegar</a>` : ""}
        ${plano.pagina && !opts.pagina ? `<a class="btn btn-ghost" href="${linkPagina(l)}">Página da loja</a>` : ""}
        ${opts.pagina ? `<button class="btn btn-ghost" data-acao="compartilhar">Compartilhar</button>` : ""}
      </div>
    </div>
    <div class="painel-corpo">
      ${produtos.length ? `<div class="bloco"><h3>Produtos</h3><div class="prods">${produtos.map(p => `
        <div class="prod"><div class="foto">sem foto${p.foto ? `<img data-midia="${esc(p.foto)}" alt="" loading="lazy">` : ""}</div><b>${esc(p.nome)}</b>${p.preco !== "" && p.preco != null ? `<span class="preco">${brl(p.preco)}</span>` : ""}</div>`).join("")}</div></div>` : ""}
      ${cat.length || catalogoLink ? `<div class="bloco"><h3>Catálogo online</h3>
        ${catalogoLink ? `<a class="pdf" target="_blank" rel="noopener" href="${esc(catalogoLink)}"><span>LINK</span>Abrir catálogo completo</a>` : ""}
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
    </div>`;
}
