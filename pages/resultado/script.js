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

    // Helper para extrair o ano e a edição do SQL Server
    function parseSqlServerVersion(sqlVersionString) {
        const yearMatch = sqlVersionString.match(/SQL Server (\d{4})/);
        const editionMatch = sqlVersionString.match(/(Express|Standard|Enterprise|Web) Edition/i);
        const edition = editionMatch ? editionMatch[1] : 'Unknown';
        const year = yearMatch ? parseInt(yearMatch[1], 10) : 0; // 0 se não encontrar o ano
        return { year, edition };
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
            armazenamento: '140 GB', // Valor padrão para Micro
            observacoes: '' // Inicializa observações como string vazia
        };

        // Parse de valores numéricos, garantindo que sejam números
        const sqlMaiorBancoBaseMB = parseFloat(data.sqlMaiorBancoBaseMB) || 0;
        const mediaXMLmensal = parseFloat(data.mediaXMLmensal) || 0;
        const mediaXMLmensalVarejista = parseFloat(data.mediaXMLmensalVarejista) || 0;
        const qtdUsuarios = parseInt(data.qtdUsuarios) || 0;
        const totalRamGB = parseFloat(data.totalRamGB) || 0; // RAM do cliente em MB
        const cpuMultiCoreScore = parseFloat(data.cpuMultiCoreScore) || 0;
        const internetDownloadSpeedMbps = parseFloat(data.internetDownloadSpeedMbps) || 0;
        const diskReadSpeedMBps = parseFloat(data.diskReadSpeedMBps) || 0;
        const diskWriteSpeedMBps = parseFloat(data.diskWriteSpeedMBps) || 0;
        const connectionType = data.connectionType || '';
        const sqlVersionClient = data.sqlVersion || ''; // Versão do SQL do cliente (string completa)

        const { year: sqlClientYear, edition: sqlClientEdition } = parseSqlServerVersion(sqlVersionClient);


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


        // --- Determinação do Tipo de Servidor (com nova hierarquia: Micro -> NG Start -> IaaS Cloud) ---

        // 1. Tentar Micro (prioridade mais alta) - Qualquer uma das condições sendo verdadeira
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
        // 2. Tentar NG Start (se não for Micro) - TODAS as condições devem ser VERDADEIRAS
        // Nova regra: se Holos/People estiver selecionado, NÃO pode ser NG Start
        else if (data.holos !== 'Sim' && // Condição para impedir NG Start se Holos for 'Sim'
                 sqlMaiorBancoBaseMB <= FOUR_POINT_FIVE_GB_MB && // Banco <= 4.5GB E
                 (mediaXMLmensal === 0 || mediaXMLmensal <= 1000) && // XML Mensal baixo (0 ou <= 1000) E
                 (mediaXMLmensalVarejista === 0 || mediaXMLmensalVarejista <= 1000) && // XML Varejista baixo (0 ou <= 1000) E
                 qtdUsuarios <= 3) { // Usuários <= 3
            rec.tipoServidor = 'NG Start';
        }
        // 3. Tentar IaaS Cloud (se não for Micro nem NG Start) - QUALQUER UMA destas condições
        else if ((qtdUsuarios >= 4 && qtdUsuarios <= 6) || // Usuários entre 4 e 6 OU
                 (sqlMaiorBancoBaseMB > FOUR_POINT_FIVE_GB_MB && sqlMaiorBancoBaseMB < TEN_GB_MB) || // Banco entre 4.5GB e 10GB OU
                 (mediaXMLmensal > 1000 && mediaXMLmensal < 10000) || // XML Mensal entre 1000 e 10000 OU
                 (mediaXMLmensalVarejista > 1000 && mediaXMLmensalVarejista < 10000)) { // XML Varejista entre 1000 e 10000
            rec.tipoServidor = 'IaaS Cloud';
        } else {
            rec.tipoServidor = 'Não classificado';
            rec.observacoes += 'Não foi possível classificar o tipo de servidor com as regras fornecidas. ';
        }


        // --- Cálculos Condicionais ---
        let sqlMin = 0;
        let sqlRec = 0;
        let usuariosMin = 0;
        let usuariosRec = 0;
        let holosBotMin = 0; 
        let holosBotRec = 0; 
        const windowsMinVal = 4096; 
        const windowsRecVal = 4096; 

        // Definir armazenamento padrão de 2GB para não-Micro
        if (rec.tipoServidor !== 'Micro') {
            rec.armazenamento = '2 GB';
        }


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

        // --- Adicionar Observações ---
        // Observações gerais do ambiente (aplicáveis a todos os tipos de servidor)
        if (cpuMultiCoreScore > 1000000) {
            rec.observacoes += '\n- Cliente pode sentir perda de performance, pois seu processador atual possuí mais desempenho que o do cloud.';
        } else if (cpuMultiCoreScore < 1000000) {
            rec.observacoes += '\n- Cliente pode sentir ganho de performance, pois seu processador atual possuí menos desempenho que o do cloud.';
        }

        if (connectionType.toLowerCase() === 'wifi') {
            rec.observacoes += '\n- Cliente pode ter instabilidades no acesso por utilizar a conexão Wifi, indica-lo a usar sempre conexão cabeada.';
        }

        if (internetDownloadSpeedMbps < 15) {
            rec.observacoes += '\n- Cliente pode ter instabilidades no acesso por sua internet ser lenta.';
        }

        if (diskReadSpeedMBps < 5500 && diskWriteSpeedMBps < 2700) {
            rec.observacoes += '\n- Cliente pode sentir ganho de performance, pois seu disco atual é lento em comparação ao do cloud.';
        } else if (diskReadSpeedMBps > 5500 && diskWriteSpeedMBps > 2700) {
            rec.observacoes += '\n- Cliente pode sentir perda de performance, pois seu disco atual é rápido em comparação ao do cloud.';
        }

        if (data.ponto === 'Sim') {
            rec.observacoes += '\n- Importações de ponto do relógio serão feitas manualmente, pois com o sistema em nuvem não é possível coletar automaticamente.';
        }
        
        // Observações específicas por Tipo de Servidor
        if (rec.tipoServidor === 'NG Start') {
            if (totalRamGB > 8 * 1024) { // 8GB em MB
                rec.observacoes += '\n- Cliente pode sentir perda de performance, pois sua memoria atual possuí mais capacidade que o do cloud.';
            } else if (totalRamGB < 8 * 1024) {
                rec.observacoes += '\n- Cliente pode sentir ganho de performance, pois sua memoria atual possuí menos capacidade que o do cloud.';
            }
            if (sqlClientYear !== 0 && sqlClientYear < 2022) {
                rec.observacoes += '\n- Cliente pode sentir ganho de perfomance, pois seu SQL atual está desatualizado.';
            }
            // A regra "se SQL Server for outra versão diferente do express" para NG Start é um pouco ambígua
            // se o NG Start for para ambientes simples. Presumi que significa qualquer coisa não Express.
            if (sqlClientEdition.toLowerCase() !== 'express' && sqlClientEdition.toLowerCase() !== 'unknown') {
                rec.observacoes += '\n- Cliente pode sentir perda de perfomance, pois seu SQL atual é entrega mais desempenho.';
            }
            rec.observacoes += '\n- Micro servidor/aplicação: aplicar a clientes com muitos usuários (usar base de dados massiva). Verificar com o comercial o que é comercializado no momento da venda de novo usuário.';
            rec.observacoes += '\n- Holos/People: não é vendido para a plataforma Play, deve ser migrado para o ambiente compartilhado.';
            rec.observacoes += '\n- Clientes de ambiente compartilhado têm 2GB de espaço.';


        } else if (rec.tipoServidor === 'IaaS Cloud') {
            if (totalRamGB > 16 * 1024) { // 16GB em MB
                rec.observacoes += '\n- Cliente pode sentir perda de performance, pois sua memoria atual possuí mais capacidade que o do cloud.';
            } else if (totalRamGB < 16 * 1024) {
                rec.observacoes += '\n- Cliente pode sentir ganho de performance, pois sua memoria atual possuí menos capacidade que o do cloud.';
            }
            if (sqlClientEdition.toLowerCase() === 'express') {
                rec.observacoes += '\n- Cliente pode sentir ganho de perfomance, pois seu SQL atual entrega menos desempenho em relação ao cloud.';
            }

        } else if (rec.tipoServidor === 'Micro') {
            // Observações de Memória para Micro
            // sqlServerMinimo é uma string "XXXX MB", precisa extrair o número
            const sqlServerMinimoVal = parseFloat(rec.sqlServerMinimo.replace(' MB', '')) || 0;
            if (totalRamGB < sqlServerMinimoVal) {
                rec.observacoes += '\n- Cliente pode sentir ganho de performance, pois sua memoria atual possuí menos capacidade que o do cloud.';
            }
            
            // Observações de SQL Server para Micro
            if (recommendedSqlServerVersion === 'Express') {
                if (sqlClientYear !== 0 && sqlClientYear < 2022) {
                    rec.observacoes += '\n- Cliente pode sentir ganho de perfomance, pois seu SQL atual está desatualizado.';
                }
                if (sqlClientEdition.toLowerCase() !== 'express' && sqlClientEdition.toLowerCase() !== 'unknown') {
                    rec.observacoes += '\n- Cliente pode sentir perda de perfomance, pois seu SQL atual é entrega mais desempenho (pode ser ofertado o micro com SQL Web para ter mais desempenho).';
                }
            } else if (recommendedSqlServerVersion === 'Web') { // Micro com SQL Web
                if (sqlClientEdition.toLowerCase() === 'express') {
                    rec.observacoes += '\n- Cliente pode sentir ganho de perfomance, pois seu SQL atual entrega menos desempenho em relação ao cloud.';
                }
            }

            // Observações de Mapeamento Específicas de Micro
            if (data.certificado === 'A3') {
                rec.observacoes += '\n- Certificado Digital A3: Não são todos os certificados A3 que são compatíveis com o cloud, será necessário verificar o modelo.';
            }
            if (data.impressora === 'Sim') {
                rec.observacoes += '\n- Impressora Matricial: Não são todos os modelos de impressora matricial que são compatíveis com o cloud, será necessário verificar o modelo.';
            }
            if (data.vpn === 'Sim') {
                rec.observacoes += '\n- VPN: Verificar qual usuário utilizará a VPN (só é permitido 1 usuário na VPN).';
            }
            rec.observacoes += '\n- Micro servidor/aplicação: aplicar a clientes com muitos usuários (usar base de dados massiva). Verificar com o comercial o que é comercializado no momento da venda de novo usuário.';
        }

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

Observações: ${recommendations.observacoes || 'Nenhuma observação.'}
--------------------------------------------------
`;
        return report;
    }
});