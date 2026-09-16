const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const dbPromise = require('./db'); // requerimentos
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//configuracoes padrao da session
app.use(session({
  secret: 'segredo-super-seguro',
  resave: false,
  saveUninitialized: false
}));

// middleware admin
function verificarAdmin(req, res, next) {
  if (req.session?.usuario?.tipo === 'admin') next();
  else res.status(403).send('Acesso negado: apenas administradores.');
}

// arquivos estaticos
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// rota splash
app.get('/', (req, res) => res.render('splash'));

//rota funcionarios (somente somente para admin)
app.get('/funcionarios', verificarAdmin, async (req, res) => {
  try {
    const db = await dbPromise;
    const usuarios = await db.all('SELECT id, nome, tipo, criado_em FROM usuarios');
    const logs = await db.all('SELECT * FROM logs ORDER BY data DESC LIMIT 20');
    res.render('funcionarios', { usuarios, logs, usuario: req.session.usuario });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao carregar usuários');
  }
});

//editar funcionario
app.post('/funcionarios/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, tipo } = req.body;
  const db = await dbPromise;
  const user = await db.get('SELECT nome FROM usuarios WHERE id = ?', [id]);

  //condicao para que o admin mor nao seja editado 
  if (user?.nome?.toLowerCase() === 'nuno')
    return res.status(403).send('O admin-mor "nuno" não pode ser editado.');

  await db.run('UPDATE usuarios SET nome=?, tipo=? WHERE id=?', [nome, tipo, id]);
  res.redirect('/funcionarios');
});

//deletar funcionario
app.post('/funcionarios/deletar/:id', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const db = await dbPromise;
  const usuarioAlvo = await db.get('SELECT nome FROM usuarios WHERE id = ?', [id]);

  //condicao para que o admin mor nao seja editado 
  if (usuarioAlvo?.nome?.toLowerCase() === 'nuno')
    return res.status(403).send('O admin-mor "nuno" não pode ser deletado.');

  await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
  await db.run(
    'INSERT INTO logs (usuario, acao, data) VALUES (?, ?, DATETIME("now"))',
    [req.session.usuario?.nome || 'Sistema', `Deletou o usuário ID ${id}`]
  );
  res.redirect('/funcionarios');
});

// rota clientes 
app.get('/clientes', async (req, res) => {
  const db = await dbPromise;
  const clientes = await db.all('SELECT id, nome, email, telefone FROM clientes');
  res.render('clientes', { clientes, usuario: req.session.usuario });
});
 
//adicionar cliente
app.post('/clientes/adicionar', async (req, res) => {
  const db = await dbPromise;
  const { nome, email, telefone } = req.body;
  await db.run('INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)', [nome, email, telefone]);
  res.redirect('/clientes');
});

//editar cliente 
app.post('/clientes/editar/:id', async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;
  const { nome, email, telefone } = req.body;
  await db.run('UPDATE clientes SET nome=?, email=?, telefone=? WHERE id=?', [nome, email, telefone, id]);
  res.redirect('/clientes');
});

//deletar cliente
app.post('/clientes/deletar/:id', async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;
  await db.run('DELETE FROM clientes WHERE id=?', [id]);
  res.redirect('/clientes');
});

// rota estoque 
app.get('/estoque', async (req, res) => {
  const db = await dbPromise;
  const produtos = await db.all('SELECT * FROM estoque');
  const categorias = ['Medicamentos', 'Higiene', 'Cosmeticos', 'Outros']; 
  res.render('estoque', { produtos, categorias, usuario: req.session.usuario });
});

// adicionar produto
app.post('/estoque/adicionar', async (req, res) => {
  const db = await dbPromise;
  const { nome, categoria, quantidade, preco } = req.body;
  await db.run(
    'INSERT INTO estoque (nome, categoria, quantidade, preco) VALUES (?, ?, ?, ?)',
    [nome, categoria, quantidade, preco]
  );
  await db.run('INSERT INTO logs (usuario, acao) VALUES (?, ?)', [
    req.session.usuario?.nome || 'Desconhecido',
    `Adicionou o produto "${nome}" (${categoria})`
  ]);
  res.redirect('/estoque');
});

//editar produto
app.post('/estoque/editar/:id', async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;
  const { nome, categoria, quantidade, preco } = req.body;

  await db.run(
    'UPDATE estoque SET nome=?, categoria=?, quantidade=?, preco=? WHERE id=?',
    [nome, categoria, quantidade, preco, id]
  );

  await db.run('INSERT INTO logs (usuario, acao, data) VALUES (?, ?, DATETIME("now"))', [
    req.session.usuario?.nome || 'Desconhecido',
    `Editou o produto "${nome}" (ID ${id})`
  ]);

  res.redirect('/estoque');
});


// deletar produto
app.post('/estoque/deletar', async (req, res) => {
  const db = await dbPromise;
  const { id } = req.body;

  const produto = await db.get('SELECT nome FROM estoque WHERE id=?', [id]);
  await db.run('DELETE FROM estoque WHERE id=?', [id]);

  await db.run('INSERT INTO logs (usuario, acao, data) VALUES (?, ?, DATETIME("now"))', [
    req.session.usuario?.nome || 'Desconhecido',
    `Deletou o produto "${produto?.nome || 'desconhecido'}" (ID ${id})`
  ]);

  res.redirect('/estoque');
});


// rota dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  const db = await dbPromise;

  const cat = await db.all('SELECT categoria, SUM(quantidade) AS total FROM estoque GROUP BY categoria');
  const categorias = cat.map(r => r.categoria);
  const totais = cat.map(r => r.total);

  const vendas = await db.all('SELECT strftime("%m/%Y", data_venda) AS mes, SUM(total) AS total_vendas FROM vendas GROUP BY mes');
  const meses = vendas.map(v => v.mes);
  const totaisVendas = vendas.map(v => v.total_vendas);

  const alertasList = await db.all('SELECT id, nome, quantidade, quantidade_minima FROM estoque WHERE quantidade <= quantidade_minima');
  const alertasCount = alertasList.length;

const vendasSemanais = await db.all(`
  SELECT 
    strftime('%W', data_venda) AS semana,
    strftime('%Y', data_venda) AS ano,
    SUM(total) AS total_semana
  FROM vendas
  GROUP BY ano, semana
  ORDER BY ano, semana
`);

const semanas = vendasSemanais.map(v => `Sem ${v.semana}/${v.ano}`);
const totaisSemanais = vendasSemanais.map(v => v.total_semana);

res.render('dashboard', {
  usuario: req.session.usuario,
  categorias,
  totais,
  meses,
  totaisVendas,
  semanas,
  totaisSemanais,
  alertasList,
  alertasCount
});
});


// rota vendas
app.get('/vendas', async (req, res) => {
  const db = await dbPromise;
  const vendas = await db.all(`
    SELECT v.id, v.quantidade, v.total, v.data_venda, e.nome AS nome_produto
    FROM vendas v
    INNER JOIN estoque e ON v.produto_id = e.id
    ORDER BY v.data_venda DESC
  `);
  const produtos = await db.all('SELECT id, nome, preco FROM estoque ORDER BY nome ASC');
  res.render('vendas', { vendas, produtos, usuario: req.session.usuario });
});

//adicionar venda
app.post('/vendas/adicionar', async (req, res) => {
  const db = await dbPromise;
  let { produto_id, quantidade } = req.body;
  quantidade = Number(quantidade);
  const produto = await db.get('SELECT preco, quantidade, nome FROM estoque WHERE id=?', [produto_id]);
  if (!produto) return res.status(404).send('Produto não encontrado');
  if (produto.quantidade < quantidade) return res.status(400).send('Estoque insuficiente');

  const total = produto.preco * quantidade;
  await db.run('INSERT INTO vendas (produto_id, quantidade, total, data_venda) VALUES (?, ?, ?, DATETIME("now"))',
    [produto_id, quantidade, total]);
  await db.run('UPDATE estoque SET quantidade = quantidade - ? WHERE id=?', [quantidade, produto_id]);

  await db.run('INSERT INTO logs (usuario, acao, data) VALUES (?, ?, DATETIME("now"))', [
    req.session.usuario?.nome || 'Desconhecido',
    `Registrou uma venda do produto "${produto.nome}" (Qtd: ${quantidade}, Total: R$${total.toFixed(2)})`
  ]);

  res.redirect('/vendas');
});


//deletar venda 
app.post('/vendas/deletar', async (req, res) => {
  const db = await dbPromise;
  const { id } = req.body;

  const venda = await db.get(
    `SELECT v.id, e.nome AS produto FROM vendas v 
     INNER JOIN estoque e ON v.produto_id = e.id 
     WHERE v.id=?`, 
    [id]
  );

  await db.run('DELETE FROM vendas WHERE id=?', [id]);

  await db.run('INSERT INTO logs (usuario, acao, data) VALUES (?, ?, DATETIME("now"))', [
    req.session.usuario?.nome || 'Desconhecido',
    `Deletou a venda do produto "${venda?.produto || 'desconhecido'}" (Venda ID ${id})`
  ]);

  res.redirect('/vendas');
});


// rota login
app.get('/login', (req, res) => res.render('login', { erro: null }));

app.post('/cadastro', async (req, res) => {
  const { nome, senha, confirmarSenha } = req.body;
  if (!nome || !senha || !confirmarSenha)
    return res.render('login', { erro: 'Preencha todos os campos.' });

  if (senha !== confirmarSenha)
    return res.render('login', { erro: 'Senhas não coincidem.' });

  const db = await dbPromise;
  const existe = await db.get('SELECT id FROM usuarios WHERE nome=?', [nome]);
  if (existe) return res.render('login', { erro: 'Usuário já existe.' });

  const hash = await bcrypt.hash(senha, 10);
  await db.run('INSERT INTO usuarios (nome, senha, tipo) VALUES (?, ?, ?)', [nome, hash, 'usuario']);
  res.render('login', { erro: 'Usuário cadastrado com sucesso! Faça login.' });
});

//rota login para admin mor (nuno dono da farmacia)
app.post('/login', async (req, res) => {
  const { nome, senha } = req.body;
  const db = await dbPromise;

  if (nome.toLowerCase() === 'nuno' && senha === 'NunoM4ster2025') {
    let nuno = await db.get('SELECT * FROM usuarios WHERE nome="nuno"');
    if (!nuno)
      await db.run('INSERT INTO usuarios (nome, senha, tipo) VALUES (?, ?, ?)', ['nuno', await bcrypt.hash(senha, 10), 'admin']);
    req.session.usuario = { nome: 'nuno', tipo: 'admin' };
    return res.redirect('/dashboard');
  }

  const usuario = await db.get('SELECT * FROM usuarios WHERE nome=?', [nome]);
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha)))
    return res.render('login', { erro: 'Usuário ou senha inválidos!' });

  req.session.usuario = { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo };
  res.redirect('/dashboard');
});

//logout
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// start 
app.listen(4040, () => console.log('Servidor rodando em http://localhost:4040'));
