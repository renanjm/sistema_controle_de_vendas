let funcionarioAtual = null;
let todosFuncionarios = [];
let funcionariosExibidos = [];

// Escapa texto antes de inserir no HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Carregar funcionários ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    listarFuncionarios();

    // Pesquisar ao pressionar Enter
    document.getElementById('pesquisa-valor').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            pesquisarFuncionario();
        }
    });
});

async function cadastrarFuncionario(event) {
    event.preventDefault();

    const funcionario = {
        nome: document.getElementById("nome").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        cpf: document.getElementById("cpf").value,
        endereco: document.getElementById("endereco").value
    };

    try {
        const response = await fetch('/funcionarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(funcionario)
        });

        if (response.ok) {
            alert("Funcionário cadastrado com sucesso!");
            document.getElementById("funcionario-form").reset();
            listarFuncionarios(); // Atualiza a lista
        } else {
            const result = await response.json();
            alert("Erro ao cadastrar: " + result.message);
        }
    } catch (err) {
        console.error("Erro:", err);
        alert("Erro ao cadastrar funcionário.");
    }
}

// Função para pesquisar funcionário por qualquer atributo
function pesquisarFuncionario() {
    const tipoPesquisa = document.querySelector('input[name="search-type"]:checked').value;
    const valorPesquisa = document.getElementById('pesquisa-valor').value.trim();

    if (!valorPesquisa) {
        alert('Por favor, digite um valor para pesquisar.');
        return;
    }

    // Se é pesquisa por CPF, usar a API (que suporta busca por CPF)
    if (tipoPesquisa === 'cpf') {
        fetch(`/funcionarios?cpf=${encodeURIComponent(valorPesquisa)}`)
            .then(response => {
                if (!response.ok) throw new Error('Erro na pesquisa');
                return response.json();
            })
            .then(funcionarios => exibirFuncionarios(funcionarios))
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao pesquisar funcionários.');
            });
    } else {
        // Para outros tipos, pesquisar localmente se temos os dados
        if (todosFuncionarios.length > 0) {
            const funcionariosFiltrados = todosFuncionarios.filter(funcionario => {
                if (!funcionario[tipoPesquisa]) return false;

                // Busca case-insensitive
                return funcionario[tipoPesquisa].toString()
                    .toLowerCase()
                    .includes(valorPesquisa.toLowerCase());
            });

            exibirFuncionarios(funcionariosFiltrados);
        } else {
            exibirFuncionarios([]);
        }
    }
}

// Função para limpar a pesquisa
function limparPesquisa() {
    document.getElementById('pesquisa-valor').value = '';
    listarFuncionarios();
}

// Função para listar todos os funcionários
async function listarFuncionarios() {
    try {
        const response = await fetch('/funcionarios');

        if (!response.ok) {
            throw new Error('Erro ao buscar funcionários');
        }

        todosFuncionarios = await response.json();
        exibirFuncionarios(todosFuncionarios);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('tabela-funcionarios').innerHTML = 
            '<tr><td colspan="7">Erro ao carregar funcionários.</td></tr>';
    }
}

// Função para exibir funcionários na tabela
function exibirFuncionarios(funcionarios) {
    funcionariosExibidos = funcionarios || [];
    const tabela = document.getElementById('tabela-funcionarios');

    if (!funcionarios || funcionarios.length === 0) {
        tabela.innerHTML = '<tr><td colspan="7">Nenhum funcionário encontrado.</td></tr>';
        return;
    }

    // Limpa a tabela
    tabela.innerHTML = '';

    // Preenche com os dados
    funcionarios.forEach(funcionario => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${funcionario.id || '-'}</td>
            <td>${esc(funcionario.nome) || '-'}</td>
            <td>${esc(funcionario.cpf) || '-'}</td>
            <td>${esc(funcionario.email) || '-'}</td>
            <td>${esc(funcionario.telefone) || '-'}</td>
            <td>${esc(funcionario.endereco) || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editarFuncionario(${funcionario.id})">
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

// Função para abrir o modal de edição
function editarFuncionario(id) {
    const funcionario = funcionariosExibidos.find(f => f.id === id);
    if (!funcionario) return;
    funcionarioAtual = funcionario;

    document.getElementById('edit-id').value = funcionario.id;
    document.getElementById('edit-nome').value = funcionario.nome;
    document.getElementById('edit-cpf').value = funcionario.cpf;
    document.getElementById('edit-cpf-original').value = funcionario.cpf;
    document.getElementById('edit-email').value = funcionario.email || '';
    document.getElementById('edit-telefone').value = funcionario.telefone || '';
    document.getElementById('edit-endereco').value = funcionario.endereco || '';

    document.getElementById('editModal').style.display = 'block';
}

// Função para fechar o modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    funcionarioAtual = null;
}

// Função para salvar as edições
async function salvarEdicao() {
    if (!funcionarioAtual) return;

    const cpfOriginal = document.getElementById('edit-cpf-original').value;
    const funcionarioAtualizado = {
        nome: document.getElementById('edit-nome').value,
        email: document.getElementById('edit-email').value,
        telefone: document.getElementById('edit-telefone').value,
        endereco: document.getElementById('edit-endereco').value
    };

    try {
        const response = await fetch(`/funcionarios/cpf/${cpfOriginal}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(funcionarioAtualizado)
        });

        if (response.ok) {
            alert('Funcionário atualizado com sucesso!');
            closeEditModal();
            listarFuncionarios(); // Recarrega a lista
        } else {
            const result = await response.json();
            alert('Erro ao atualizar: ' + result.message);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao atualizar funcionário.');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Fechar modal clicando fora dele
window.addEventListener('click', function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
});