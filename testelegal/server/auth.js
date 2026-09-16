//funcoes de autenticacao

//requerimentos
const db = require ('./db');
const bcrypt = require('bcryptjs');

//registrar novo usuario
async function registrar(nome, senha) {
  const hash = await bcrypt.hash(senha, 10);
  const [result] = await db.execute(
    'INSERT INTO usuarios (nome, senha) VALUES (?, ?)',
    [nome, hash]
  );
  return result.insertId;
}

// login
async function login(nome, senha) {
  console.log('Login tentando:', nome, senha); // DEBUG
  nome = nome.trim();
  const [rows] = await db.execute('SELECT * FROM usuarios WHERE nome = ?', [nome]);
  console.log('Rows do DB:', rows); // DEBUG

  if (rows.length === 0) return null;

  const usuario = rows[0];
  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
  console.log('Senha bateu?', senhaCorreta); // DEBUG

  if (!senhaCorreta) return null;

  return { id: usuario.id, nome: usuario.nome };
}
module.exports = { registrar, login };