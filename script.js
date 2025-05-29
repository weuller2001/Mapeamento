// script.js

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search); // Lê os parâmetros da URL
    const resultsContent = document.getElementById('resultsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    let dataFound = false;
    let collectedDataForReport = {}; // Armazenar os dados decodificados para o relatório

    // Função auxiliar para preencher um elemento com dados da URL
    function fillElement(id, paramName, suffix = '') {
        let value = params.get(paramName); // Pega o valor do parâmetro da URL
        
        if (value !== null) { // Se o parâmetro existe na URL
            // PASSO CRUCIAL:
            // 1. Substituir '+' por espaço (alguns navegadores fazem isso, outros não para URLSearchParams.get())
            // 2. Decodificar quaisquer caracteres percent-encoded (%XX) como %c3%87 ou %40
            value = decodeURIComponent(value.replace(/\+/g, ' '));
            
            // Tratamento para números com vírgula como separador decimal (cultura brasileira)
            let displayValue = value;
            if (id.includes('MB') || id.includes('GB') || id.includes('Mbps') || id.includes('cpuMultiCoreScore')) {
                // Esta substituição é para exibição e para que parseFloat funcione se necessário
                displayValue = value.replace(',', '.'); 
            }
            
            // Atribui o valor decodificado e tratado para o elemento na página
            const element = document.getElementById(id);
            if (element) {
                element.textContent = displayValue + suffix;
                dataFound = true;
                // Armazena o valor decodificado e formatado para uso no relatório
                collectedDataForReport[paramName] = displayValue;
            }
        } else { // Se o parâmetro não existe na URL
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'N/A';
                collectedDataForReport[paramName] = 'N/A'; // Para garantir que apareça no relatório
            }
        }
    }

    // --- Preenche os campos com os dados lidos da URL ---
    fillElement('clienteInfo', 'clienteInfo');
    fillElement('empAtivas', 'empAtivas');
    fillElement('empInativas', 'empInativas');
    fillElement('empTotal', 'empTotal');
    fillElement('funcionariosEmpresaMaior', 'funcionariosEmpresaMaior');
    fillElement('funcionariosEmpresaTotal', 'funcionariosEmpresaTotal');
    fillElement('mediaXMLmensal', 'mediaXMLmensal');
	fillElement('mediaXMLmensalVarejista', 'mediaXMLmensalVarejista');
    fillElement('sqlMaiorBancoBaseMB', 'sqlMaiorBancoBaseMB', ' GB');
    fillElement('sqlTotalBancoBaseMB', 'sqlTotalBancoBaseMB', ' GB');
    fillElement('windowsVersion', 'windowsVersion');
    fillElement('sqlVersion', 'sqlVersion');
    fillElement('processorName', 'processorName');
    fillElement('coreCount', 'coreCount');
    fillElement('totalRamGB', 'totalRamGB', ' GB');
    fillElement('sqlRamMB', 'sqlRamDisplay');
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
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', () => {
                // A função generateReportText agora usa collectedDataForReport
                const reportText = generateReportText(collectedDataForReport);
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
        if (downloadReportBtn) {
            downloadReportBtn.style.display = 'none';
        }
    }

    // Opcional: Limpar a URL (comentado por padrão)
    // history.replaceState({}, document.title, window.location.pathname);

    // --- Função para gerar o texto do relatório ---
    // (Esta função é a mesma da versão anterior, pois `collectedDataForReport` já está tratado)
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
Maior Banco de Dados: ${data.sqlMaiorBancoBaseMB || 'N/A'} MB
Tamanho Total da Base: ${data.sqlTotalBancoBaseMB || 'N/A'} MB

## Dados do Ambiente (SO, Hardware e SQL Server)
Versão do Windows: ${data.windowsVersion || 'N/A'}
Versão do SQL Server: ${data.sqlVersion || 'N/A'}
Nome do Processador: ${data.processorName || 'N/A'}
Número de Cores/Núcleos: ${data.coreCount || 'N/A'}
RAM Total: ${data.totalRamGB || 'N/A'} GB
RAM Alocada para SQL Server: ${data.sqlRamMB || 'N/A'} MB
Tipo de Conexão: ${data.connectionType || 'N/A'}
Velocidade de Leitura de Disco: ${data.diskReadSpeedMBps || 'N/A'} MB/s
Velocidade de Escrita de Disco: ${data.diskWriteSpeedMBps || 'N/A'} MB/s
Tipo de Disco: ${data.diskType || 'N/A'}
Tamanho Total do Disco: ${data.diskTotalGB || 'N/A'} GB

## Resultados de Benchmarks
Pontuação CPU Multi-core: ${data.cpuMultiCoreScore || 'N/A'}
Velocidade de Upload: ${data.internetUploadSpeedMbps || 'N/A'} Mbps
Velocidade de Download: ${data.internetDownloadSpeedMbps || 'N/A'} Mbps
--------------------------------------------------
`;
        return report;
    }
});