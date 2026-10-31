# Vitrine da Cidade

Guia de comércio local. O visitante digita o CEP, o site descobre a cidade pela API de CEP (ViaCEP, com BrasilAPI de reserva) e mostra as lojas daquela cidade com WhatsApp, Instagram, endereço, horário, produtos com preço e catálogo online.

- `index.html`: o site público
- `admin.html`: o painel onde você cadastra as lojas (com login)
- `js/config.js`: **o único arquivo que você precisa editar**
- `firestore.rules`: as regras de segurança do banco de dados

Tudo roda no plano **grátis** do Firebase (Spark). As fotos e PDFs são comprimidos e guardados no próprio banco (Firestore), sem precisar do Firebase Storage, que hoje exige o plano pago.

---

## Passo 1: criar o projeto no Firebase

1. Entre em https://console.firebase.google.com com sua conta Google.
2. Clique em **Adicionar projeto**, dê um nome (ex.: `vitrine-da-cidade`) e conclua. O Google Analytics pode ficar desligado.

## Passo 2: registrar o site e copiar a configuração

1. Na tela inicial do projeto, clique no ícone **`</>`** (Web).
2. Dê um apelido (ex.: `site`) e clique em **Registrar app**. Não precisa marcar Hosting.
3. Vai aparecer um bloco `const firebaseConfig = { ... }`. Copie os valores para o arquivo `js/config.js`, trocando cada `COLE_AQUI`.

> A `apiKey` do Firebase pode ficar pública no site, isso é normal. Quem protege os dados são as regras do Passo 3.

## Passo 3: criar o banco de dados (Firestore)

1. No menu, abra **Criação > Firestore Database** e clique em **Criar banco de dados**.
2. Local: `southamerica-east1 (São Paulo)`. Modo: **produção**.
3. Abra a aba **Regras**, apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` e clique em **Publicar**.

O e-mail que aparece nas regras é quem pode cadastrar lojas. Para dar acesso a mais alguém, acrescente o e-mail na lista, por exemplo `['seu@email.com', 'outra@pessoa.com']`.

## Passo 4: criar seu login

1. Abra **Criação > Authentication** e clique em **Vamos começar**.
2. Em **Método de login**, ative **E-mail/senha**.
3. Na aba **Usuários**, clique em **Adicionar usuário** e crie o login com o **mesmo e-mail** das regras e uma senha.

## Passo 5: publicar no GitHub Pages

1. No GitHub, crie um repositório novo, por exemplo `vitrine-da-cidade` (público).
2. Envie todos os arquivos desta pasta mantendo as pastas `css` e `js` (botão **Add file > Upload files**, arraste tudo).
3. Vá em **Settings > Pages**, em **Branch** escolha `main` e a pasta `/ (root)`, e salve.
4. Em 1 ou 2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/vitrine-da-cidade/`.

## Passo 6: liberar o domínio no login

No Firebase, em **Authentication > Configurações > Domínios autorizados**, clique em **Adicionar domínio** e coloque `SEU-USUARIO.github.io`. Sem isso o login do painel não funciona no site publicado.

## Passo 7: cadastrar as lojas

Abra `https://SEU-USUARIO.github.io/vitrine-da-cidade/admin.html`, entre com seu e-mail e senha e use **+ Nova loja**.

- Digite o **CEP** da loja: cidade, UF, rua e bairro são preenchidos sozinhos.
- **Logo e fotos de produtos**: são reduzidas automaticamente antes de enviar.
- **Catálogo**: fotos das páginas, ou PDF de até 700 KB. Para PDF maior, coloque no Google Drive (compartilhado como "qualquer pessoa com o link") e cole o link no campo **Link do catálogo**.
- **Destaque**: a loja aparece primeiro na cidade dela.

Cada loja tem um link próprio para o dono divulgar: `.../vitrine-da-cidade/#loja-ID` (o botão **Ver** no painel abre esse link).

---

## Personalizar

- Nome do site e seu WhatsApp da seção "Sua loja aqui": `js/config.js`.
- Cores: no topo de `css/estilo.css` (`--brand` é o verde, `--amber` é o amarelo).
- Categorias: lista `CATS` em `js/comum.js`.

## Testar no computador antes de publicar

Os arquivos usam módulos JavaScript, então não funcionam abrindo o `index.html` com dois cliques. Use a extensão **Live Server** do VS Code (botão "Go Live") ou rode `python -m http.server` dentro da pasta e acesse `http://localhost:8000`. Para o login funcionar localmente, `localhost` já vem autorizado no Firebase.

## Limites do plano grátis

O plano Spark permite 1 GB no banco e 50 mil leituras por dia. O site lê todas as lojas uma vez por visita, então atende bem algumas centenas de lojas e milhares de visitas por dia. Se crescer muito, dá para trocar a leitura para buscar só as lojas da cidade.
