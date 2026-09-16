const db = require('../server/db'); 

async function registrarLog(usuario, acao) {
  try {
    await db.query('INSERT INTO logs (usuario, acao) VALUES (?, ?)', [usuario, acao]);
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}

module.exports = { registrarLog };
