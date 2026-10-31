// Painel administrativo: login, lista de lojas, cadastro e edição
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { configurado, db, auth, SITE, PLANOS, CATS, DIAS, UFS, $, esc, digitos, fmtCep, chaveCidade, iniciais, toast, brl, zap,
  consultarCep, carregarLojas, preencherMidias, planoPorId, planoAtivo, diasAte, fmtData, hojeISO } from "./comum.js?v=6";

let lojas = [];
let F = null; // formulário aberto: { id, d, novas:[], removidas:[] }

window.__ok = true;
const telas = n => { $("#carregando").hidden = true; ["tela-login", "tela-lista", "tela-form"].forEach(t => $("#" + t).hidden = t !== n); };
const aviso = t => { const a = $("#aviso"); a.hidden = !t; a.textContent = t || ""; if (t) $("#carregando").hidden = true; };

if (!configurado) {
  aviso("Site ainda não configurado: cole o firebaseConfig em js/config.js (veja o README).");
} else {
  onAuthStateChanged(auth, u => {
    $("#sair").hidden = !u; $("#quem").textContent = u ? u.email : "";
    if (u) carregarLista(); else telas("tela-login");
  }, err => { aviso("Erro no login do Firebase: " + (err.code || err.message)); telas("tela-login"); });
}

// ---------- Login ----------
const erroAuth = c => ({
  "auth/invalid-credential": "E-mail ou senha incorretos.", "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.", "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos.", "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/operation-not-allowed": "O login por e-mail/senha não está ativado. No Firebase: Authentication > Método de login > E-mail/senha > Ativar.",
  "auth/configuration-not-found": "O Authentication não foi iniciado. No Firebase: Authentication > Vamos começar, e ative E-mail/senha.",
  "auth/unauthorized-domain": "Domínio não autorizado. No Firebase: Authentication > Configurações > Domínios autorizados > adicionar jefframalho.github.io.",
  "auth/user-disabled": "Este usuário está desativado no Firebase.",
  "auth/missing-password": "Digite a senha."
})[c] || `Não foi possível entrar (código: ${c || "desconhecido"}).`;
$("#form-login").addEventListener("submit", async e => {
  e.preventDefault();
  const s = $("#l-status"); s.className = "status"; s.textContent = "Entrando…";
  try { await signInWithEmailAndPassword(auth, $("#l-email").value.trim(), $("#l-senha").value); s.textContent = ""; }
  catch (err) { s.className = "status erro"; s.textContent = erroAuth(err.code); }
});
$("#esqueci").addEventListener("click", async () => {
  const email = $("#l-email").value.trim(), s = $("#l-status");
  if (!email) { s.className = "status erro"; s.textContent = "Digite seu e-mail acima e toque de novo."; return; }
  try { await sendPasswordResetEmail(auth, email); s.className = "status"; s.textContent = "Enviamos um link para redefinir a senha no seu e-mail."; }
  catch (err) { s.className = "status erro"; s.textContent = erroAuth(err.code); }
});
$("#sair").addEventListener("click", () => signOut(auth));

// ---------- Lista ----------
async function carregarLista() {
  aviso("");
  try { lojas = await carregarLojas(); } catch (e) { aviso("Não foi possível carregar as lojas. Confira as regras do Firestore (README, passo 3)."); lojas = []; }
  renderLista(); telas("tela-lista");
}
function statusPlano(l) {
  const p = planoPorId(l.plano);
  if (!p.preco) return { txt: p.nome, cls: "" };
  const d = diasAte(l.planoAte);
  if (d == null) return { txt: `${p.nome} · sem validade`, cls: "venc" };
  if (d < 0) return { txt: `${p.nome} · venceu há ${-d} ${-d === 1 ? "dia" : "dias"}`, cls: "venc" };
  if (d <= 7) return { txt: `${p.nome} · vence ${d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`}`, cls: "alerta" };
  return { txt: `${p.nome} · até ${fmtData(l.planoAte)}`, cls: "ok" };
}
function linkCobranca(l) {
  const p = planoPorId(l.plano), d = diasAte(l.planoAte);
  const quando = d == null ? "" : d < 0 ? `venceu em ${fmtData(l.planoAte)}` : d === 0 ? "vence hoje" : `vence em ${fmtData(l.planoAte)}`;
  const texto = `Olá! Aqui é da ${SITE.nome}. O plano ${p.nome} da ${l.nome} ${quando}. ` +
    `Para continuar aparecendo em destaque, a renovação é ${brl(p.preco)} por mês.` + (SITE.pix ? ` Pix: ${SITE.pix}` : "") + " Obrigado!";
  return `https://wa.me/${zap(l.whatsapp)}?text=${encodeURIComponent(texto)}`;
}
function renderResumo() {
  const ativos = lojas.filter(l => planoAtivo(l).preco > 0);
  const receita = ativos.reduce((s, l) => s + planoAtivo(l).preco, 0);
  const cobrar = lojas.filter(l => planoPorId(l.plano).preco > 0 && (diasAte(l.planoAte) ?? -1) <= 7)
    .sort((a, b) => (diasAte(a.planoAte) ?? -999) - (diasAte(b.planoAte) ?? -999));
  const porPlano = PLANOS.map(p => `${lojas.filter(l => planoAtivo(l).id === p.id).length} ${p.nome}`).join(" · ");
  $("#resumo").innerHTML = `
    <div class="resumo-num"><span>Receita mensal dos planos ativos</span><b class="mono">${brl(receita)}</b><small>${ativos.length} ${ativos.length === 1 ? "loja pagante" : "lojas pagantes"} · ${porPlano}</small></div>
    <div class="resumo-cobrar"><span>Para cobrar (vencidos ou vencendo em 7 dias)</span>
      ${cobrar.length ? cobrar.map(l => { const st = statusPlano(l); return `<div class="cobrar-linha"><div style="min-width:0"><b>${esc(l.nome)}</b><small class="${st.cls}">${esc(st.txt)}</small></div>
        ${zap(l.whatsapp) ? `<a class="btn btn-sm btn-brand" target="_blank" rel="noopener" href="${linkCobranca(l)}">Cobrar</a>` : `<small>sem WhatsApp</small>`}
        <button class="btn btn-sm" data-renovar="${esc(l.id)}">+30 dias</button></div>`; }).join("")
        : `<small>Nenhuma cobrança pendente.</small>`}
    </div>`;
}
function renderLista() {
  renderResumo();
  const ordem = c => { const i = CATS.indexOf(c); return i < 0 ? CATS.length : i; };
  lojas.sort((a, b) => ordem(a.categoria) - ordem(b.categoria) || String(a.nome).localeCompare(b.nome, "pt-BR"));
  $("#conta").textContent = `${lojas.length} ${lojas.length === 1 ? "loja" : "lojas"}`;
  let catAtual = null;
  $("#linhas").innerHTML = lojas.length ? lojas.map(l => `
    ${l.categoria !== catAtual ? (catAtual = l.categoria, `<h3 class="secao-tit" style="margin:14px 0 2px">${esc(l.categoria || "Sem categoria")} <span class="conta">· ${lojas.filter(x => x.categoria === l.categoria).length}</span></h3>`) : ""}
    <div class="linha">
      <div class="logo"><span>${esc(iniciais(l.nome))}</span>${l.logo ? `<img data-midia="${esc(l.logo)}" alt="">` : ""}</div>
      <div class="info"><b>${esc(l.nome)}</b><small>${esc(l.categoria || "")} · ${esc(l.cidade || "sem cidade")} – ${esc(l.uf || "")}</small><span class="plano-chip ${statusPlano(l).cls}">${esc(statusPlano(l).txt)}</span></div>
      <a class="btn btn-sm" href="./#loja-${esc(l.id)}" target="_blank" rel="noopener">Ver</a>
      <button class="btn btn-sm btn-brand" data-editar="${esc(l.id)}">Editar</button>
    </div>`).join("")
    : `<div class="vazio"><h2>Nenhuma loja ainda</h2><p>Cadastre a primeira loja para ela aparecer no site.</p></div>`;
  preencherMidias($("#linhas"));
}
$("#linhas").addEventListener("click", e => { const b = e.target.closest("[data-editar]"); if (b) abrirForm(b.dataset.editar); });
// Renova por 30 dias a partir do vencimento (ou de hoje, se já venceu)
function maisDias(iso, n) {
  const base = iso && diasAte(iso) >= 0 ? new Date(...iso.split("-").map((x, i) => i === 1 ? x - 1 : +x)) : new Date();
  base.setDate(base.getDate() + n); return hojeISO(base);
}
const mais30 = iso => maisDias(iso, 30);
$("#resumo").addEventListener("click", async e => {
  const b = e.target.closest("[data-renovar]"); if (!b) return;
  const l = lojas.find(x => x.id === b.dataset.renovar); if (!l) return;
  b.disabled = true;
  try {
    const { id, ...dados } = l;
    const novo = mais30(l.planoAte);
    await setDoc(doc(db, "lojas", id), { ...dados, planoAte: novo });
    l.planoAte = novo; toast(`${l.nome}: renovado até ${fmtData(novo)}`); renderLista();
  } catch (err) { b.disabled = false; toast("Não foi possível renovar. Tente de novo."); }
});
$("#nova").addEventListener("click", () => abrirForm());

// ---------- Formulário ----------
function lojaVazia() {
  return { nome: "", categoria: CATS[0], descricao: "", whatsapp: "", instagram: "", cep: "", endereco: "", bairro: "", cidade: "", uf: "",
    horario: { abre: "07:30", fecha: "18:00", dias: [1, 2, 3, 4, 5, 6] }, produtos: [], catalogo: [], catalogoLink: "", logo: "", plano: PLANOS[0].id, planoAte: "" };
}
function abrirForm(id) {
  const base = id ? lojas.find(l => l.id === id) : null;
  const d = structuredClone({ ...lojaVazia(), ...(base || {}) });
  delete d.id; delete d.criadoEm; delete d.atualizadoEm;
  F = { id: id || null, d, novas: [], removidas: [] };
  renderForm(); telas("tela-form"); scrollTo({ top: 0 });
}
function renderForm() {
  const d = F.d, h = d.horario || {};
  $("#tela-form").innerHTML = `
    <div class="adm-cab" style="margin-bottom:16px"><h2>${F.id ? "Editar loja" : "Nova loja"}</h2><button class="btn btn-sm" data-acao="cancelar">Voltar</button></div>
    <form id="form" novalidate>
      <div style="display:flex;gap:12px;align-items:center">
        <button type="button" class="mini" style="width:72px;height:72px;border-radius:18px" data-up="logo" aria-label="Enviar logo">Logo${d.logo ? `<img data-midia="${esc(d.logo)}" alt="">` : ""}</button>
        <label style="flex:1">Nome da loja<input id="f-nome" type="text" value="${esc(d.nome)}"></label>
      </div>
      <div class="tres">
        <label>CEP <small id="cep-status"></small><input id="f-cep" type="text" inputmode="numeric" maxlength="9" placeholder="00000-000" value="${esc(fmtCep(d.cep))}"></label>
        <label>Cidade<input id="f-cidade" type="text" value="${esc(d.cidade)}"></label>
        <label>UF<select id="f-uf"><option value=""></option>${UFS.map(u => `<option ${u === d.uf ? "selected" : ""}>${u}</option>`).join("")}</select></label>
      </div>
      <p class="dica">Digite o CEP e a cidade, UF, rua e bairro são preenchidos automaticamente.</p>
      <div class="duas">
        <label>Endereço<input id="f-end" type="text" placeholder="Rua e número" value="${esc(d.endereco)}"></label>
        <label>Bairro<input id="f-bairro" type="text" value="${esc(d.bairro)}"></label>
      </div>
      <div class="duas">
        <label>Categoria<select id="f-cat">${CATS.map(c => `<option ${c === d.categoria ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label>WhatsApp<input id="f-zap" type="tel" placeholder="(00) 9 0000-0000" value="${esc(d.whatsapp)}"></label>
      </div>
      <label>Instagram<input id="f-ig" type="text" placeholder="@nomedaloja" value="${esc(d.instagram)}"></label>
      <label>Descrição <small>O que a loja vende, em uma ou duas frases</small><textarea id="f-desc">${esc(d.descricao)}</textarea></label>
      <div class="duas">
        <label>Abre às<input id="f-abre" type="time" value="${esc(h.abre || "")}"></label>
        <label>Fecha às<input id="f-fecha" type="time" value="${esc(h.fecha || "")}"></label>
      </div>
      <div class="dias" role="group" aria-label="Dias abertos">${DIAS.map((n, i) => `<label><input type="checkbox" id="f-dia-${i}" ${(h.dias || []).includes(i) ? "checked" : ""}>${n}</label>`).join("")}</div>
      <div class="bloco"><h3>Plano</h3>
        <div class="duas">
          <label>Plano<select id="f-plano">${PLANOS.map(p => `<option value="${esc(p.id)}" ${p.id === (d.plano || PLANOS[0].id) ? "selected" : ""}>${esc(p.nome)}${p.preco ? " · " + brl(p.preco) + "/mês" : " · grátis"}</option>`).join("")}</select></label>
          <label>Pago até <small id="plano-status"></small><input id="f-ate" type="date" value="${esc(d.planoAte || "")}"></label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-sm" data-acao="mais30">+30 dias</button><button type="button" class="btn btn-sm" data-acao="mais365">+1 ano</button></div>
        <p class="dica" id="plano-dica"></p>
      </div>

      <div class="bloco"><h3>Catálogo online</h3>
        <p class="dica">Envie fotos das páginas ou um PDF de até 700 KB. Para PDF maior, cole um link (Google Drive, por exemplo).</p>
        <div class="arquivos">${(d.catalogo || []).map((c, i) => `<span class="arq">${c.tipo === "pdf" ? "PDF: " : "Foto: "}${esc(c.nome || "arquivo")}<button type="button" data-rm-cat="${i}" aria-label="Remover">×</button></span>`).join("") || `<span class="dica">Nenhum arquivo</span>`}</div>
        <div><button type="button" class="btn btn-sm" data-up="catalogo">Enviar fotos ou PDF</button></div>
        <label>Link do catálogo <small>opcional</small><input id="f-link" type="url" placeholder="https://..." value="${esc(d.catalogoLink)}"></label>
      </div>

      <div class="bloco"><h3>Produtos</h3>
        <div style="display:grid;gap:8px">${(d.produtos || []).map((p, i) => `
          <div class="linha-prod">
            <button type="button" class="mini" data-up="prod" data-i="${i}" aria-label="Foto do produto">Foto${p.foto ? `<img data-midia="${esc(p.foto)}" alt="">` : ""}</button>
            <input type="text" id="p-nome-${i}" placeholder="Nome do produto" value="${esc(p.nome)}">
            <input type="text" class="p-preco" id="p-preco-${i}" inputmode="decimal" placeholder="R$ 0,00" value="${p.preco === "" || p.preco == null ? "" : String(p.preco).replace(".", ",")}">
            <button type="button" class="btn btn-sm btn-perigo" data-rm-prod="${i}" aria-label="Remover produto">×</button>
          </div>`).join("")}</div>
        <div><button type="button" class="btn btn-sm" data-acao="add-prod">+ Adicionar produto</button></div>
      </div>

      <div id="f-status" class="status" role="status"></div>
      <div class="rodape-form">
        ${F.id ? `<button type="button" class="btn btn-perigo" data-acao="excluir">Excluir loja</button>` : "<span></span>"}
        <div style="display:flex;gap:8px"><button type="button" class="btn" data-acao="cancelar">Cancelar</button><button type="submit" class="btn btn-amber" id="f-salvar">Salvar loja</button></div>
      </div>
    </form>`;
  preencherMidias($("#tela-form"));
  dicaPlano();
}
function lerForm() {
  const d = F.d, v = id => ($("#" + id)?.value ?? "").trim();
  Object.assign(d, {
    nome: v("f-nome"), categoria: v("f-cat"), whatsapp: v("f-zap"), instagram: v("f-ig"), descricao: v("f-desc"),
    cep: digitos(v("f-cep")), cidade: v("f-cidade").replace(/\s+/g, " "), uf: v("f-uf"), endereco: v("f-end"), bairro: v("f-bairro"),
    catalogoLink: v("f-link"), plano: v("f-plano") || PLANOS[0].id, planoAte: v("f-ate"),
    horario: { abre: v("f-abre"), fecha: v("f-fecha"), dias: DIAS.map((_, i) => $("#f-dia-" + i)?.checked ? i : -1).filter(i => i >= 0) }
  });
  d.produtos = (d.produtos || []).map((p, i) => {
    const pr = ($("#p-preco-" + i)?.value || "").replace(/[^\d,.]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
    return { ...p, nome: ($("#p-nome-" + i)?.value || "").trim(), preco: pr === "" || isNaN(+pr) ? "" : +pr };
  });
}
// Explica o que o plano escolhido libera e avisa se algo ficará de fora
function dicaPlano() {
  const sel = $("#f-plano"); if (!sel) return;
  const p = planoPorId(sel.value), ate = $("#f-ate").value, st = $("#plano-status"), dica = $("#plano-dica");
  const nProd = (F.d.produtos || []).length, temCat = (F.d.catalogo || []).length || ($("#f-link")?.value || "").trim();
  const avisos = [];
  if (p.preco) {
    const d = diasAte(ate);
    st.textContent = !ate ? "· informe a data" : d < 0 ? "· vencido" : `· ${d} ${d === 1 ? "dia" : "dias"} restantes`;
    if (!ate || d < 0) avisos.push(`Sem data válida, a loja aparece como ${PLANOS[0].nome}.`);
  } else st.textContent = "";
  const ativo = p.preco && ate && diasAte(ate) >= 0 ? p : PLANOS[0];
  if (nProd > ativo.maxProdutos) avisos.push(`No plano ${ativo.nome}, só os ${ativo.maxProdutos} primeiros produtos aparecem no site.`);
  if (temCat && !ativo.catalogo) avisos.push(`O catálogo não aparece no plano ${ativo.nome}.`);
  dica.textContent = avisos.length ? avisos.join(" ") : `Plano ${ativo.nome}: até ${ativo.maxProdutos} produtos${ativo.catalogo ? ", catálogo online" : ""}${ativo.destaque ? ", destaque" : ""}${ativo.pagina ? ", página própria" : ""}.`;
}
$("#tela-form").addEventListener("change", e => { if (["f-plano", "f-ate"].includes(e.target.id)) dicaPlano(); });
const status = (t, erro) => { const e = $("#f-status"); if (e) { e.textContent = t; e.className = "status" + (erro ? " erro" : ""); } };

// Preenche cidade/UF/endereço pelo CEP
let ultimoCep = "";
$("#tela-form").addEventListener("input", async e => {
  if (e.target.id !== "f-cep") return;
  e.target.value = fmtCep(e.target.value);
  const d = digitos(e.target.value), st = $("#cep-status");
  if (d.length !== 8 || d === ultimoCep) return;
  ultimoCep = d; st.textContent = "· consultando…";
  try {
    const r = await consultarCep(d);
    $("#f-cidade").value = r.cidade; $("#f-uf").value = r.uf;
    if (r.logradouro && !$("#f-end").value.trim()) $("#f-end").value = r.logradouro + ", ";
    if (r.bairro && !$("#f-bairro").value.trim()) $("#f-bairro").value = r.bairro;
    st.textContent = `· ${r.cidade} – ${r.uf}`;
  } catch (err) {
    st.textContent = err.tipo === "nao_encontrado" ? "· CEP não encontrado" : err.tipo === "rede" ? "· sem conexão, preencha à mão" : "· CEP inválido";
  }
});

// ---------- Fotos e PDFs (guardados no Firestore, plano grátis) ----------
const LIMITE = 950000; // caracteres do data URL (documento do Firestore tem limite de 1 MB)
const lerDataURL = b => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(b); });
async function imagemCompacta(file) {
  const bmp = await createImageBitmap(file);
  let lado = 1100, q = 0.8;
  for (let t = 0; t < 6; t++) {
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", q);
    if (url.length < LIMITE) return url;
    lado = Math.round(lado * 0.8); q = Math.max(0.55, q - 0.08);
  }
  throw new Error("grande");
}
async function salvarMidia(file) {
  let dados, tipo;
  if (file.type === "application/pdf") {
    dados = await lerDataURL(file); tipo = "pdf";
    if (dados.length > LIMITE) throw { msg: `O PDF "${file.name}" passa de 700 KB. Envie fotos das páginas ou use o campo de link.` };
  } else if (/^image\//.test(file.type)) {
    try { dados = await imagemCompacta(file); } catch (e) { throw { msg: `Não foi possível usar a imagem "${file.name}".` }; }
    tipo = "img";
  } else throw { msg: "Tipo não aceito. Use JPG, PNG, WEBP ou PDF." };
  const ref = await addDoc(collection(db, "midias"), { dados, tipo, nome: file.name.slice(0, 80), criadoEm: serverTimestamp() });
  F.novas.push(ref.id);
  return { id: ref.id, tipo };
}
function escolherArquivos(accept, multi) {
  return new Promise(r => { const i = document.createElement("input"); i.type = "file"; i.accept = accept; i.multiple = !!multi; i.onchange = () => r([...i.files]); i.click(); });
}
async function enviar(tipo, idx) {
  lerForm();
  const files = await escolherArquivos(tipo === "catalogo" ? "application/pdf,image/*" : "image/*", tipo === "catalogo");
  if (!files.length) return;
  status("Enviando…");
  try {
    for (const f of files) {
      const r = await salvarMidia(f);
      if (tipo === "logo") { if (F.d.logo) F.removidas.push(F.d.logo); F.d.logo = r.id; }
      else if (tipo === "prod") { const p = F.d.produtos[idx]; if (p.foto) F.removidas.push(p.foto); p.foto = r.id; }
      else F.d.catalogo.push({ id: r.id, tipo: r.tipo, nome: f.name.slice(0, 80) });
    }
    renderForm(); status("Arquivo enviado. Lembre de salvar a loja.");
  } catch (e) { renderForm(); status(e?.msg || (e?.code === "permission-denied" ? "Sem permissão. Confira o e-mail nas regras do Firestore." : "Não foi possível enviar o arquivo."), true); }
}

// ---------- Salvar, cancelar, excluir ----------
async function apagarMidias(ids) { for (const id of ids.filter(Boolean)) { try { await deleteDoc(doc(db, "midias", id)); } catch (e) {} } }
async function salvar() {
  lerForm();
  const d = F.d;
  if (!d.nome) { status("Coloque o nome da loja.", true); $("#f-nome").focus(); return; }
  if (d.cep && d.cep.length !== 8) { status("O CEP tem 8 números.", true); $("#f-cep").focus(); return; }
  if (!d.cidade || !d.uf) { status("Informe a cidade e a UF. É por elas que o visitante encontra a loja.", true); $("#f-cidade").focus(); return; }
  if (d.catalogoLink && !/^https?:\/\//i.test(d.catalogoLink)) { status("O link do catálogo deve começar com https://", true); $("#f-link").focus(); return; }
  d.produtos = d.produtos.filter(p => p.nome || p.foto);
  const dados = { ...d, cidadeChave: chaveCidade(d.cidade, d.uf), atualizadoEm: serverTimestamp() };
  const btn = $("#f-salvar"); btn.disabled = true; status("Salvando…");
  try {
    if (F.id) await setDoc(doc(db, "lojas", F.id), dados, { merge: false });
    else await addDoc(collection(db, "lojas"), { ...dados, criadoEm: serverTimestamp() });
    await apagarMidias(F.removidas);
    F = null; toast("Loja salva"); await carregarLista();
  } catch (e) {
    btn.disabled = false;
    status(e?.code === "permission-denied" ? "Sem permissão. Confira o e-mail nas regras do Firestore (README, passo 3)." : "Não foi possível salvar. Tente de novo.", true);
  }
}
async function cancelar() { if (F) await apagarMidias(F.novas); F = null; renderLista(); telas("tela-lista"); }
let confirmando = false;
async function excluir(btn) {
  if (!confirmando) { confirmando = true; btn.textContent = "Toque de novo para excluir"; setTimeout(() => { confirmando = false; if (btn.isConnected) btn.textContent = "Excluir loja"; }, 4000); return; }
  confirmando = false; btn.disabled = true;
  const l = lojas.find(x => x.id === F.id);
  try {
    await deleteDoc(doc(db, "lojas", F.id));
    await apagarMidias([...(F.novas || []), l?.logo, ...(l?.catalogo || []).map(c => c.id), ...(l?.produtos || []).map(p => p.foto)]);
    F = null; toast("Loja excluída"); await carregarLista();
  } catch (e) { btn.disabled = false; status("Não foi possível excluir. Tente de novo.", true); }
}

$("#tela-form").addEventListener("submit", e => { e.preventDefault(); salvar(); });
$("#tela-form").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  const a = t.dataset.acao;
  if (a === "cancelar") cancelar();
  else if (a === "excluir") excluir(t);
  else if (a === "mais30" || a === "mais365") {
    const sel = $("#f-plano");
    if (!planoPorId(sel.value).preco) { const pago = PLANOS.find(p => p.preco); if (pago) sel.value = pago.id; }
    $("#f-ate").value = maisDias($("#f-ate").value, a === "mais30" ? 30 : 365); dicaPlano();
  }
  else if (a === "add-prod") { lerForm(); F.d.produtos.push({ nome: "", preco: "", foto: "" }); renderForm(); setTimeout(() => $("#p-nome-" + (F.d.produtos.length - 1))?.focus(), 0); }
  else if (t.dataset.up) enviar(t.dataset.up, +t.dataset.i);
  else if (t.dataset.rmCat != null) { lerForm(); const [c] = F.d.catalogo.splice(+t.dataset.rmCat, 1); if (c) F.removidas.push(c.id); renderForm(); }
  else if (t.dataset.rmProd != null) { lerForm(); const [p] = F.d.produtos.splice(+t.dataset.rmProd, 1); if (p?.foto) F.removidas.push(p.foto); renderForm(); }
});
