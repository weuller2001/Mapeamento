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
                // Convertendo GB para MB para facilitar comparações numéricas
                if (id.includes('sqlMaiorBancoBaseMB') || id.includes('sqlTotalBancoBaseMB') || id.includes('totalRamGB') || id.includes('diskTotalGB')) {
                    displayValue = (parseFloat(value.replace(',', '.')) * 1024).toFixed(2); // Convertendo GB para MB
                } else {
                    displayValue = value.replace(',', '.'); 
                }
            }
            
            // Atribui o valor decodificado e tratado para o elemento na página
            const element = document.getElementById(id);
            if (element) {
                // Para exibição, se for GB, converte de volta ou adiciona o sufixo original
                if (id.includes('sqlMaiorBancoBaseMB') || id.includes('sqlTotalBancoBaseMB') || id.includes('totalRamGB') || id.includes('diskTotalGB')) {
                     element.textContent = (parseFloat(displayValue) / 1024).toFixed(2) + suffix; // Exibe em GB novamente
                } else {
                    element.textContent = displayValue + suffix;
                }
                dataFound = true;
                // Armazena o valor NUMÉRICO tratado para uso no relatório e cálculos
                collectedDataForReport[paramName] = parseFloat(displayValue);
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
    fillElement('sqlMaiorBancoBaseMB', 'sqlMaiorBancoBaseMB', ' GB'); // Agora armazena em MB, mas exibe em GB
    fillElement('sqlTotalBancoBaseMB', 'sqlTotalBancoBaseMB', ' ' + 'GB'); // Agora armazena em MB, mas exibe em GB
    fillElement('windowsVersion', 'windowsVersion');
    fillElement('sqlVersion', 'sqlVersion');
    fillElement('processorName', 'processorName');
    fillElement('coreCount', 'coreCount');
    fillElement('totalRamGB', 'totalRamGB', ' GB'); // Agora armazena em MB, mas exibe em GB
    fillElement('sqlRamDisplay', 'sqlRamDisplay');
    fillElement('connectionType', 'connectionType');
    fillElement('diskReadSpeedMBps', 'diskReadSpeedMBps', ' MB/s');
    fillElement('diskWriteSpeedMBps', 'diskWriteSpeedMBps', ' MB/s');
    fillElement('diskType', 'diskType');
    fillElement('diskTotalGB', 'diskTotalGB', ' GB'); // Agora armazena em MB, mas exibe em GB
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

                // Calcula as recomendações
                const recommendations = calculateRecommendations(finalReportData);

                const reportText = generateReportText(finalReportData, recommendations); // Passa as recomendações também
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
        const holos = getRadioValue('holos'); // Este é o campo que será usado para a lógica do "BOT"
        const vpn = getRadioValue('vpn');
        
        // Para inputs de texto, .value.trim() está correto
        const qtdUsuarios = parseInt(document.getElementById('qtdUsuarios')?.value.trim()) || 0; // Converte para número inteiro, 0 se vazio
        const codChamado = document.getElementById('codChamado')?.value.trim();

        return {
            certificado,
            impressora,
            nfe,
            ponto,
            holos, // Manter como 'holos'
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
        // Note: qtdUsuarios já é 0 se estiver vazio, então a validação aqui é se é > 0
        if (mappingData.qtdUsuarios === 0) missingFields.push('Quantidade de Usuários');
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

    // --- Nova função para calcular as recomendações ---
    function calculateRecommendations(data) {
        const rec = {
            tipoServidor: 'N/A',
            vCPUMinimo: 'N/A',
            vCPURecomendado: 'N/A',
            sqlServerMinimo: 'N/A',
            sqlServerRecomendado: 'N/A',
            windowsMinimo: '4096 MB', 
            windowsRecomendado: '4096 MB', 
            usuariosMinimo: 'N/A',
            usuariosRecomendado: 'N/A',
            botMinimo: 'N/A', 
            botRecomendado: 'N/A', 
            memoriaRamTotalMinimo: 'N/A',
            memoriaRamTotalRecomendado: 'N/A',
            sqlServerVersionMinimo: 'N/A',
            sqlServerVersionRecomendado: 'N/A',
            armazenamento: '140 GB', 
            observacoes: ''
        };

        // Parse de valores numéricos, garantindo que sejam números
        const sqlMaiorBancoBaseMB = parseFloat(data.sqlMaiorBancoBaseMB) || 0;
        const mediaXMLmensal = parseFloat(data.mediaXMLmensal) || 0;
        const mediaXMLmensalVarejista = parseFloat(data.mediaXMLmensalVarejista) || 0;
        const qtdUsuarios = parseInt(data.qtdUsuarios) || 0;

        // Limites em MB para comparações
        const TEN_GB_MB = 10 * 1024; // 10 GB em MB = 10240 MB
        const FOUR_POINT_FIVE_GB_MB = 4.5 * 1024; // 4.5 GB em MB = 4608 MB
        const SEVEN_POINT_ONE_SIX_EIGHT_GB_MB = 7.168 * 1024; // 7168 MB = 7.00 GB

        // Determine a versão recomendada do SQL Server primeiro, pois afeta o cálculo da RAM do SQL.
        let recommendedSqlServerVersion = 'Express'; // Default
        if (sqlMaiorBancoBaseMB > SEVEN_POINT_ONE_SIX_EIGHT_GB_MB) { 
            recommendedSqlServerVersion = 'Web';
        }
        rec.sqlServerVersionMinimo = recommendedSqlServerVersion;
        rec.sqlServerVersionRecomendado = recommendedSqlServerVersion;


        // --- Determinação do Tipo de Servidor (com nova hierarquia: Micro -> IaaS Cloud -> NG Start) ---

        // 1. Tentar Micro (prioridade mais alta)
        if (sqlMaiorBancoBaseMB > TEN_GB_MB || 
            mediaXMLmensal > 10000 || 
            mediaXMLmensalVarejista > 10000 || 
            qtdUsuarios >= 7 || 
            data.impressora === 'Sim' || 
            data.nfe === 'Sim' || 
            data.ponto === 'Sim' || 
            data.vpn === 'Sim' || 
            data.certificado === 'A3') { 
            rec.tipoServidor = 'Micro';
        }
        // 2. Tentar IaaS Cloud (se não for Micro)
        else if (sqlMaiorBancoBaseMB >= TEN_GB_MB || 
                 mediaXMLmensal >= 10000 || 
                 mediaXMLmensalVarejista >= 10000 || 
                 qtdUsuarios <= 6) { 
            rec.tipoServidor = 'IaaS Cloud';
        }
        // 3. Tentar NG Start (se não for Micro nem IaaS Cloud)
        else if (sqlMaiorBancoBaseMB <= FOUR_POINT_FIVE_GB_MB || 
                 mediaXMLmensal >= 1000 || 
                 mediaXMLmensalVarejista <= 1000 || 
                 qtdUsuarios <= 3) { 
            rec.tipoServidor = 'NG Start';
        } else {
            rec.tipoServidor = 'Não classificado';
            rec.observacoes += 'Não foi possível classificar o tipo de servidor com as regras fornecidas. ';
        }


        // --- Cálculos Condicionais para Tipo de Servidor "Micro" ---
        let sqlMin = 0;
        let sqlRec = 0;
        let usuariosMin = 0;
        let usuariosRec = 0;
        let holosBotMin = 0; 
        let holosBotRec = 0; 
        const windowsMinVal = 4096; 
        const windowsRecVal = 4096; 


        if (rec.tipoServidor === 'Micro') {
            rec.vCPUMinimo = Math.ceil(qtdUsuarios / 3.5); 
            rec.vCPURecomendado = Math.ceil(qtdUsuarios / 2.5);

            // Lógica de cálculo de SQL Server RAM baseada na versão e qtdUsuarios
            if (recommendedSqlServerVersion === 'Express') {
                sqlMin = 3072; // 3GB para Express
                sqlRec = 3072;
            } else { // Versão é 'Web'
                if (qtdUsuarios > 6) {
                    sqlMin = 3584 + ((qtdUsuarios - 6) * 384);
                    sqlRec = 3584 + ((qtdUsuarios - 6) * 768);
                } else {
                    sqlMin = 3584;
                    sqlRec = 3584;
                }
            }
            rec.sqlServerMinimo = `${sqlMin} MB`;
            rec.sqlServerRecomendado = `${sqlRec} MB`;


            usuariosMin = qtdUsuarios * 640;
            usuariosRec = qtdUsuarios * 1024;
            rec.usuariosMinimo = `${usuariosMin} MB`;
            rec.usuariosRecomendado = `${usuariosRec} MB`;

            // Lógica para "BOT" baseada em Holos/People
            if (data.holos === 'Sim') { 
                holosBotMin = 2048;
                holosBotRec = 2048;
                rec.botMinimo = `${holosBotMin} MB`;
                rec.botRecomendado = `${holosBotRec} MB`;
            } else {
                rec.botMinimo = null; 
                rec.botRecomendado = null;
            }

            // Memória RAM Total (usando os valores numéricos)
            const currentHolosBotMin = (data.holos === 'Sim' ? holosBotMin : 0);
            const currentHolosBotRec = (data.holos === 'Sim' ? holosBotRec : 0);

            rec.memoriaRamTotalMinimo = `${sqlMin + windowsMinVal + usuariosMin + currentHolosBotMin} MB`;
            rec.memoriaRamTotalRecomendado = `${sqlRec + windowsRecVal + usuariosRec + currentHolosBotRec} MB`;

        } else if (rec.tipoServidor === 'IaaS Cloud' || rec.tipoServidor === 'NG Start') {
            // Para IaaS Cloud e NG Start, vamos definir os valores de RAM e vCPU como 'N/A'
            // já que você só pediu cálculos específicos para 'Micro'.
            rec.vCPUMinimo = 'N/A';
            rec.vCPURecomendado = 'N/A';
            rec.sqlServerMinimo = 'N/A';
            rec.sqlServerRecomendado = 'N/A';
            rec.usuariosMinimo = 'N/A';
            rec.usuariosRecomendado = 'N/A';
            rec.botMinimo = null; 
            rec.botRecomendado = null; 
            rec.memoriaRamTotalMinimo = 'N/A';
            rec.memoriaRamTotalRecomendado = 'N/A';
            rec.windowsMinimo = 'N/A'; 
            rec.windowsRecomendado = 'N/A'; 
        }
        // Se for "Não classificado", os valores já estão como 'N/A' (ou null para BOT) no início do rec,
        // então não precisamos de um 'else' adicional aqui.

        return rec;
    }

    // Opcional: Limpar a URL (comentado por padrão)
    // history.replaceState({}, document.title, window.location.pathname);

    // --- Função para gerar o texto do relatório ---
    function generateReportText(data, recommendations) {
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
Maior Banco de Dados: ${(data.sqlMaiorBancoBaseMB / 1024).toFixed(2) || 'N/A'} GB
Tamanho Total da Base: ${(data.sqlTotalBancoBaseMB / 1024).toFixed(2) || 'N/A'} GB

## Dados do Ambiente (SO, Hardware e SQL Server)
Versão do Windows: ${data.windowsVersion || 'N/A'}
Versão do SQL Server: ${data.sqlVersion || 'N/A'}
Nome do Processador: ${data.processorName || 'N/A'}
Número de Cores/Núcleos: ${data.coreCount || 'N/A'}
RAM Total: ${(data.totalRamGB / 1024).toFixed(2) || 'N/A'} GB
RAM Alocada para SQL Server: ${data.sqlRamDisplay || 'N/A'}
Tipo de Conexão: ${data.connectionType || 'N/A'}
Velocidade de Leitura de Disco: ${data.diskReadSpeedMBps || 'N/A'} MB/s
Velocidade de Escrita de Disco: ${data.diskWriteSpeedMBps || 'N/A'} MB/s
Tipo de Disco: ${data.diskType || 'N/A'}
Tamanho Total do Disco: ${(data.diskTotalGB / 1024).toFixed(2) || 'N/A'} GB
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


## Resultado do mapeamento

### Ambiente Minimo:
Tipo de Servidor: ${recommendations.tipoServidor}
Quantidade de vCPU: ${recommendations.vCPUMinimo}
Distribuição da RAM:
  SQL Server: ${recommendations.sqlServerMinimo}
  Windows: ${recommendations.windowsMinimo}
  Usuários: ${recommendations.usuariosMinimo}
${recommendations.botMinimo !== null ? `  BOT (Holos/People): ${recommendations.botMinimo}` : ''}
Memória RAM Total: ${recommendations.memoriaRamTotalMinimo}
Versão do SQL Server: ${recommendations.sqlServerVersionMinimo}
Armazenamento: ${recommendations.armazenamento}

### Ambiente Recomendado:
Tipo de Servidor: ${recommendations.tipoServidor}
Quantidade de vCPU: ${recommendations.vCPURecomendado}
Distribuição da RAM:
  SQL Server: ${recommendations.sqlServerRecomendado}
  Windows: ${recommendations.windowsRecomendado}
  Usuários: ${recommendations.usuariosRecomendado}
${recommendations.botRecomendado !== null ? `  BOT (Holos/People): ${recommendations.botRecomendado}` : ''}
Memória RAM Total: ${recommendations.memoriaRamTotalRecomendado}
Versão do SQL Server: ${recommendations.sqlServerVersionRecomendado}
Armazenamento: ${recommendations.armazenamento}

Observações: ${recommendations.observacoes || 'Nenhuma.'}
--------------------------------------------------
`;
        return report;
    }
});