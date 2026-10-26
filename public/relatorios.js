// Escapa texto antes de inserir no HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

document.addEventListener('DOMContentLoaded', buscarRelatorio);

// Busca o relatório de vendas com os filtros preenchidos
async function buscarRelatorio() {
    const params = new URLSearchParams();
    ['cpf', 'produto', 'dataInicio', 'dataFim'].forEach(campo => {
        const valor = document.getElementById(campo).value.trim();
        if (valor) params.append(campo, valor);
    });

    const tabelaVendas = document.getElementById("tabela-vendas");

    try {
        const response = await fetch(`/relatorios?${params}`);
        if (!response.ok) throw new Error('Erro ao buscar relatórios');
        const vendas = await response.json();

        tabelaVendas.innerHTML = '';

        if (vendas.length === 0) {
            tabelaVendas.innerHTML = '<tr><td colspan="6">Nenhuma venda encontrada.</td></tr>';
            document.getElementById('total-relatorio').textContent = '';
            return;
        }

        let totalGeral = 0;
        vendas.forEach(venda => {
            totalGeral += venda.total;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${venda.id}</td>
                <td>${esc(venda.cliente_nome)}</td>
                <td>${esc(venda.produto_nome)}</td>
                <td>${venda.quantidade}</td>
                <td>${formatarMoeda(venda.total)}</td>
                <td>${new Date(venda.data).toLocaleString('pt-BR')}</td>
            `;
            tabelaVendas.appendChild(tr);
        });

        document.getElementById('total-relatorio').textContent =
            `${vendas.length} item(ns) vendido(s) — Total: ${formatarMoeda(totalGeral)}`;
    } catch (error) {
        console.error('Erro ao buscar relatórios:', error);
        tabelaVendas.innerHTML = '<tr><td colspan="6">Erro ao carregar relatório.</td></tr>';
    }
}
