let produtosDisponiveis = [];

document.addEventListener('DOMContentLoaded', buscarProdutos);

// Escapa texto antes de inserir no HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Busca cliente pelo CPF
async function buscarCliente() {
    const cpf = document.getElementById("cpf-cliente").value.trim();
    const clienteInfo = document.getElementById("cliente-info");

    if (!cpf) {
        alert("Por favor, insira o CPF do cliente.");
        return;
    }

    try {
        const response = await fetch(`/clientes/${encodeURIComponent(cpf)}`);
        if (response.status === 404) {
            clienteInfo.innerHTML = '';
            alert("Cliente não encontrado.");
            return;
        }
        if (!response.ok) throw new Error('Erro ao buscar cliente');

        const cliente = await response.json();
        clienteInfo.innerHTML = `
            <p><strong>Nome:</strong> ${esc(cliente.nome)}</p>
            <p><strong>CPF:</strong> ${esc(cliente.cpf)}</p>
            <p><strong>Email:</strong> ${esc(cliente.email)}</p>
        `;
    } catch (error) {
        console.error(error);
        alert("Erro ao buscar cliente.");
    }
}

// Carrega os produtos com estoque no select
async function buscarProdutos() {
    try {
        const response = await fetch('/produtos');
        if (!response.ok) throw new Error('Erro ao buscar produtos');
        produtosDisponiveis = await response.json();

        const select = document.getElementById('produto-nome');
        while (select.options.length > 1) select.remove(1);

        produtosDisponiveis
            .filter(produto => produto.quantidade_estoque > 0)
            .forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id;
                option.textContent = `${produto.nome} - ${formatarMoeda(produto.preco)} - Disponível: ${produto.quantidade_estoque}`;
                select.appendChild(option);
            });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Quantidade de um produto que já está no carrinho
function quantidadeNoCarrinho(id) {
    let total = 0;
    document.querySelectorAll(`#carrinho tr[data-id="${id}"]`).forEach(row => {
        total += parseInt(row.getAttribute('data-quantidade'));
    });
    return total;
}

// Adiciona o produto selecionado ao carrinho
function adicionarProdutoAoCarrinho() {
    const id = parseInt(document.getElementById("produto-nome").value);
    const quantidade = parseInt(document.getElementById("produto-quantidade").value);

    if (!id || isNaN(quantidade) || quantidade <= 0) {
        alert("Por favor, insira um produto válido e uma quantidade maior que zero.");
        return;
    }

    const produto = produtosDisponiveis.find(p => p.id === id);
    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    if (quantidade + quantidadeNoCarrinho(id) > produto.quantidade_estoque) {
        alert(`Quantidade indisponível. Estoque atual: ${produto.quantidade_estoque}`);
        return;
    }

    adicionarProdutoNaTabela(produto, quantidade);
}

function adicionarProdutoNaTabela(produto, quantidade) {
    const carrinhoBody = document.querySelector("#carrinho");
    const subtotal = produto.preco * quantidade;

    const novaLinha = document.createElement("tr");
    novaLinha.setAttribute('data-id', produto.id);
    novaLinha.setAttribute('data-quantidade', quantidade);
    novaLinha.innerHTML = `
        <td>${produto.id}</td>
        <td>${esc(produto.nome)}</td>
        <td>${quantidade}</td>
        <td>${formatarMoeda(produto.preco)}</td>
        <td>${formatarMoeda(subtotal)}</td>
        <td><button onclick="removerProduto(this, ${subtotal})">Remover</button></td>
    `;

    carrinhoBody.appendChild(novaLinha);
    atualizarTotalVenda(subtotal);
}

function removerProduto(botao, subtotal) {
    botao.closest("tr").remove();
    atualizarTotalVenda(-subtotal);
}

function atualizarTotalVenda(valor) {
    const totalVendaElement = document.getElementById("total-venda");
    const valorAtual = parseFloat(totalVendaElement.getAttribute("data-total")) || 0;
    const novoTotal = valorAtual + valor;

    totalVendaElement.setAttribute("data-total", novoTotal);
    totalVendaElement.textContent = `Total: ${formatarMoeda(novoTotal)}`;
}

// Envia a venda para o servidor
async function finalizarVenda() {
    const cpfCliente = document.getElementById("cpf-cliente").value.trim();
    const carrinhoRows = document.querySelectorAll("#carrinho tr");

    if (!cpfCliente) {
        alert("Por favor, insira o CPF do cliente.");
        return;
    }

    if (carrinhoRows.length === 0) {
        alert("O carrinho está vazio. Adicione produtos para finalizar a venda.");
        return;
    }

    const itens = [];
    carrinhoRows.forEach(row => {
        itens.push({
            idProduto: parseInt(row.getAttribute("data-id")),
            quantidade: parseInt(row.getAttribute("data-quantidade"))
        });
    });

    try {
        const response = await fetch('/vendas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_cpf: cpfCliente, itens })
        });
        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Erro ao finalizar a venda. Verifique os dados.");
            return;
        }

        alert("Venda realizada com sucesso!");
        limparFormulario();
        buscarProdutos(); // Atualiza o estoque exibido
    } catch (error) {
        console.error(error);
        alert("Erro ao finalizar a venda.");
    }
}

function limparFormulario() {
    document.getElementById("cpf-cliente").value = "";
    document.getElementById("cliente-info").innerHTML = "";
    document.querySelector("#carrinho").innerHTML = "";
    const totalVendaElement = document.getElementById("total-venda");
    totalVendaElement.setAttribute("data-total", "0");
    totalVendaElement.textContent = `Total: ${formatarMoeda(0)}`;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Fechar sidebar quando clicar fora dela em mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');

    if (window.innerWidth <= 768) {
        if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    }
});
