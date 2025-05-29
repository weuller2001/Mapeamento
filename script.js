// script.js

document.addEventListener('DOMContentLoaded', function() {
    const resultsContent = document.getElementById('resultsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    let dataFound = false;
    let collectedData = null; // Armazenar os dados coletados globalmente no script

    // Função auxiliar para preencher um elemento com dados da URL
    function fillElement(id, value, suffix = '') {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
            element.textContent = value + suffix;
            dataFound = true;
        } else if (element) {
            element.textContent = 'N/A';
        }
    }

    // Função para gerar o texto do relatório
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

    // Início do script
    if (window.collectedData) {
        collectedData = window.collectedData; // Armazena os dados
        
        // Preenche os campos com os dados da variável `data`
        fillElement('clienteInfo', collectedData.clienteInfo);
        fillElement('empAtivas', collectedData.empAtivas);
        fillElement('empInativas', collectedData.empInativas);
        fillElement('empTotal', collectedData.empTotal);
        fillElement('funcionariosEmpresaMaior', collectedData.funcionariosEmpresaMaior);
        fillElement('funcionariosEmpresaTotal', collectedData.funcionariosEmpresaTotal);
        fillElement('mediaXMLmensal', collectedData.mediaXMLmensal);
        fillElement('sqlMaiorBancoBaseMB', collectedData.sqlMaiorBancoBaseMB, ' MB');
        fillElement('sqlTotalBancoBaseMB', collectedData.sqlTotalBancoBaseMB, ' MB');
        fillElement('windowsVersion', collectedData.windowsVersion);
        fillElement('sqlVersion', collectedData.sqlVersion);
        fillElement('processorName', collectedData.processorName);
        fillElement('coreCount', collectedData.coreCount);
        fillElement('totalRamGB', collectedData.totalRamGB, ' GB');
        fillElement('sqlRamMB', collectedData.sqlRamMB, ' MB');
        fillElement('connectionType', collectedData.connectionType);
        fillElement('diskReadSpeedMBps', collectedData.diskReadSpeedMBps, ' MB/s');
        fillElement('diskWriteSpeedMBps', collectedData.diskWriteSpeedMBps, ' MB/s');
        fillElement('diskType', collectedData.diskType);
        fillElement('diskTotalGB', collectedData.diskTotalGB, ' GB');
        fillElement('cpuMultiCoreScore', collectedData.cpuMultiCoreScore);
        fillElement('internetUploadSpeedMbps', collectedData.internetUploadSpeedMbps, ' Mbps');
        fillElement('internetDownloadSpeedMbps', collectedData.internetDownloadSpeedMbps, ' Mbps');

        if (dataFound) {
            loadingMessage.style.display = 'none';
            resultsContent.style.display = 'block';

            // Habilitar o botão de download após os dados serem carregados
            downloadReportBtn.addEventListener('click', () => {
                const reportText = generateReportText(collectedData);
                const blob = new Blob([reportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_diagnostico_${new Date().toISOString().slice(0,10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Libera o URL do objeto
            });

        } else {
            loadingMessage.textContent = "Dados recebidos, mas incompletos ou inválidos.";
        }

    } else {
        loadingMessage.textContent = "Nenhum dado de diagnóstico encontrado. Por favor, execute o agente para coletar as informações.";
    }

    // Opcional: Limpar a URL para não mostrar os dados na barra de endereços (sem recarregar a página)
    // history.replaceState({}, document.title, window.location.pathname);
});