let fornecedorAtual = null;
let fornecedores = [];

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fornecedor-form').addEventListener('submit', cadastrarFornecedor);

    listarFornecedores();

    // Formatar CNPJ e telefone enquanto digita
    document.getElementById('cnpj').addEventListener('input', formatarCNPJInput);
    document.getElementById('edit-cnpj').addEventListener('input', formatarCNPJInput);
    document.getElementById('telefone').addEventListener('input', formatarTelefoneInput);
    document.getElementById('edit-telefone').addEventListener('input', formatarTelefoneInput);

    // Pesquisar ao pressionar Enter no campo de CNPJ
    document.getElementById('pesquisa-cnpj').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            pesquisarPorCNPJ();
        }
    });
});

// Escapa texto antes de inserir no HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function cadastrarFornecedor(event) {
    event.preventDefault();

    const fornecedor = {
        nome: document.getElementById("nome").value,
        telefone: document.getElementById("telefone").value.replace(/\D/g, ''),
        cnpj: document.getElementById("cnpj").value.replace(/\D/g, '')
    };

    try {
        const response = await fetch('/fornecedores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fornecedor)
        });
        const result = await response.json();

        if (response.ok) {
            alert("Fornecedor cadastrado com sucesso!");
            document.getElementById("fornecedor-form").reset();
            listarFornecedores();
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error("Erro ao cadastrar fornecedor:", err);
        alert("Erro ao cadastrar fornecedor.");
    }
}

// Pesquisa fornecedor por CNPJ
async function pesquisarPorCNPJ() {
    const cnpj = document.getElementById('pesquisa-cnpj').value.trim().replace(/\D/g, '');

    if (!cnpj) {
        alert('Por favor, digite um CNPJ para pesquisar.');
        return;
    }

    try {
        const response = await fetch(`/fornecedores?cnpj=${encodeURIComponent(cnpj)}`);
        if (!response.ok) throw new Error('Erro na pesquisa');
        const resultado = await response.json();
        exibirFornecedores(resultado, 'Nenhum fornecedor encontrado com este CNPJ.');
    } catch (error) {
        console.error('Erro ao pesquisar fornecedor:', error);
        alert('Erro ao pesquisar fornecedor.');
    }
}

// Lista todos os fornecedores
async function listarFornecedores() {
    try {
        const response = await fetch('/fornecedores');
        if (!response.ok) throw new Error('Erro ao buscar fornecedores');
        fornecedores = await response.json();
        exibirFornecedores(fornecedores, 'Nenhum fornecedor cadastrado.');
    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        alert('Erro ao carregar lista de fornecedores.');
    }
}

function exibirFornecedores(lista, mensagemVazia) {
    const tabela = document.getElementById('tabela-fornecedores');
    tabela.innerHTML = '';

    if (lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5">${mensagemVazia}</td></tr>`;
        return;
    }

    lista.forEach(fornecedor => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${fornecedor.id}</td>
            <td>${esc(fornecedor.nome)}</td>
            <td>${esc(formatarCNPJ(fornecedor.cnpj))}</td>
            <td>${esc(formatarTelefone(fornecedor.telefone))}</td>
            <td>
                <button class="btn-edit" onclick="editarFornecedor(${fornecedor.id})">
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

// Formata CNPJ para exibição
function formatarCNPJ(cnpj) {
    cnpj = String(cnpj ?? '').replace(/\D/g, '');
    if (cnpj.length === 14) {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return cnpj;
}

// Formata CNPJ enquanto digita
function formatarCNPJInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);

    if (value.length > 12) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
    } else if (value.length > 8) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
    }

    e.target.value = value;
}

// Formata telefone para exibição
function formatarTelefone(telefone) {
    const nums = String(telefone ?? '').replace(/\D/g, '');
    if (nums.length === 11) {
        return nums.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (nums.length === 10) {
        return nums.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return telefone ?? '';
}

// Formata telefone enquanto digita
function formatarTelefoneInput(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
        value = value.replace(/^(\d{0,2})/, '($1');
    }

    e.target.value = value;
}

// Abre o modal de edição
function editarFornecedor(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;

    fornecedorAtual = fornecedor;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nome').value = fornecedor.nome;
    document.getElementById('edit-cnpj').value = formatarCNPJ(fornecedor.cnpj);
    document.getElementById('edit-telefone').value = formatarTelefone(fornecedor.telefone);

    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    fornecedorAtual = null;
}

// Salva as edições
async function salvarEdicao() {
    if (!fornecedorAtual) return;

    const fornecedorAtualizado = {
        nome: document.getElementById('edit-nome').value,
        cnpj: document.getElementById('edit-cnpj').value.replace(/\D/g, ''),
        telefone: document.getElementById('edit-telefone').value.replace(/\D/g, '')
    };

    try {
        const response = await fetch(`/fornecedores/${fornecedorAtual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fornecedorAtualizado)
        });
        const result = await response.json();

        if (response.ok) {
            alert('Fornecedor atualizado com sucesso!');
            closeEditModal();
            listarFornecedores();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        alert('Erro ao atualizar fornecedor.');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Fechar sidebar quando clicar fora dela em mobile e modal ao clicar fora
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    const modal = document.getElementById('editModal');

    if (window.innerWidth <= 768) {
        if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    }

    if (event.target === modal) {
        closeEditModal();
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeEditModal();
    }
});
