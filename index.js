const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');

// Serve os arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Conexão com o banco de dados SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criação das tabelas
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');

    db.run(`
        CREATE TABLE IF NOT EXISTS fornecedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnpj VARCHAR(18) UNIQUE NOT NULL,
            nome VARCHAR(100) NOT NULL,
            telefone VARCHAR(15)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            preco REAL NOT NULL,
            descricao TEXT,
            categoria TEXT,
            quantidade_estoque INTEGER NOT NULL,
            fornecedor_id INTEGER,
            FOREIGN KEY (fornecedor_id) REFERENCES fornecedores (id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            endereco TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            cpf TEXT NOT NULL UNIQUE,
            endereco TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_cpf TEXT NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade INTEGER NOT NULL,
            preco_unitario REAL NOT NULL,
            data TEXT NOT NULL,
            FOREIGN KEY (cliente_cpf) REFERENCES clientes (cpf),
            FOREIGN KEY (produto_id) REFERENCES produtos (id)
        )
    `);
});

// Helpers para usar o sqlite3 com async/await
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

function isUnique(err) {
    return err && err.message.includes('UNIQUE constraint failed');
}


///////////////////////////// Funcionários /////////////////////////////

app.post('/funcionarios', async (req, res) => {
    const { nome, telefone, email, cpf, endereco } = req.body;
    if (!nome || !cpf) {
        return res.status(400).json({ message: 'Nome e CPF são obrigatórios.' });
    }
    try {
        const r = await run(
            `INSERT INTO funcionarios (nome, telefone, email, cpf, endereco) VALUES (?, ?, ?, ?, ?)`,
            [nome, telefone, email, cpf, endereco]
        );
        res.status(201).json({ id: r.lastID, message: 'Funcionário cadastrado com sucesso.' });
    } catch (err) {
        if (isUnique(err)) return res.status(400).json({ message: 'Já existe um funcionário com este CPF.' });
        res.status(500).json({ message: 'Erro ao cadastrar funcionário.' });
    }
});

app.get('/funcionarios', async (req, res) => {
    const cpf = req.query.cpf || '';
    try {
        const rows = cpf
            ? await all(`SELECT * FROM funcionarios WHERE cpf LIKE ?`, [`%${cpf}%`])
            : await all(`SELECT * FROM funcionarios`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar funcionários.' });
    }
});

app.put('/funcionarios/cpf/:cpf', async (req, res) => {
    const { cpf } = req.params;
    const { nome, telefone, email, endereco } = req.body;
    try {
        const r = await run(
            `UPDATE funcionarios SET nome = ?, telefone = ?, email = ?, endereco = ? WHERE cpf = ?`,
            [nome, telefone, email, endereco, cpf]
        );
        if (r.changes === 0) return res.status(404).json({ message: 'Funcionário não encontrado.' });
        res.json({ message: 'Funcionário atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar funcionário.' });
    }
});


///////////////////////////// Fornecedores /////////////////////////////

app.post('/fornecedores', async (req, res) => {
    const { cnpj, nome, telefone } = req.body;
    if (!cnpj || !nome) {
        return res.status(400).json({ message: 'CNPJ e nome são obrigatórios.' });
    }
    try {
        const r = await run(`INSERT INTO fornecedores (cnpj, nome, telefone) VALUES (?, ?, ?)`, [cnpj, nome, telefone]);
        res.status(201).json({ id: r.lastID, message: 'Fornecedor cadastrado com sucesso.' });
    } catch (err) {
        if (isUnique(err)) return res.status(400).json({ message: 'Já existe um fornecedor cadastrado com este CNPJ!' });
        res.status(500).json({ message: 'Erro ao cadastrar fornecedor.' });
    }
});

app.get('/fornecedores', async (req, res) => {
    const cnpj = req.query.cnpj || '';
    try {
        const rows = cnpj
            ? await all(`SELECT * FROM fornecedores WHERE cnpj LIKE ?`, [`%${cnpj}%`])
            : await all(`SELECT * FROM fornecedores`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar fornecedores.' });
    }
});

app.get('/fornecedores/:id', async (req, res) => {
    try {
        const row = await get(`SELECT * FROM fornecedores WHERE id = ?`, [req.params.id]);
        if (!row) return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar fornecedor.' });
    }
});

app.put('/fornecedores/:id', async (req, res) => {
    const { cnpj, nome, telefone } = req.body;
    try {
        const r = await run(
            `UPDATE fornecedores SET cnpj = ?, nome = ?, telefone = ? WHERE id = ?`,
            [cnpj, nome, telefone, req.params.id]
        );
        if (r.changes === 0) return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        res.json({ message: 'Fornecedor atualizado com sucesso.' });
    } catch (err) {
        if (isUnique(err)) return res.status(400).json({ message: 'Já existe outro fornecedor com este CNPJ!' });
        res.status(500).json({ message: 'Erro ao atualizar fornecedor.' });
    }
});


///////////////////////////// Produtos /////////////////////////////

app.post('/produtos', async (req, res) => {
    const { nome, preco, descricao, categoria, quantidade_estoque, fornecedor_id } = req.body;
    if (!nome || preco == null || quantidade_estoque == null) {
        return res.status(400).json({ message: 'Nome, preço e quantidade são obrigatórios.' });
    }
    try {
        const r = await run(
            `INSERT INTO produtos (nome, preco, descricao, categoria, quantidade_estoque, fornecedor_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, preco, descricao, categoria, quantidade_estoque, fornecedor_id || null]
        );
        res.status(201).json({ id: r.lastID, message: 'Produto cadastrado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao cadastrar produto.' });
    }
});

app.get('/produtos', async (req, res) => {
    try {
        const rows = await all(`
            SELECT produtos.*, fornecedores.nome AS fornecedor_nome
            FROM produtos
            LEFT JOIN fornecedores ON produtos.fornecedor_id = fornecedores.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao listar produtos.' });
    }
});

app.get('/produtos/:id', async (req, res) => {
    try {
        const row = await get(`SELECT * FROM produtos WHERE id = ?`, [req.params.id]);
        if (!row) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar produto.' });
    }
});

app.put('/produtos/:id', async (req, res) => {
    const { nome, preco, descricao, categoria, quantidade_estoque, fornecedor_id } = req.body;
    try {
        const r = await run(
            `UPDATE produtos SET nome = ?, preco = ?, descricao = ?, categoria = ?, quantidade_estoque = ?, fornecedor_id = ? WHERE id = ?`,
            [nome, preco, descricao, categoria, quantidade_estoque, fornecedor_id || null, req.params.id]
        );
        if (r.changes === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.json({ message: 'Produto atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar produto.' });
    }
});


///////////////////////////// Clientes /////////////////////////////

app.post('/clientes', async (req, res) => {
    const { nome, cpf, email, telefone, endereco } = req.body;
    if (!nome || !cpf) {
        return res.status(400).json({ message: 'Nome e CPF são obrigatórios.' });
    }
    try {
        const r = await run(
            `INSERT INTO clientes (nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)`,
            [nome, cpf, email, telefone, endereco]
        );
        res.status(201).json({ id: r.lastID, message: 'Cliente cadastrado com sucesso.' });
    } catch (err) {
        if (isUnique(err)) return res.status(400).json({ message: 'Já existe um cliente com este CPF.' });
        res.status(500).json({ message: 'Erro ao cadastrar cliente.' });
    }
});

// Lista todos os clientes ou busca por parte do CPF (?cpf=)
app.get('/clientes', async (req, res) => {
    const cpf = req.query.cpf || '';
    try {
        const rows = cpf
            ? await all(`SELECT * FROM clientes WHERE cpf LIKE ?`, [`%${cpf}%`])
            : await all(`SELECT * FROM clientes`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar clientes.' });
    }
});

// Busca um cliente pelo CPF exato
app.get('/clientes/:cpf', async (req, res) => {
    try {
        const row = await get(`SELECT * FROM clientes WHERE cpf = ?`, [req.params.cpf]);
        if (!row) return res.status(404).json({ message: 'Cliente não encontrado.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.put('/clientes/cpf/:cpf', async (req, res) => {
    const { cpf } = req.params;
    const { nome, email, telefone, endereco } = req.body;
    try {
        const r = await run(
            `UPDATE clientes SET nome = ?, email = ?, telefone = ?, endereco = ? WHERE cpf = ?`,
            [nome, email, telefone, endereco, cpf]
        );
        if (r.changes === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
        res.json({ message: 'Cliente atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar cliente.' });
    }
});


///////////////////////////// Vendas /////////////////////////////

// Registra a venda em uma transação: se algum item falhar (ex.: estoque
// insuficiente), nada é gravado.
let vendaEmAndamento = Promise.resolve();

app.post('/vendas', (req, res) => {
    // Processa uma venda por vez para a transação não se misturar com outra
    vendaEmAndamento = vendaEmAndamento
        .then(() => registrarVenda(req, res))
        .catch((err) => console.error(err));
});

async function registrarVenda(req, res) {
    const { cliente_cpf, itens } = req.body;

    if (!cliente_cpf || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ message: 'Dados da venda incompletos.' });
    }

    const dataVenda = new Date().toISOString();

    try {
        const cliente = await get(`SELECT id FROM clientes WHERE cpf = ?`, [cliente_cpf]);
        if (!cliente) return res.status(404).json({ message: 'Cliente não encontrado.' });

        await run('BEGIN TRANSACTION');

        for (const { idProduto, quantidade } of itens) {
            const qtd = parseInt(quantidade, 10);
            if (!idProduto || !qtd || qtd <= 0) {
                throw { status: 400, message: `Item inválido (produto ${idProduto}, quantidade ${quantidade}).` };
            }

            const produto = await get(`SELECT id, nome, preco, quantidade_estoque FROM produtos WHERE id = ?`, [idProduto]);
            if (!produto) {
                throw { status: 404, message: `Produto ${idProduto} não encontrado.` };
            }

            const r = await run(
                `UPDATE produtos SET quantidade_estoque = quantidade_estoque - ? WHERE id = ? AND quantidade_estoque >= ?`,
                [qtd, produto.id, qtd]
            );
            if (r.changes === 0) {
                throw { status: 400, message: `Estoque insuficiente para "${produto.nome}".` };
            }

            await run(
                `INSERT INTO vendas (cliente_cpf, produto_id, quantidade, preco_unitario, data) VALUES (?, ?, ?, ?, ?)`,
                [cliente_cpf, produto.id, qtd, produto.preco, dataVenda]
            );
        }

        await run('COMMIT');
        res.status(201).json({ message: 'Venda registrada com sucesso.' });
    } catch (err) {
        await run('ROLLBACK').catch(() => {});
        if (err.status) return res.status(err.status).json({ message: err.message });
        console.error('Erro ao registrar venda:', err);
        res.status(500).json({ message: 'Erro ao processar a venda.' });
    }
}


///////////////////////////// Relatórios /////////////////////////////

// Busca vendas com filtros opcionais: cpf, produto, dataInicio, dataFim (AAAA-MM-DD)
app.get('/relatorios', async (req, res) => {
    const { cpf, produto, dataInicio, dataFim } = req.query;

    let query = `SELECT
                    vendas.id,
                    vendas.cliente_cpf,
                    vendas.produto_id,
                    vendas.quantidade,
                    vendas.preco_unitario,
                    vendas.quantidade * vendas.preco_unitario AS total,
                    vendas.data,
                    produtos.nome AS produto_nome,
                    clientes.nome AS cliente_nome
                 FROM vendas
                 JOIN produtos ON vendas.produto_id = produtos.id
                 JOIN clientes ON vendas.cliente_cpf = clientes.cpf
                 WHERE 1=1`;
    const params = [];

    if (cpf) {
        query += ` AND vendas.cliente_cpf = ?`;
        params.push(cpf);
    }
    if (produto) {
        query += ` AND produtos.nome LIKE ?`;
        params.push(`%${produto}%`);
    }
    if (dataInicio) {
        query += ` AND date(vendas.data, 'localtime') >= date(?)`;
        params.push(dataInicio);
    }
    if (dataFim) {
        query += ` AND date(vendas.data, 'localtime') <= date(?)`;
        params.push(dataFim);
    }
    query += ` ORDER BY vendas.data DESC`;

    try {
        res.json(await all(query, params));
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar relatórios.' });
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
