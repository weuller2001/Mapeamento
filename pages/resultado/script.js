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
	fillElement('clienteCPFCNPJ', 'clienteCPFCNPJ');
    fillElement('empAtivas', 'empAtivas');
    fillElement('empInativas', 'empInativas');
    fillElement('empTotal', 'empTotal');
	fillElement('empLucroPresumido', 'empLucroPresumido');
	fillElement('empLucroReal', 'empLucroReal');
    fillElement('funcionariosEmpresaMaior', 'funcionariosEmpresaMaior');
    fillElement('funcionariosEmpresaTotal', 'funcionariosEmpresaTotal');
    fillElement('mediaXMLmensal', 'mediaXMLmensal');
    fillElement('sqlMaiorBancoBaseMB', 'sqlMaiorBancoBaseMB', ' GB'); // Agora armazena em MB, mas exibe em GB
	fillElement('NomesqlMaiorBancoBaseMB', 'NomesqlMaiorBancoBaseMB');
    fillElement('sqlTotalBancoBaseMB', 'sqlTotalBancoBaseMB', ' ' + 'GB'); // Agora armazena em MB, mas exibe em GB
    fillElement('windowsVersion', 'windowsVersion');
    fillElement('connectionType', 'connectionType');
    fillElement('internetUploadSpeedMbps', 'internetUploadSpeedMbps', ' Mbps');
    fillElement('internetDownloadSpeedMbps', 'internetDownloadSpeedMbps', ' Mbps');


    // --- Lógica para mostrar/esconder mensagens e o botão de download ---
    if (dataFound) {
        loadingMessage.style.display = 'none';
        resultsContent.style.display = 'block';

        // Habilitar o botão de download após os dados serem carregados
        if (processButton) {
            console.log('Botão de processamento encontrado e event listener anexado!'); // Log de verificação
            processButton.addEventListener('click', () => {
                console.log('Botão clicado! Iniciando o processamento...'); // Log de verificação

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
				
				//configuração de disparo de email com o emailJS - EMAILJS SÓ PERMITE 200 ENVIOS MENSAIS
				
				const serviceID = 'service_o8pq2op'; // SUBSTITUA PELO SEU SERVICE ID
                const templateID = 'template_m7nu82b'; // SUBSTITUA PELO SEU TEMPLATE ID
				
				const clienteInfoCompleto = finalReportData.clienteInfo || 'Cliente Não Informado';
				const clienteCodigo = clienteInfoCompleto.match(/^\d+/)?.[0] || 'N/A';
				
                const templateParams = {
                    clienteInfo: finalReportData.clienteInfo || 'Cliente Não Informado',
                    report_content: reportText,
					codChamado: finalReportData.codChamado,
					clienteCodigo: clienteCodigo
                };

                emailjs.send(serviceID, templateID, templateParams)
                    .then(function(response) {
                        console.log('E-mail enviado com sucesso!', response.status, response.text);
                        alert('Mapeamento Concluído');
						window.location.href = '../../pages/concluido/concluido.html';
                    }, function(error) {
                        console.error('Erro ao enviar o e-mail:', error);
                        alert('Houve um erro ao enviar o e-mail. Verifique suas configurações no EmailJS.');
                    });
				
				//Bloco de download
				/*
                const blob = new Blob([reportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_diagnostico_${new Date().toISOString().slice(0,10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
				*/
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

        //const certificado = getRadioValue('certificado');
        //const impressora = getRadioValue('impressora');
        const nfe = getRadioValue('nfe');
        const ponto = getRadioValue('ponto');
        const holos = getRadioValue('holos'); // Este é o campo que será usado para a lógica do "BOT"
        const vpn = getRadioValue('vpn');
        
        // Para inputs de texto, .value.trim() está correto
        const qtdUsuarios = parseInt(document.getElementById('qtdUsuarios')?.value.trim()) || 0; // Converte para número inteiro, 0 se vazio
        //const codChamado = document.getElementById('codChamado')?.value.trim();

        return {
            //certificado,
            //impressora,
            nfe,
            ponto,
            holos, // Manter como 'holos'
            vpn,
            qtdUsuarios,
            //codChamado
        };
    }

    // --- Nova função para validar os campos do mapeamento ---
    function validateMappingParameters() {
        const mappingData = getMappingParameters();
        let missingFields = [];

        // Verifica radio buttons
        //if (!mappingData.certificado) missingFields.push('Certificado Digital');
        //if (!mappingData.impressora) missingFields.push('Impressora Matricial');
        if (!mappingData.nfe) missingFields.push('NFe Express');
        if (!mappingData.ponto) missingFields.push('NGPonto');
        if (!mappingData.holos) missingFields.push('Holos/People');
        if (!mappingData.vpn) missingFields.push('VPN');

        // Verifica campos de texto
        // Note: qtdUsuarios já é 0 se estiver vazio, então a validação aqui é se é > 0
        if (mappingData.qtdUsuarios === 0) missingFields.push('Quantidade de Usuários');
        //if (!mappingData.codChamado) missingFields.push('Número do Chamado');

        if (missingFields.length > 0) {
            alert('Por favor, preencha os seguintes campos antes de prosseguir:\n\n- ' + missingFields.join('\n- '));
            return false; // Validação falhou
        }
        return true; // Validação bem-sucedida
    }

    // --- Adicionar event listeners para os campos de texto aceitarem apenas números ---
    const qtdUsuariosInput = document.getElementById('qtdUsuarios');
    

    if (qtdUsuariosInput) {
        qtdUsuariosInput.addEventListener('input', function(event) {
            // Remove qualquer coisa que não seja dígito
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
	
	// Campo codChamado
	/* const codChamadoInput = document.getElementById('codChamado');
    if (codChamadoInput) {
        codChamadoInput.addEventListener('input', function(event) {
            // Remove qualquer coisa que não seja dígito
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
	*/

    // --- calculateRecommendations MODIFICADA com Lógica de Dimensionamento Dedicado ---
    function calculateRecommendations(data) {
        // --- Definição dos Pacotes ---
        const PACKAGES = [
            // ... [Definição dos pacotes NG Essence I - X (Não alterado)] ...
            { name: 'NGEssence Start', users: 2, totalCompanies: 10, presumptiveProfit: 2, actualProfit: 0, maxEmployeesPerCompany: 20, totalEmployees: 100, isFly: false, sql: 'Express' },
            { name: 'NG Essence I', users: 2, totalCompanies: 20, presumptiveProfit: 10, actualProfit: 0, maxEmployeesPerCompany: 25, totalEmployees: 150, isFly: false, sql: 'Express' },
            { name: 'NG Essence II', users: 2, totalCompanies: 30, presumptiveProfit: 30, actualProfit: 0, maxEmployeesPerCompany: 30, totalEmployees: 250, isFly: false, sql: 'Express' },
            { name: 'NG Essence III', users: 3, totalCompanies: 40, presumptiveProfit: 40, actualProfit: 1, maxEmployeesPerCompany: 60, totalEmployees: 300, isFly: false, sql: 'Express' },
            { name: 'NG Essence IV', users: 3, totalCompanies: 50, presumptiveProfit: 50, actualProfit: 1, maxEmployeesPerCompany: 60, totalEmployees: 350, isFly: false, sql: 'Express' },
            { name: 'NG Essence V', users: 4, totalCompanies: 60, presumptiveProfit: 60, actualProfit: 1, maxEmployeesPerCompany: 60, totalEmployees: 400, isFly: false, sql: 'Express' },
            { name: 'NG Essence VI', users: 4, totalCompanies: 70, presumptiveProfit: 70, actualProfit: 1, maxEmployeesPerCompany: 60, totalEmployees: 500, isFly: false, sql: 'Express' },
            { name: 'NG Essence VII', users: 4, totalCompanies: 80, presumptiveProfit: 80, actualProfit: 2, maxEmployeesPerCompany: 60, totalEmployees: 500, isFly: false, sql: 'Express' },
            { name: 'NG Essence VIII', users: 5, totalCompanies: 80, presumptiveProfit: 80, actualProfit: 3, maxEmployeesPerCompany: 60, totalEmployees: 600, isFly: false, sql: 'Express' },
            { name: 'NG Essence IX', users: 6, totalCompanies: 90, presumptiveProfit: 90, actualProfit: 4, maxEmployeesPerCompany: 65, totalEmployees: 700, isFly: false, sql: 'Express' },
            { name: 'NG Essence X', users: 6, totalCompanies: 100, presumptiveProfit: 100, actualProfit: 5, maxEmployeesPerCompany: 70, totalEmployees: 800, isFly: false, sql: 'Express' },
            // Pacotes Fly (Dedicados)
            { name: 'NG Essence Fly I (Dedicado)', users: 6, totalCompanies: 100, presumptiveProfit: 100, actualProfit: 100, maxEmployeesPerCompany: 60, totalEmployees: 1000, isFly: true, sql: 'Web' },
            { name: 'NG Essence Fly II (Dedicado)', users: 6, totalCompanies: 125, presumptiveProfit: 125, actualProfit: 125, maxEmployeesPerCompany: 70, totalEmployees: 1500, isFly: true, sql: 'Web' },
            { name: 'NG Essence Fly III (Dedicado)', users: 7, totalCompanies: 150, presumptiveProfit: 150, actualProfit: 150, maxEmployeesPerCompany: 80, totalEmployees: 2000, isFly: true, sql: 'Web' },
            { name: 'NG Essence Fly IV (Dedicado)', users: 9, totalCompanies: 200, presumptiveProfit: 200, actualProfit: 200, maxEmployeesPerCompany: 100, totalEmployees: 3000, isFly: true, sql: 'Web' },
        ];

        // --- Variáveis de Entrada do Cliente ---
        const qtdUsuarios = parseInt(data.qtdUsuarios) || 0;
        const totalEmpresas = parseInt(data.empTotal) || 0;
        const empLucroPresumido = parseInt(data.empLucroPresumido) || 0;
        const empLucroReal = parseInt(data.empLucroReal) || 0;
        const maiorQuadroFuncionarios = parseInt(data.funcionariosEmpresaMaior) || 0;
        const totalFuncionarios = parseInt(data.funcionariosEmpresaTotal) || 0;
        
        // Dados adicionais para dimensionamento e observações
        const sqlMaiorBancoBaseMB = parseFloat(data.sqlMaiorBancoBaseMB) || 0;
        const mediaXMLmensal = parseFloat(data.mediaXMLmensal) || 0;
        const connectionType = (data.connectionType || '').toLowerCase();
        const internetDownloadSpeedMbps = parseFloat(data.internetDownloadSpeedMbps) || 0;
        const HolosSelected = data.holos === 'Sim';
        const NFeSelected = data.nfe === 'Sim';
        const PontoSelected = data.ponto === 'Sim';
        const VpnSelected = data.vpn === 'Sim';
        
        const TEN_GB_MB = 10 * 1024; // 10 GB em MB = 10240 MB

        let recommendedPackage = 'N/A';
        let recommendationDetails = null;
        let reasonsForUpgrade = [];
        
        // --- Lógica de Classificação de Pacote (Não alterada) ---
        for (const pkg of PACKAGES) {
            const meetsUsers = qtdUsuarios <= pkg.users;
            const meetsTotalCompanies = totalEmpresas <= pkg.totalCompanies;
            const meetsPresumptive = empLucroPresumido <= pkg.presumptiveProfit;
            const meetsActual = empLucroReal <= pkg.actualProfit;
            const meetsMaxEmployees = maiorQuadroFuncionarios <= pkg.maxEmployeesPerCompany;
            const meetsTotalEmployees = totalFuncionarios <= pkg.totalEmployees;

            if (meetsUsers && meetsTotalCompanies && meetsPresumptive && meetsActual && meetsMaxEmployees && meetsTotalEmployees) {
                recommendedPackage = pkg.name;
                recommendationDetails = pkg;
                break;
            }
        }
        
        // --- Verificação e Ajuste para Dedicado (Fly) ---
        // Se houver necessidade Dedicada por funcionalidade/volume, garantir que o pacote seja Fly.
        if (sqlMaiorBancoBaseMB > TEN_GB_MB) {
             reasonsForUpgrade.push('Banco de Dados: Maior banco de dados excede 10 GB.');
        }
        if (mediaXMLmensal > 25000) {
             reasonsForUpgrade.push('Volume XML: Média mensal de XML excede 25.000.');
        }
        if (qtdUsuarios > 6 && !recommendedPackage.includes('Fly')) { 
             reasonsForUpgrade.push('Usuários: Quantidade de usuários é superior a 6 (Exige Fly).');
        }
        if (NFeSelected) {
             reasonsForUpgrade.push('Funcionalidade: Utiliza NFe Express.');
        }
        if (VpnSelected) {
             reasonsForUpgrade.push('Funcionalidade: Requer VPN para acesso.');
        }
        
        let isForcedDedicated = false;

        if (reasonsForUpgrade.length > 0) {
             // Força o upgrade para Fly I se o pacote recomendado atual não for Dedicado
             if (!recommendationDetails || !recommendationDetails.isFly) {
                 const flyIPackage = PACKAGES.find(p => p.name.includes('Fly I'));
                 if (flyIPackage) {
                     recommendedPackage = 'NG Essence Fly I (Dedicado) - **SUGERIDO**';
                     recommendationDetails = flyIPackage;
                     isForcedDedicated = true;
                 }
             }
        }
        
        // --- CÁLCULOS DE DIMENSIONAMENTO (APENAS SE FOR DEDICADO) ---
        
        let serverSpecs = {
            vCPUMinimo: 'N/A',
            vCPURecomendado: 'N/A',
            memoriaRamTotalMinimo: 'N/A',
            memoriaRamTotalRecomendado: 'N/A',
            sqlServerVersionMinimo: recommendationDetails ? recommendationDetails.sql : 'N/A',
            sqlServerVersionRecomendado: recommendationDetails ? recommendationDetails.sql : 'N/A',
            armazenamento: '2 GB', // Padrão
        };
        
        if (recommendationDetails && recommendationDetails.isFly || isForcedDedicated) {
             const MIN_DEDICADO_VCPU = 3;
             const MIN_DEDICADO_RAM_MB = 8 * 1024;
             
             // 1. vCPU (Baseado em Usuários)
             serverSpecs.vCPUMinimo = Math.ceil(qtdUsuarios / 2);
             serverSpecs.vCPURecomendado = Math.ceil(qtdUsuarios / 1.5);

             if (serverSpecs.vCPUMinimo < MIN_DEDICADO_VCPU) {
                 serverSpecs.vCPUMinimo = MIN_DEDICADO_VCPU;
             }
             
             // 2. RAM SQL Server (em MB)
             let sqlMinMB = 0;
             let sqlRecMB = 0;
             
             if (recommendationDetails.sql === 'Express') { // Mínimo para Express (apenas como fallback, pois Fly é Web)
                 sqlMinMB = 3 * 1024;
                 sqlRecMB = 3 * 1024;
             } else { // Versão é 'Web'
                 // Usando a lógica original para Dedicado/Web
                 if (qtdUsuarios > 6) {
                     sqlMinMB = 3584 + ((qtdUsuarios - 6) * 512); // Base + 512MB por usuário extra
                     sqlRecMB = 3584 + ((qtdUsuarios - 6) * 896); // Base + 896MB por usuário extra
                 } else {
                     sqlMinMB = 3584; // 3.5 GB
                     sqlRecMB = 3584;
                 }
             }

             // 3. RAM por Usuário (em MB)
             const windowsMinVal = 4096;
             const windowsRecVal = 4096;
             const usuariosMinMB = qtdUsuarios * 896;
             const usuariosRecMB = qtdUsuarios * 1280;
             
             // 4. RAM Holos/BOT (em MB)
             const holosBotMinMB = HolosSelected ? 2048 : 0;
             const holosBotRecMB = HolosSelected ? 2048 : 0;
             
             // 5. RAM Total (em MB)
             const totalRamMinMB = sqlMinMB + windowsMinVal + usuariosMinMB + holosBotMinMB;
             const totalRamRecMB = sqlRecMB + windowsRecVal + usuariosRecMB + holosBotRecMB;

             // 6. RAM Total Final (Convertido e Arredondado)
             let finalTotalRamMinMB = totalRamMinMB;
             if (totalRamMinMB < MIN_DEDICADO_RAM_MB) {
                 finalTotalRamMinMB = MIN_DEDICADO_RAM_MB;
             }
             
             serverSpecs.memoriaRamTotalMinimo = roundUpToNextEvenGB(finalTotalRamMinMB);
             serverSpecs.memoriaRamTotalRecomendado = roundUpToNextEvenGB(totalRamRecMB);
             serverSpecs.armazenamento = '140 GB'; // Padrão Dedicado
        }
        
        // --- Observações Finais (Não alteradas) ---
        let observacoes = [];
        if (reasonsForUpgrade.length > 0) {
            observacoes.push('--- RECOMENDAÇÃO DEDICADO ---');
            observacoes.push('O ambiente apresenta requisitos que indicam a necessidade de um servidor **Dedicado (Pacote Fly)**, devido a uma ou mais das seguintes razões:');
            reasonsForUpgrade.forEach(r => observacoes.push(`- ${r}`));
            observacoes.push('O servidor Dedicado garante maior estabilidade e recursos para estas demandas.');
            observacoes.push('-----------------------------');
        }
        if (connectionType === 'wifi') observacoes.push('Cliente pode ter instabilidades no acesso por utilizar a conexão **Wifi**. Sugerir sempre conexão cabeada.');
        if (internetDownloadSpeedMbps > 0 && internetDownloadSpeedMbps < 15) observacoes.push('Cliente pode ter instabilidades no acesso por sua internet ser lenta (< 15 Mbps de download).');
        if (PontoSelected) observacoes.push('NGPonto: Importações de ponto do relógio serão feitas **manualmente**, pois com o sistema em nuvem não é possível coletar automaticamente.');
        if (VpnSelected) observacoes.push('VPN: Verificar qual usuário utilizará a VPN (só é permitido 1 usuário na VPN).');
        if (HolosSelected) observacoes.push('Holos/People: A utilização requer que a estação de trabalho atenda aos requisitos mínimos de RAM e Processamento para o "BOT".');

        return {
            recommendedPackage: recommendedPackage,
            packageDetails: recommendationDetails, 
            serverSpecs: serverSpecs, // Novo campo com os cálculos
            isDedicated: recommendationDetails && recommendationDetails.isFly || isForcedDedicated, // Novo campo de flag
            observacoes: observacoes.join('\n')
        };
    }

    // --- Função para gerar o texto do relatório (MODIFICADA para exibição condicional) ---
    function generateReportText(data, recommendations) {
        const isNA = (value) => {
            return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim().toLowerCase() === 'n/a');
        };

        const buildLine = (label, value, suffix = '') => {
            if (!isNA(value)) {
                return `<li><strong>${label}:</strong> ${value}${suffix}</li>`;
            }
            return '';
        };

        let reportParts = [];
        const rec = recommendations;

        reportParts.push(`<h5>Relatório de Diagnóstico de Sistema e Pacote Recomendado</h5>`);

        // ## Resultado do Mapeamento (Pacote)
        let packageLines = [
            buildLine('Pacote Recomendado', rec.recommendedPackage),
            buildLine('Versão SQL Server (Pacote)', rec.packageDetails ? rec.packageDetails.sql : 'N/A')
        ].filter(line => line !== '');
        
        // Adicionar detalhes do pacote, se disponíveis
        if (rec.packageDetails) {
            packageLines.push(`<li><strong>Limite de Usuários:</strong> ${rec.packageDetails.users}</li>`);
            packageLines.push(`<li><strong>Limite Total de Empresas:</strong> ${rec.packageDetails.totalCompanies}</li>`);
            packageLines.push(`<li><strong>Limite Máx. Lucro Presumido:</strong> ${rec.packageDetails.presumptiveProfit}</li>`);
            packageLines.push(`<li><strong>Limite Máx. Lucro Real:</strong> ${rec.packageDetails.actualProfit}</li>`);
            packageLines.push(`<li><strong>Limite Máx. Funcionários por Empresa:</strong> ${rec.packageDetails.maxEmployeesPerCompany}</li>`);
            packageLines.push(`<li><strong>Limite Total de Funcionários:</strong> ${rec.packageDetails.totalEmployees}</li>`);
        }

        if (packageLines.length > 0) {
            reportParts.push(`<h5 style="margin-bottom:8px;">Resultado do Mapeamento (Pacote)</h5><ul style="margin-top:0;">${packageLines.join('')}</ul>`);
        }
        
        // --- Exibição Condicional para Dedicado ---
        if (rec.isDedicated) {
            let dedicatedLinesMin = [
                buildLine('Quantidade de vCPU', rec.serverSpecs.vCPUMinimo),
                buildLine('Memória RAM Total', rec.serverSpecs.memoriaRamTotalMinimo),
                buildLine('Versão do SQL Server', rec.serverSpecs.sqlServerVersionMinimo),
                buildLine('Armazenamento', rec.serverSpecs.armazenamento)
            ].filter(line => line !== '');
            
            let dedicatedLinesRec = [
                buildLine('Quantidade de vCPU', rec.serverSpecs.vCPURecomendado),
                buildLine('Memória RAM Total', rec.serverSpecs.memoriaRamTotalRecomendado),
                buildLine('Versão do SQL Server', rec.serverSpecs.sqlServerVersionRecomendado),
                buildLine('Armazenamento', rec.serverSpecs.armazenamento)
            ].filter(line => line !== '');
            
            if (dedicatedLinesMin.length > 0 || dedicatedLinesRec.length > 0) {
                reportParts.push('<hr style="margin: 24px 0;">');
                reportParts.push(`<h5 style="margin-bottom:8px;">Dimensionamento Mínimo do Servidor Dedicado</h5><ul style="margin-top:0;">${dedicatedLinesMin.join('')}</ul>`);
                reportParts.push(`<h5 style="margin-bottom:8px;">Dimensionamento Recomendado do Servidor Dedicado</h5><ul style="margin-top:0;">${dedicatedLinesRec.join('')}</ul>`);
            }
        }

    // ## Dados do Cliente e Empresas
    let clientDataLines = [
        buildLine('Codigo do Cliente', data.clienteInfo),
		buildLine('CPF/CNPJ', data.clienteCPFCNPJ),
        buildLine('Empresas Ativas', data.empAtivas),
        buildLine('Empresas Inativas', data.empInativas),
		buildLine('Empresas de Lucro Presumido', data.empLucroPresumido),
		buildLine('Empresas de Lucro Real', data.empLucroReal),
        buildLine('Total de Empresas', data.empTotal),
        buildLine('Maior Quadro de Funcionários', data.funcionariosEmpresaMaior),
        buildLine('Total de Funcionários da Base', data.funcionariosEmpresaTotal),
        buildLine('Média XML Mensal', data.mediaXMLmensal),
        buildLine('Maior Banco de Dados', (data.sqlMaiorBancoBaseMB / 1024).toFixed(2), ' GB'),
		buildLine('Nome do Maior Banco de Dados', data.NomesqlMaiorBancoBaseMB),
        buildLine('Tamanho Total da Base', (data.sqlTotalBancoBaseMB / 1024).toFixed(2), ' GB')
    ].filter(line => line !== '');

    if (clientDataLines.length > 0) {
        reportParts.push(`<h5 style="margin-bottom:8px;">Dados do Cliente e Empresas</h5><ul style="margin-top:0;">${clientDataLines.join('')}</ul>`);
    }

    // ## Parâmetros do Mapeamento
    let mappingDataLines = [
        buildLine('Possui NFe Express', data.nfe),
        buildLine('Utiliza NGPonto', data.ponto),
        buildLine('Utiliza Holos/People', data.holos),
        buildLine('Precisa de VPN', data.vpn),
        buildLine('Quantidade de Usuários para acesso', data.qtdUsuarios)
    ].filter(line => line !== '');

    if (mappingDataLines.length > 0) {
        reportParts.push(`<h5 style="margin-bottom:8px;">Parâmetros do Mapeamento</h5><ul style="margin-top:0;">${mappingDataLines.join('')}</ul>`);
    }

    // ## Dados do Ambiente
    let envDataLines = [
        buildLine('Versão do Windows', data.windowsVersion),
        buildLine('Tipo de Conexão', data.connectionType),
        buildLine('Velocidade de Upload (Aproximado)', data.internetUploadSpeedMbps, ' Mbps'),
        buildLine('Velocidade de Download (Aproximado)', data.internetDownloadSpeedMbps, ' Mbps')
    ].filter(line => line !== '');

    if (envDataLines.length > 0) {
        reportParts.push(`<h5 style="margin-bottom:8px;">Dados do Ambiente (SO, Hardware e SQL Server)</h5><ul style="margin-top:0;">${envDataLines.join('')}</ul>`);
    }

    // Junta todas as seções com um <hr> visual limpo
    return reportParts.join('<hr style="margin: 24px 0;">');
}
});