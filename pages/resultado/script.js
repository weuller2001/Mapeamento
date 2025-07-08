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
            // 1. Substituir '+' por espaço
            // 2. Decodificar quaisquer caracteres percent-encoded (%XX)
            value = decodeURIComponent(value.replace(/\+/g, ' '));
            
            let displayValue = value;
            let storedValue = value; // Default: armazenar como string original

            // Tratar apenas campos numéricos para conversão e armazenamento como número
            if (['sqlMaiorBancoBaseMB', 'sqlTotalBancoBaseMB', 'totalRamGB', 'diskTotalGB'].includes(paramName)) {
                // Convertendo GB para MB para facilitar comparações numéricas
                storedValue = (parseFloat(value.replace(',', '.')) * 1024);
                displayValue = (storedValue / 1024).toFixed(2); // Para exibição em GB novamente
            } else if (['diskReadSpeedMBps', 'diskWriteSpeedMBps', 'cpuMultiCoreScore', 'internetUploadSpeedMbps', 'internetDownloadSpeedMbps'].includes(paramName)) {
                storedValue = parseFloat(value.replace(',', '.'));
            }
            // Para outros campos (texto), storedValue permanece como a string original 'value'

            // Atribui o valor para o elemento na página
            const element = document.getElementById(id);
            if (element) {
                element.textContent = displayValue + suffix;
                dataFound = true;
                // Armazena o valor tratado (numérico ou string) para uso no relatório e cálculos
                collectedDataForReport[paramName] = storedValue;
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
            sqlServerVersionMinimo: 'N/A', // Será definido abaixo
            sqlServerVersionRecomendado: 'N/A', // Será definido abaixo
            armazenamento: '140 GB', // Valor padrão para Dedicado
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

        // Determine a versão recomendada do SQL Server com base no tamanho do banco
        // Esta é a versão *potencial* para qualquer ambiente, antes de ajustar por tipo
        let baseRecommendedSqlServerVersion = 'Express'; 
        if (sqlMaiorBancoBaseMB > SEVEN_POINT_ONE_SIX_EIGHT_GB_MB) { 
            baseRecommendedSqlServerVersion = 'Web';
        }


        // --- Determinação do Tipo de Servidor (com nova hierarquia: Dedicado -> Basico -> Comum) ---

        // 1. Tentar Dedicado (prioridade mais alta) - Qualquer uma das condições sendo verdadeira
        if (sqlMaiorBancoBaseMB > TEN_GB_MB || 
            mediaXMLmensal > 10000 || 
            mediaXMLmensalVarejista > 10000 || 
            qtdUsuarios >= 7 || 
            data.impressora === 'Sim' || 
            data.nfe === 'Sim' || 
            data.vpn === 'Sim' || 
            data.certificado === 'A3') { 
            rec.tipoServidor = 'Dedicado';
            rec.sqlServerVersionMinimo = baseRecommendedSqlServerVersion; // Usa a base recomendada
            rec.sqlServerVersionRecomendado = baseRecommendedSqlServerVersion;
        }
        // 2. Tentar Basico (se não for Dedicado) - TODAS as condições devem ser VERDADEIRAS
        // Nova regra: se Holos/People estiver selecionado, NÃO pode ser Basico
        else if (data.holos !== 'Sim' && // Condição para impedir Basico se Holos for 'Sim'
					sqlMaiorBancoBaseMB <= FOUR_POINT_FIVE_GB_MB && // Banco <= 4.5GB E
                     (mediaXMLmensal === 0 || mediaXMLmensal <= 1000) && // XML Mensal baixo (0 ou <= 1000) E
                     (mediaXMLmensalVarejista === 0 || mediaXMLmensalVarejista <= 1000) && // XML Varejista baixo (0 ou <= 1000) E
                     qtdUsuarios <= 3) { // Usuários <= 3
            rec.tipoServidor = 'Basico';
            rec.sqlServerVersionMinimo = 'Express'; // Basico sempre Express
            rec.sqlServerVersionRecomendado = 'Express';
        }
        // 3. Tentar Comum (se não for Dedicado nem Basico) - QUALQUER UMA destas condições
        else if ((qtdUsuarios >= 4 && qtdUsuarios <= 6) || // Usuários entre 4 e 6 OU
					(sqlMaiorBancoBaseMB > FOUR_POINT_FIVE_GB_MB && sqlMaiorBancoBaseMB < TEN_GB_MB) || // Banco entre 4.5GB e 10GB OU
                    (mediaXMLmensal > 1000 && mediaXMLmensal < 10000) || // XML Mensal entre 1000 e 10000 OU
                    (mediaXMLmensalVarejista > 1000 && mediaXMLmensalVarejista < 10000)) { // XML Varejista entre 1000 e 10000
            rec.tipoServidor = 'Comum';
            rec.sqlServerVersionMinimo = 'Web'; // Comum sempre Web
            rec.sqlServerVersionRecomendado = 'Web';
        } else {
            rec.tipoServidor = 'Não classificado';
            rec.observacoes += 'Não foi possível classificar o tipo de servidor com as regras fornecidas.';
            rec.sqlServerVersionMinimo = 'N/A'; // Se não classificado, SQL também é N/A
            rec.sqlServerVersionRecomendado = 'N/A';
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

        // Definir armazenamento padrão de 2GB para não-Dedicado
        if (rec.tipoServidor !== 'Dedicado') {
            rec.armazenamento = '2 GB';
        }


        if (rec.tipoServidor === 'Dedicado') {
            rec.vCPUMinimo = Math.ceil(qtdUsuarios / 2); 
            rec.vCPURecomendado = Math.ceil(qtdUsuarios / 1.5);

            // Lógica de cálculo de SQL Server RAM baseada na versão e qtdUsuarios
            if (rec.sqlServerVersionRecomendado === 'Express') { // Usa a versão já definida para o tipo
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

        } else if (rec.tipoServidor === 'Comum' || rec.tipoServidor === 'Basico') {
            // Para Comum e Basico, vamos definir os valores de RAM e vCPU como 'N/A'
            // já que você só pediu cálculos específicos para 'Dedicado'.
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

        // Ponto deve adicionar observação independente da classificação para Dedicado
        if (data.ponto === 'Sim') {
            rec.observacoes += '\n- NGPonto: Importações de ponto do relógio serão feitas manualmente, pois com o sistema em nuvem não é possível coletar automaticamente.';
        }
        
        // Observações específicas por Tipo de Servidor
        if (rec.tipoServidor === 'Basico') {
            if (totalRamGB > 8 * 1024) { // 8GB em MB
                rec.observacoes += '\n- Memória: Cliente pode sentir perda de performance, pois sua memória atual possuí mais capacidade que a do cloud.';
            } else if (totalRamGB < 8 * 1024) {
                rec.observacoes += '\n- Memória: Cliente pode sentir ganho de performance, pois sua memória atual possuí menos capacidade que a do cloud.';
            }
            if (sqlClientYear !== 0 && sqlClientYear < 2022) {
                rec.observacoes += '\n- SQL Server: Cliente pode sentir ganho de performance, pois seu SQL atual está desatualizado.';
            }
            if (sqlClientEdition.toLowerCase() !== 'express' && sqlClientEdition.toLowerCase() !== 'unknown') {
                rec.observacoes += '\n- SQL Server: Cliente pode sentir perda de perfomance, pois seu SQL atual é entrega mais desempenho.';
            }


        } else if (rec.tipoServidor === 'Comum') {
            if (totalRamGB > 16 * 1024) { // 16GB em MB
                rec.observacoes += '\n- Memória: Cliente pode sentir perda de performance, pois sua memória atual possuí mais capacidade que a do cloud.';
            } else if (totalRamGB < 16 * 1024) {
                rec.observacoes += '\n- Memória: Cliente pode sentir ganho de performance, pois sua memória atual possuí menos capacidade que a do cloud.';
            }
            // Nova regra: Comum sempre usa SQL Web. Comentário se cliente usa Express
            if (sqlClientEdition.toLowerCase() === 'express') {
                rec.observacoes += '\n- SQL Server: Cliente pode sentir ganho de perfomance, pois seu SQL atual entrega menos desempenho em relação ao cloud.';
            }


        } else if (rec.tipoServidor === 'Dedicado') {
            // Observações de Memória para Dedicado
            const sqlServerMinimoVal = parseFloat(rec.sqlServerMinimo.replace(' MB', '')) || 0;
            if (totalRamGB < sqlServerMinimoVal) {
                rec.observacoes += '\n- Memória: Cliente pode sentir ganho de performance, pois sua memória atual possuí menos capacidade que a do cloud (Mínimo para operação do ambiente).';
            }
            
            // Observações de SQL Server para Dedicado
            if (rec.sqlServerVersionRecomendado === 'Express') { // Usa a versão definida para Dedicado
                if (sqlClientYear !== 0 && sqlClientYear < 2022) {
                    rec.observacoes += '\n- SQL Server: Cliente pode sentir ganho de perfomance, pois seu SQL atual está desatualizado.';
                }
                if (sqlClientEdition.toLowerCase() !== 'express' && sqlClientEdition.toLowerCase() !== 'unknown') { // se for Standard, Enterprise, etc.
                    rec.observacoes += '\n- SQL Server: Cliente pode sentir perda de perfomance, pois seu SQL atual é entrega mais desempenho (pode ser ofertado o Dedicado com SQL Web para ter mais desempenho).';
                }
            } else if (rec.sqlServerVersionRecomendado === 'Web') { // Dedicado com SQL Web
                if (sqlClientEdition.toLowerCase() === 'express') {
                    rec.observacoes += '\n- SQL Server: Cliente pode sentir ganho de perfomance, pois seu SQL atual entrega menos desempenho em relação ao cloud.';
                }
            }

            // Observações de Mapeamento Específicas de Dedicado
            if (data.certificado === 'A3') {
                rec.observacoes += '\n- Certificado Digital A3: Não são todos os certificados A3 que são compatíveis com o cloud, será necessário verificar o modelo.';
            }
            if (data.impressora === 'Sim') {
                rec.observacoes += '\n- Impressora Matricial: Não são todos os modelos de impressora matricial que são compatíveis com o cloud, será necessário verificar o modelo.';
            }
            if (data.vpn === 'Sim') {
                rec.observacoes += '\n- VPN: Verificar qual usuário utilizará a VPN (só é permitido 1 usuário na VPN).';
            }
        }

        // Limpa a string de observações se ela começar com '\n-' ou tiver múltiplos '\n' no início
        rec.observacoes = rec.observacoes.trim();
        if (rec.observacoes.startsWith('\n-')) {
            rec.observacoes = rec.observacoes.substring(1).trim();
        }
        rec.observacoes = rec.observacoes.replace(/\n\n+/g, '\n').trim(); // Remover múltiplas quebras de linha

        return rec;
    }

    // Opcional: Limpar a URL (comentado por padrão)
    // history.replaceState({}, document.title, window.location.pathname);

    // --- Função para gerar o texto do relatório ---
    function generateReportText(data, recommendations) {
        // Helper para verificar se um valor é "N/A" ou nulo/vazio
        const isNA = (value) => {
            return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim().toLowerCase() === 'n/a');
        };

        // Função para construir uma linha condicionalmente
        const buildLine = (label, value, suffix = '') => {
            if (!isNA(value)) {
                return `${label}: ${value}${suffix}`; // Removido o '\n' para que o filter final cuide da quebra de linha
            }
            return '';
        };

        // Função para construir a seção de Distribuição da RAM condicionalmente
        const buildRamDistribution = (sql, win, user, bot, type) => {
            let lines = [];
            let sqlLine = buildLine('  SQL Server', sql);
            let winLine = buildLine('  Windows', win);
            let userLine = buildLine('  Usuários', user);
            let botLine = (recommendations[type === 'Minimo' ? 'botMinimo' : 'botRecomendado'] !== null) ? `  BOT (Holos/People): ${bot}` : '';

            if (sqlLine) lines.push(sqlLine);
            if (winLine) lines.push(winLine);
            if (userLine) lines.push(userLine);
            if (botLine) lines.push(botLine);

            if (lines.length > 0) {
                return `Distribuição da RAM:\n${lines.join('\n')}`; // Adiciona quebra de linha entre as sub-linhas
            }
            return '';
        };


        let reportParts = []; // Array para armazenar as partes do relatório
        reportParts.push(`--- Relatório de Diagnóstico de Sistema e SQL ---
Data da Coleta: ${new Date().toLocaleString()}`);

        // ## Dados do Cliente e Empresas
        let clientDataLines = [
            buildLine('Informações do Cliente', data.clienteInfo),
            buildLine('Empresas Ativas', data.empAtivas),
            buildLine('Empresas Inativas', data.empInativas),
            buildLine('Total de Empresas', data.empTotal),
            buildLine('Maior Quadro de Funcionários', data.funcionariosEmpresaMaior),
            buildLine('Total de Funcionários da Base', data.funcionariosEmpresaTotal),
            buildLine('Média XML Mensal', data.mediaXMLmensal),
            buildLine('Média XML Mensal(Varejista)', data.mediaXMLmensalVarejista),
            buildLine('Maior Banco de Dados', (data.sqlMaiorBancoBaseMB / 1024).toFixed(2), ' GB'),
            buildLine('Tamanho Total da Base', (data.sqlTotalBancoBaseMB / 1024).toFixed(2), ' GB')
        ].filter(line => line !== '');
        if (clientDataLines.length > 0) {
            reportParts.push(`## Dados do Cliente e Empresas\n${clientDataLines.join('\n')}`);
        }

        // ## Dados do Ambiente (SO, Hardware e SQL Server)
        let envDataLines = [
            buildLine('Versão do Windows', data.windowsVersion),
            buildLine('Versão do SQL Server', data.sqlVersion),
            buildLine('Nome do Processador', data.processorName),
            buildLine('Número de Cores/Núcleos', data.coreCount),
            buildLine('RAM Total', (data.totalRamGB / 1024).toFixed(2), ' GB'),
            buildLine('RAM Alocada para SQL Server', data.sqlRamDisplay),
            buildLine('Tipo de Conexão', data.connectionType),
            buildLine('Velocidade de Leitura de Disco', data.diskReadSpeedMBps, ' MB/s'),
            buildLine('Velocidade de Escrita de Disco', data.diskWriteSpeedMBps, ' MB/s'),
            buildLine('Tipo de Disco', data.diskType),
            buildLine('Tamanho Total do Disco', (data.diskTotalGB / 1024).toFixed(2), ' GB'),
            buildLine('Pontuação CPU Multi-core', data.cpuMultiCoreScore),
            buildLine('Velocidade de Upload(Aproximado)', data.internetUploadSpeedMbps, ' Mbps'),
            buildLine('Velocidade de Download(Aproximado)', data.internetDownloadSpeedMbps, ' Mbps')
        ].filter(line => line !== '');
        if (envDataLines.length > 0) {
            reportParts.push(`---
## Dados do Ambiente (SO, Hardware e SQL Server)\n${envDataLines.join('\n')}`);
        }

        // ## Parâmetros do Mapeamento
        let mappingDataLines = [
            buildLine('Possui Impressora Matricial', data.impressora),
            buildLine('Possui NFe Express', data.nfe),
            buildLine('Utiliza NGPonto', data.ponto),
            buildLine('Utiliza Holos/People', data.holos),
            buildLine('Precisa de VPN', data.vpn),
            buildLine('Certificado Digital', data.certificado),
            buildLine('Quantidade de Usuários para acesso', data.qtdUsuarios),
            buildLine('Número do Chamado', data.codChamado)
        ].filter(line => line !== '');
        if (mappingDataLines.length > 0) {
            reportParts.push(`---
## Parâmetros do Mapeamento\n${mappingDataLines.join('\n')}`);
        }

        // ## Resultado do mapeamento
        let resultMappingParts = [];

        // Ambiente Minimo
        let minLines = [
            buildLine('Tipo de Servidor', recommendations.tipoServidor),
            buildLine('Quantidade de vCPU', recommendations.vCPUMinimo),
            buildRamDistribution(recommendations.sqlServerMinimo, recommendations.windowsMinimo, recommendations.usuariosMinimo, recommendations.botMinimo, 'Minimo'),
            buildLine('Memória RAM Total', recommendations.memoriaRamTotalMinimo),
            buildLine('Versão do SQL Server', recommendations.sqlServerVersionMinimo),
            buildLine('Armazenamento', recommendations.armazenamento)
        ].filter(line => line !== '');
        if (minLines.length > 0) {
            resultMappingParts.push(`### Ambiente Minimo:\n${minLines.join('\n')}`);
        }

        // Ambiente Recomendado
        let recLines = [
            buildLine('Tipo de Servidor', recommendations.tipoServidor),
            buildLine('Quantidade de vCPU', recommendations.vCPURecomendado),
            buildRamDistribution(recommendations.sqlServerRecomendado, recommendations.windowsRecomendado, recommendations.usuariosRecomendado, recommendations.botRecomendado, 'Recomendado'),
            buildLine('Memória RAM Total', recommendations.memoriaRamTotalRecomendado),
            buildLine('Versão do SQL Server', recommendations.sqlServerVersionRecomendado),
            buildLine('Armazenamento', recommendations.armazenamento)
        ].filter(line => line !== '');
        if (recLines.length > 0) {
            resultMappingParts.push(`### Ambiente Recomendado:\n${recLines.join('\n')}`);
        }
        
        if (resultMappingParts.length > 0) {
             reportParts.push(`---
## Resultado do mapeamento\n${resultMappingParts.join('\n\n')}`); // Adiciona '\n\n' entre as subseções Minimo/Recomendado
        }


        // Observações
        if (!isNA(recommendations.observacoes)) { // Verifica se há observações para exibir
            reportParts.push(`---
Observações:\n${recommendations.observacoes}`);
        } else {
            reportParts.push(`---
Observações:\nNenhuma observação.`); // Mantém a linha de "Nenhuma observação." se não houver
        }


        // Junta todas as partes do relatório
        let finalReport = reportParts.join('\n\n'); // Junta seções principais com duas quebras de linha
        return finalReport;
    }
});