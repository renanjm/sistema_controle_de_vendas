// produto.js - página de produtos

let produtoAtual = null;
let todosProdutos = [];
let fornecedores = [];

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async function() {
    await buscarFornecedores();
    listarProdutos();

    document.getElementById('preco').addEventListener('input', function() { formatarPreco(this); });
    document.getElementById('edit-preco').addEventListener('input', function() { formatarPreco(this); });

    // Pesquisar ao pressionar Enter
    document.getElementById('pesquisa-valor').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            pesquisarProduto();
        }
    });
});

// Escapa texto antes de inserir no HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Busca os fornecedores na API e preenche os selects
async function buscarFornecedores() {
    try {
        const response = await fetch('/fornecedores');
        fornecedores = await response.json();
    } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        fornecedores = [];
    }
    preencherDropdownFornecedores(fornecedores);
}

function preencherDropdownFornecedores(lista) {
    ['fornecedoresSelecionado', 'edit-fornecedor'].forEach(id => {
        const select = document.getElementById(id);
        while (select.options.length > 1) select.remove(1);
        lista.forEach(fornecedor => {
            const option = document.createElement('option');
            option.value = fornecedor.id;
            option.textContent = fornecedor.nome;
            select.appendChild(option);
        });
    });
}

// Converte "R$ 1.234,56" em 1234.56
function lerPreco(texto) {
    return parseFloat(
        texto.replace('R$', '')
             .replace(/\./g, '')
             .replace(',', '.')
             .trim()
    );
}

// Cadastrar produto com validações
async function cadastrarProduto(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const preco = lerPreco(document.getElementById("preco").value);
    const quantidade = parseInt(document.getElementById("quantidade_estoque").value);
    const fornecedorId = parseInt(document.getElementById("fornecedoresSelecionado").value);

    if (!nome) {
        alert("Por favor, insira um nome para o produto!");
        return false;
    }
    if (isNaN(quantidade) || quantidade < 0) {
        alert("A quantidade em estoque não pode ser negativa!");
        return false;
    }
    if (isNaN(preco) || preco <= 0) {
        alert("Por favor, insira um preço válido maior que zero!");
        return false;
    }

    const produto = {
        nome,
        preco,
        descricao: document.getElementById("descricao").value.trim(),
        categoria: document.getElementById("categoria").value.trim(),
        quantidade_estoque: quantidade,
        fornecedor_id: fornecedorId || null
    };

    try {
        const response = await fetch('/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produto)
        });
        const result = await response.json();

        if (response.ok) {
            alert("Produto cadastrado com sucesso!");
            document.getElementById("produto-form").reset();
            listarProdutos();
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        console.error("Erro ao cadastrar produto:", err);
        alert("Erro ao cadastrar produto. Verifique os dados e tente novamente.");
    }
    return false;
}

// Formata o preço enquanto digita
function formatarPreco(input) {
    let valor = input.value.replace(/[^\d,]/g, '');

    if (valor === '') {
        input.value = '';
        return;
    }

    const partes = valor.split(',');
    let parteInteira = partes[0].replace(/\D/g, '');
    let parteDecimal = partes.length > 1 ? partes.slice(1).join('').replace(/\D/g, '').substring(0, 2) : null;

    if (parteInteira.length > 0) {
        parteInteira = parseInt(parteInteira, 10).toLocaleString('pt-BR');
    }

    input.value = 'R$ ' + parteInteira + (parteDecimal !== null ? ',' + parteDecimal : '');
}

// Lista todos os produtos
async function listarProdutos() {
    try {
        const response = await fetch('/produtos');
        if (!response.ok) throw new Error('Erro ao buscar produtos');
        todosProdutos = await response.json();
        exibirProdutos(todosProdutos);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        document.getElementById('tabela-produtos').innerHTML =
            '<tr><td colspan="7" style="text-align: center; color: #666;">Erro ao carregar produtos.</td></tr>';
    }
}

// Pesquisa produto por nome, categoria ou fornecedor
function pesquisarProduto() {
    const tipoPesquisa = document.querySelector('input[name="search-type"]:checked').value;
    const valorPesquisa = document.getElementById('pesquisa-valor').value.trim().toLowerCase();

    if (!valorPesquisa) {
        alert('Por favor, digite um valor para pesquisar.');
        return;
    }

    const campo = tipoPesquisa === 'fornecedor_id' ? 'fornecedor_nome' : tipoPesquisa;
    const produtosFiltrados = todosProdutos.filter(produto =>
        String(produto[campo] ?? '').toLowerCase().includes(valorPesquisa)
    );

    exibirProdutos(produtosFiltrados);
}

function limparPesquisa() {
    document.getElementById('pesquisa-valor').value = '';
    listarProdutos();
}

// Exibe produtos na tabela
function exibirProdutos(produtos) {
    const tabela = document.getElementById('tabela-produtos');

    if (!produtos || produtos.length === 0) {
        tabela.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">Nenhum produto encontrado.</td></tr>';
        return;
    }

    tabela.innerHTML = '';

    produtos.forEach(produto => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${produto.id}</td>
            <td>${esc(produto.nome)}</td>
            <td>R$ ${Number(produto.preco || 0).toFixed(2).replace('.', ',')}</td>
            <td>${esc(produto.categoria) || '-'}</td>
            <td>${produto.quantidade_estoque ?? 0}</td>
            <td>${esc(produto.fornecedor_nome) || 'Não informado'}</td>
            <td>
                <button class="btn-edit" onclick="editarProduto(${produto.id})">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    Editar
                </button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

// Abre o modal de edição
function editarProduto(id) {
    const produto = todosProdutos.find(p => p.id === id);
    if (!produto) return;
    produtoAtual = produto;

    document.getElementById('edit-id').value = produto.id;
    document.getElementById('edit-nome').value = produto.nome;
    document.getElementById('edit-preco').value = `R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}`;
    document.getElementById('edit-categoria').value = produto.categoria || '';
    document.getElementById('edit-descricao').value = produto.descricao || '';
    document.getElementById('edit-quantidade_estoque').value = produto.quantidade_estoque;
    document.getElementById('edit-fornecedor').value = produto.fornecedor_id || '';

    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    produtoAtual = null;
}

// Salva as edições
async function salvarEdicao() {
    if (!produtoAtual) return;

    const preco = lerPreco(document.getElementById('edit-preco').value);
    if (isNaN(preco)) {
        alert("Por favor, insira um preço válido!");
        return;
    }

    const produtoAtualizado = {
        nome: document.getElementById('edit-nome').value,
        preco,
        categoria: document.getElementById('edit-categoria').value,
        descricao: document.getElementById('edit-descricao').value,
        quantidade_estoque: parseInt(document.getElementById('edit-quantidade_estoque').value),
        fornecedor_id: parseInt(document.getElementById('edit-fornecedor').value) || null
    };

    try {
        const response = await fetch(`/produtos/${produtoAtual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produtoAtualizado)
        });
        const result = await response.json();

        if (response.ok) {
            alert('Produto atualizado com sucesso!');
            closeEditModal();
            listarProdutos();
        } else {
            alert('Erro: ' + result.message);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao atualizar produto.');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Fechar modal clicando fora dele
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById('editModal')) {
        closeEditModal();
    }
});
