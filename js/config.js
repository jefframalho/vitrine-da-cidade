// =====================================================================
// CONFIGURAÇÃO DO SITE
// 1) Cole aqui o firebaseConfig do seu projeto (Firebase > Configurações
//    do projeto > Seus apps > App da Web). Veja o README.md.
// 2) Ajuste o nome do site e o seu WhatsApp para a seção "Sua loja aqui".
// =====================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyALRSFzMwpC1782LtBIIMgqVYDBcjLw3pk",
  authDomain: "vitrine-da-cidade-ee9d6.firebaseapp.com",
  projectId: "vitrine-da-cidade-ee9d6",
  storageBucket: "vitrine-da-cidade-ee9d6.firebasestorage.app",
  messagingSenderId: "798952060336",
  appId: "1:798952060336:web:0a21f6dcde94ecbf031275"
};

export const SITE = {
  nome: "Vitrine da Cidade",
  // Seu WhatsApp com DDD, só números (aparece em "Sua loja aqui")
  whatsappContato: "83921418988",
  // Sua chave Pix, para aparecer na mensagem de cobrança (deixe "" para não mostrar)
  pix: ""
};

// =====================================================================
// PLANOS PARA AS LOJAS
// Ajuste nomes, preços e vantagens como quiser. O "id" não deve mudar
// depois que houver lojas cadastradas.
//   maxProdutos: quantos produtos aparecem no site
//   catalogo:    mostra o catálogo online (fotos, PDF, link)
//   destaque:    aparece antes das outras lojas, com selo
//   pagina:      ganha uma página própria para divulgar (loja.html)
// =====================================================================
export const PLANOS = [
  { id: "basico",   nome: "Básico",   preco: 0,     maxProdutos: 3,  catalogo: false, destaque: false, pagina: false,
    vantagens: ["Contato, Instagram e endereço", "Horário com aviso de aberto ou fechado", "Até 3 produtos com foto e preço"] },
  { id: "destaque", nome: "Destaque", preco: 29.90, maxProdutos: 15, catalogo: true,  destaque: true,  pagina: false,
    vantagens: ["Tudo do Básico", "Aparece entre as primeiras da categoria", "Selo de Destaque", "Até 15 produtos", "Catálogo online"] },
  { id: "premium",  nome: "Premium",  preco: 49.90, maxProdutos: 60, catalogo: true,  destaque: true,  pagina: true,
    vantagens: ["Tudo do Destaque", "Aparece primeiro, à frente do Destaque", "Até 60 produtos", "Página própria da loja para divulgar no Instagram e WhatsApp"] }
];
