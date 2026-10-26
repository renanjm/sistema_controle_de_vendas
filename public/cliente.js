let clienteAtual = null;
let clientesExibidos = [];

// Escapa texto antes de inserir no HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function exibirClientes(clientes) {
    clientesExibidos = clientes;
    const tabela = document.getElementById('tabela-clientes');
    tabela.innerHTML = '';
    clientes.forEach(cliente => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${cliente.id}</td>
            <td>${esc(cliente.nome)}</td>
            <td>${esc(cliente.cpf)}</td>
            <td>${esc(cliente.email)}</td>
            <td>${esc(cliente.telefone)}</td>
            <td>${esc(cliente.endereco)}</td>
            <td>
                <button class="btn-edit" onclick="editarCliente(${cliente.id})">
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

async function cadastrarCliente(event) {
    event.preventDefault();

    const cliente = {
        nome: document.getElementById("nome").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        cpf: document.getElementById("cpf").value,
        endereco: document.getElementById("endereco").value
    };

    try {
        const response = await fetch('/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cliente)
        });

        const result = await response.json();
        if (response.ok) {
            alert("Cliente cadastrado com sucesso!");
            document.getElementById("cliente-form").reset();
            listarClientes(); // Atualiza a lista automaticamente
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        console.error("Erro na solicitação:", err);
        alert("Erro ao cadastrar cliente.");
    }
}

// Função para pesquisar cliente por CPF
async function pesquisarPorCPF() {
    const cpf = document.getElementById('pesquisa-cpf').value.trim();

    if (!cpf) {
        alert('Por favor, digite um CPF para pesquisar.');
        return;
    }

    try {
        const response = await fetch(`/clientes?cpf=${encodeURIComponent(cpf)}`);

        if (response.status === 404) {
            document.getElementById('tabela-clientes').innerHTML = '<tr><td colspan="7">Nenhum cliente encontrado com este CPF.</td></tr>';
            return;
        }

        if (!response.ok) {
            throw new Error('Erro ao buscar cliente');
        }

        const clientes = await response.json();
        const tabela = document.getElementById('tabela-clientes');
        tabela.innerHTML = '';

        if (clientes.length === 0) {
            tabela.innerHTML = '<tr><td colspan="7">Nenhum cliente encontrado com este CPF.</td></tr>';
        } else {
            exibirClientes(clientes);
        }

    } catch (error) {
        console.error('Erro ao pesquisar cliente:', error);
        alert('Erro ao pesquisar cliente.');
    }
}

// Função para listar todos os clientes
async function listarClientes() {
    try {
        const response = await fetch('/clientes');
        const clientes = await response.json();

        const tabela = document.getElementById('tabela-clientes');
        tabela.innerHTML = '';

        if (clientes.length === 0) {
            tabela.innerHTML = '<tr><td colspan="7">Nenhum cliente cadastrado.</td></tr>';
        } else {
            exibirClientes(clientes);
        }
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        alert('Erro ao carregar lista de clientes.');
    }
}

// Função para abrir o modal de edição
function editarCliente(id) {
    const cliente = clientesExibidos.find(c => c.id === id);
    if (!cliente) return;
    clienteAtual = cliente;

    document.getElementById('edit-id').value = cliente.id;
    document.getElementById('edit-nome').value = cliente.nome;
    document.getElementById('edit-cpf').value = cliente.cpf;
    document.getElementById('edit-email').value = cliente.email || '';
    document.getElementById('edit-telefone').value = cliente.telefone || '';
    document.getElementById('edit-endereco').value = cliente.endereco || '';

    document.getElementById('editModal').style.display = 'block';
}

// Função para fechar o modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    clienteAtual = null;
}

// Função para salvar as edições
async function salvarEdicao() {
    if (!clienteAtual) return;

    const clienteAtualizado = {
        nome: document.getElementById('edit-nome').value,
        email: document.getElementById('edit-email').value,
        telefone: document.getElementById('edit-telefone').value,
        endereco: document.getElementById('edit-endereco').value
    };

    try {
        const response = await fetch(`/clientes/cpf/${clienteAtual.cpf}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteAtualizado)
        });

        if (response.ok) {
            alert('Cliente atualizado com sucesso!');
            closeEditModal();
            listarClientes(); // Atualiza a lista
        } else {
            const result = await response.json();
            alert('Erro ao atualizar cliente: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        alert('Erro ao atualizar cliente.');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Fechar sidebar quando clicar fora dela em mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    const modal = document.getElementById('editModal');

    if (window.innerWidth <= 768) {
        if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    }

    // Fechar modal clicando fora dele
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

// Permitir pesquisa ao pressionar Enter no campo de CPF
document.getElementById('pesquisa-cpf').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        pesquisarPorCPF();
    }
});