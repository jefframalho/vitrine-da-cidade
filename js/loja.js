// Página própria da loja (vantagem do plano com "pagina: true")
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { configurado, db, SITE, $, toast, preencherMidias, abrirPdf, planoAtivo } from "./comum.js?v=6";
import { detalheHTML } from "./detalhe.js?v=6";

window.__ok = true;
const id = new URLSearchParams(location.search).get("id");
const aviso = t => { $("#carregando").hidden = true; const a = $("#aviso"); a.hidden = false; a.textContent = t; };

(async () => {
  if (!configurado) return aviso("Site ainda não configurado.");
  if (!id) return aviso("Loja não informada no endereço.");
  let snap;
  try { snap = await getDoc(doc(db, "lojas", id)); }
  catch (e) { return aviso("Não foi possível carregar a loja. Verifique sua internet."); }
  if (!snap.exists()) return aviso("Esta loja não está mais no guia.");
  const l = { id: snap.id, ...snap.data() };
  // Sem plano com página própria: abre a ficha normal na vitrine
  if (!planoAtivo(l).pagina) { location.replace(`./#loja-${encodeURIComponent(id)}`); return; }
  document.title = `${l.nome} · ${SITE.nome}`;
  const art = $("#loja");
  art.innerHTML = detalheHTML(l, { pagina: true });
  art.hidden = false; $("#carregando").hidden = true;
  preencherMidias(art);

  art.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.pdf) abrirPdf(t.dataset.pdf);
    else if (t.dataset.copiar) {
      try { await navigator.clipboard.writeText(t.dataset.copiar); toast("Copiado"); } catch (err) { toast("Não foi possível copiar"); }
    } else if (t.dataset.acao === "compartilhar") {
      const dados = { title: l.nome, text: `Conheça a ${l.nome} na ${SITE.nome}`, url: location.href };
      try {
        if (navigator.share) await navigator.share(dados);
        else { await navigator.clipboard.writeText(location.href); toast("Link copiado"); }
      } catch (err) { /* usuário cancelou */ }
    }
  });
})();
