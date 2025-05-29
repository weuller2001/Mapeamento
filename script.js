// script.js

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search); // Lê os parâmetros da URL
    const resultsContent = document.getElementById('resultsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    let dataFound = false; // Flag para verificar se pelo menos um dado foi preenchido

    // Função auxiliar para preencher um elemento com dados da URL
    // O valor já vem decodificado da URLSearchParams
    function fillElement(id, paramName, suffix = '') {
        const element = document.getElementById(id);
        const value = params.get(paramName); // Pega o valor do parâmetro da URL
        
        // Tratamento para números com vírgula como separador decimal (cultura brasileira)
        // C# .ToString("F2") com cultura pt-BR usa vírgula. JavaScript parseFloat espera ponto.
        // Se a aplicação web precisar dos números para cálculos, esta conversão é CRÍTICA.
        let displayValue = value;
        if (value && (id.includes('MB') || id.includes('GB') || id.includes('Mbps'))) {
            displayValue = value.replace(',', '.'); // Substitui vírgula por ponto para parseFloat
            // parseFloat(displayValue); // Se você precisar do valor como número, faça parseFloat aqui.
        }

        if (element && value !== null) { // value é null se o parâmetro não existir na URL
            element.textContent = displayValue + suffix;
            dataFound = true;
        } else if (element) {
            element.textContent = 'N/A'; // Define como "N/A" se o parâmetro não existir
        }
    }

    // --- Preenche os campos com os dados lidos da URL ---
    fillElement('clienteInfo', 'clienteInfo');
    fillElement('empAtivas', 'empAtivas');
    fillElement('empInativas', 'empInativas');
    fillElement('empTotal', 'empTotal'); // Corrigido para 'empTotal'
    fillElement('funcionariosEmpresaMaior', 'funcionariosEmpresaMaior');
    fillElement('funcionariosEmpresaTotal', 'funcionariosEmpresaTotal'); // Corrigido para 'funcionariosEmpresaTotal'
    fillElement('mediaXMLmensal', 'mediaXMLmensal');
    fillElement('sqlMaiorBancoBaseMB', 'sqlMaiorBancoBaseMB', ' MB');
    fillElement('sqlTotalBancoBaseMB', 'sqlTotalBancoBaseMB', ' MB');
    fillElement('windowsVersion', 'windowsVersion');
    fillElement('sqlVersion', 'sqlVersion');
    fillElement('processorName', 'processorName');
    fillElement('coreCount', 'coreCount');
    fillElement('totalRamGB', 'totalRamGB', ' GB');
    fillElement('sqlRamMB', 'sqlRamMB', ' MB');
    fillElement('connectionType', 'connectionType');
    fillElement('diskReadSpeedMBps', 'diskReadSpeedMBps', ' MB/s');
    fillElement('diskWriteSpeedMBps', 'diskWriteSpeedMBps', ' MB/s');
    fillElement('diskType', 'diskType');
    fillElement('diskTotalGB', 'diskTotalGB', ' GB');
    fillElement('cpuMultiCoreScore', 'cpuMultiCoreScore');
    fillElement('internetUploadSpeedMbps', 'internetUploadSpeedMbps', ' Mbps');
    fillElement('internetDownloadSpeedMbps', 'internetDownloadSpeedMbps', ' Mbps');

    // --- Lógica para mostrar/esconder mensagens e o botão de download ---
    if (dataFound) {
        loadingMessage.style.display = 'none';
        resultsContent.style.display = 'block';

        // Habilitar o botão de download após os dados serem carregados
        const downloadReportBtn = document.getElementById('downloadReportBtn');
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', () => {
                // Ao clicar, recria um objeto de dados a partir dos parâmetros da URL
                // para que a função generateReportText tenha o que precisa.
                const dataFromUrl = {};
                for (const [key, value] of params.entries()) {
                    // Decodifica %2c de volta para , e então para . para números
                    let processedValue = value;
                    if (key.includes('MB') || key.includes('GB') || key.includes('Mbps') || key.includes('cpuMultiCoreScore')) {
                         processedValue = value.replace(',', '.');
                    }
                    dataFromUrl[key] = processedValue;
                }
                const reportText = generateReportText(dataFromUrl);
                const blob = new Blob([reportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_diagnostico_${new Date().toISOString().slice(0,10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    } else {
        loadingMessage.textContent = "Nenhum dado válido encontrado na URL. Certifique-se de que o agente foi executado corretamente.";
        // Desabilitar o botão de download se não houver dados
        const downloadReportBtn = document.getElementById('downloadReportBtn');
        if (downloadReportBtn) {
            downloadReportBtn.style.display = 'none';
        }
    }

    // Opcional: Limpar a URL (comentado por padrão)
    // history.replaceState({}, document.title, window.location.pathname);

    // --- Função para gerar o texto do relatório (movida para o escopo principal para acessibilidade) ---
    function generateReportText(data) {
        let report = `--- Relatório de Diagnóstico de Sistema e SQL ---
Data da Coleta: ${new Date().toLocaleString()}

## Dados do Cliente e Empresas
Informações do Cliente: ${data.clienteInfo || 'N/A'}
Empresas Ativas: ${data.empAtivas || 'N/A'}
Empresas Inativas: ${data.empInativas || 'N/A'}
Total de Empresas: ${data.empTotal || 'N/A'}
Funcionários da Empresa com Mais Funcionários: ${data.funcionariosEmpresaMaior || 'N/A'}
Total de Funcionários da Base: ${data.funcionariosEmpresaTotal || 'N/A'}
Média XML Mensal: ${data.mediaXMLmensal || 'N/A'}
Maior Banco de Dados: ${data.sqlMaiorBancoBaseMB ? data.sqlMaiorBancoBaseMB + ' MB' : 'N/A'}
Tamanho Total da Base: ${data.sqlTotalBancoBaseMB ? data.sqlTotalBancoBaseMB + ' MB' : 'N/A'}

## Dados do Ambiente (SO, Hardware e SQL Server)
Versão do Windows: ${data.windowsVersion || 'N/A'}
Versão do SQL Server: ${data.sqlVersion || 'N/A'}
Nome do Processador: ${data.processorName || 'N/A'}
Número de Cores/Núcleos: ${data.coreCount || 'N/A'}
RAM Total: ${data.totalRamGB ? data.totalRamGB + ' GB' : 'N/A'}
RAM Alocada para SQL Server: ${data.sqlRamMB ? data.sqlRamMB + ' MB' : 'N/A'}
Tipo de Conexão: ${data.connectionType || 'N/A'}
Velocidade de Leitura de Disco: ${data.diskReadSpeedMBps ? data.diskReadSpeedMBps + ' MB/s' : 'N/A'}
Velocidade de Escrita de Disco: ${data.diskWriteSpeedMBps ? data.diskWriteSpeedMBps + ' MB/s' : 'N/A'}
Tipo de Disco: ${data.diskType || 'N/A'}
Tamanho Total do Disco: ${data.diskTotalGB ? data.diskTotalGB + ' GB' : 'N/A'}

## Resultados de Benchmarks
Pontuação CPU Multi-core: ${data.cpuMultiCoreScore || 'N/A'}
Velocidade de Upload: ${data.internetUploadSpeedMbps ? data.internetUploadSpeedMbps + ' Mbps' : 'N/A'}
Velocidade de Download: ${data.internetDownloadSpeedMbps ? data.internetDownloadSpeedMbps + ' Mbps' : 'N/A'}
--------------------------------------------------
`;
        return report;
    }
});