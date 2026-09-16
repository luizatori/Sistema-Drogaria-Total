const { registrar } = require('./server/auth');

(async () => {
  try {
    const id = await registrar('Gustavo', '1234');
    console.log(`Usuário criado com ID: ${id}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    process.exit(1);
  }
})();


//OPCIONAL