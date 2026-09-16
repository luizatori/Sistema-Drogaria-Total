require('dotenv').config({ path: __dirname + '/.env' }); // caminho absoluto para carregar as variaveis do .env

// server/db.js
require('dotenv').config({ path: __dirname + '/.env' });
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// define um local seguro para armazenar o banco (fora do .asar)
const userDataPath =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? path.join(process.env.HOME, 'Library', 'Application Support')
    : path.join(process.env.HOME, '.config'));

const appFolder = path.join(userDataPath, 'DrogariaTotal');

//cria pasta caso nao exista 
if (!fs.existsSync(appFolder)) {
  fs.mkdirSync(appFolder, { recursive: true });
}

// caminho final do banco
const dbPath = path.join(appFolder, 'database.sqlite');

async function initDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      tipo TEXT DEFAULT 'usuario',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT,
      acao TEXT,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      quantidade INTEGER DEFAULT 0,
      quantidade_minima INTEGER DEFAULT 5,
      preco REAL DEFAULT 0.0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER,
      quantidade INTEGER,
      total REAL,
      data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (produto_id) REFERENCES estoque(id)
    );
  `);

  console.log('Banco SQLite iniciado com sucesso em:', dbPath);
  return db;
}

module.exports = initDB();
