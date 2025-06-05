// script.js

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search); // Lê os parâmetros da URL
    const resultsContent = document.getElementById('resultsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const processButton = document.getElementById('processButton');
    
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
    fillElement('sqlRamDisplay', 'sqlRamDisplay');
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
        if (processButton) {
            processButton.addEventListener('click', () => {
                // ANTES DE GERAR O RELATÓRIO, CHAME A FUNÇÃO DE VALIDAÇÃO
                if (!validateMappingParameters()) {
                    return; // Se a validação falhar, para a execução
                }

                // Coleta os dados dos campos de mapeamento preenchidos pelo usuário
                const mappingData = getMappingParameters();
                
                // Combina os dados da URL com os dados do mapeamento para o relatório final
                const finalReportData = { ...collectedDataForReport, ...mappingData };

                const reportText = generateReportText(finalReportData);
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
        if (processButton) {
            processButton.style.display = 'none';
        }
    }
    
    // Função para coletar os campos que o cliente Preenche
    function getMappingParameters() {
        const getRadioValue = (name) => {
            const selectedRadio = document.querySelector(`input[name="${name}"]:checked`);
            if (selectedRadio) {
                return selectedRadio.value || selectedRadio.id; 
            }
            return ''; // Retorna string vazia para indicar que não foi selecionado
        };

        const certificado = getRadioValue('certificado');
        const impressora = getRadioValue('impressora');
        const nfe = getRadioValue('nfe');
        const ponto = getRadioValue('ponto');
        const holos = getRadioValue('holos');
        const vpn = getRadioValue('vpn');

        // Para inputs de texto, .value.trim() está correto
        const qtdUsuarios = document.getElementById('qtdUsuarios')?.value.trim();
        const codChamado = document.getElementById('codChamado')?.value.trim();

        return {
            certificado,
            impressora,
            nfe,
            ponto,
            holos,
            vpn,
            qtdUsuarios,
            codChamado
        };
    }

    // --- Nova função para validar os campos do mapeamento ---
    function validateMappingParameters() {
        const mappingData = getMappingParameters();
        let missingFields = [];

        // Verifica radio buttons
        if (!mappingData.certificado) missingFields.push('Certificado Digital');
        if (!mappingData.impressora) missingFields.push('Impressora Matricial');
        if (!mappingData.nfe) missingFields.push('NFe Express');
        if (!mappingData.ponto) missingFields.push('NGPonto');
        if (!mappingData.holos) missingFields.push('Holos/People');
        if (!mappingData.vpn) missingFields.push('VPN');

        // Verifica campos de texto
        if (!mappingData.qtdUsuarios) missingFields.push('Quantidade de Usuários');
        if (!mappingData.codChamado) missingFields.push('Número do Chamado');

        if (missingFields.length > 0) {
            alert('Por favor, preencha os seguintes campos antes de prosseguir:\n\n- ' + missingFields.join('\n- '));
            return false; // Validação falhou
        }
        return true; // Validação bem-sucedida
    }

    // --- Adicionar event listeners para os campos de texto aceitarem apenas números ---
    const qtdUsuariosInput = document.getElementById('qtdUsuarios');
    const codChamadoInput = document.getElementById('codChamado');

    if (qtdUsuariosInput) {
        qtdUsuariosInput.addEventListener('input', function(event) {
            // Remove qualquer coisa que não seja dígito
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    if (codChamadoInput) {
        codChamadoInput.addEventListener('input', function(event) {
            // Remove qualquer coisa que não seja dígito
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // Opcional: Limpar a URL (comentado por padrão)
    // history.replaceState({}, document.title, window.location.pathname);

    // --- Função para gerar o texto do relatório ---
    function generateReportText(data) {
        let report = `--- Relatório de Diagnóstico de Sistema e SQL ---
Data da Coleta: ${new Date().toLocaleString()}

## Dados do Cliente e Empresas
Informações do Cliente: ${data.clienteInfo || 'N/A'}
Empresas Ativas: ${data.empAtivas || 'N/A'}
Empresas Inativas: ${data.empInativas || 'N/A'}
Total de Empresas: ${data.empTotal || 'N/A'}
Maior Quadro de Funcionários: ${data.funcionariosEmpresaMaior || 'N/A'}
Total de Funcionários da Base: ${data.funcionariosEmpresaTotal || 'N/A'}
Média XML Mensal: ${data.mediaXMLmensal || 'N/A'}
Média XML Mensal(Varejista): ${data.mediaXMLmensalVarejista || 'N/A'}
Maior Banco de Dados: ${data.sqlMaiorBancoBaseMB || 'N/A'} GB
Tamanho Total da Base: ${data.sqlTotalBancoBaseMB || 'N/A'} GB

## Dados do Ambiente (SO, Hardware e SQL Server)
Versão do Windows: ${data.windowsVersion || 'N/A'}
Versão do SQL Server: ${data.sqlVersion || 'N/A'}
Nome do Processador: ${data.processorName || 'N/A'}
Número de Cores/Núcleos: ${data.coreCount || 'N/A'}
RAM Total: ${data.totalRamGB || 'N/A'} GB
RAM Alocada para SQL Server: ${data.sqlRamDisplay || 'N/A'}
Tipo de Conexão: ${data.connectionType || 'N/A'}
Velocidade de Leitura de Disco: ${data.diskReadSpeedMBps || 'N/A'} MB/s
Velocidade de Escrita de Disco: ${data.diskWriteSpeedMBps || 'N/A'} MB/s
Tipo de Disco: ${data.diskType || 'N/A'}
Tamanho Total do Disco: ${data.diskTotalGB || 'N/A'} GB
Pontuação CPU Multi-core: ${data.cpuMultiCoreScore || 'N/A'}
Velocidade de Upload(Aproximado): ${data.internetUploadSpeedMbps || 'N/A'} Mbps
Velocidade de Download(Aproximado): ${data.internetDownloadSpeedMbps || 'N/A'} Mbps

## Parâmetros do Mapeamento
Possui Impressora Matricial: ${data.impressora || 'N/A'}
Possui NFe Express: ${data.nfe || 'N/A'}
Utiliza NGPonto: ${data.ponto || 'N/A'}
Utiliza Holos/People: ${data.holos || 'N/A'}
Precisa de VPN: ${data.vpn || 'N/A'}
Certificado Digital: ${data.certificado || 'N/A'}
Quantidade de Usuários para acesso: ${data.qtdUsuarios || 'N/A'}
Número do Chamado: ${data.codChamado || 'N/A'}
--------------------------------------------------
`;
        return report;
    }
});