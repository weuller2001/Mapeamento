// script.js

document.addEventListener('DOMContentLoaded', function() {
	const params = new URLSearchParams(window.location.search);
	const resultsContent = document.getElementById('resultsContent');
	const loadingMessage = document.getElementById('loadingMessage');
	const processButton = document.getElementById('processButton');
	
	let dataFound = false;
	let collectedDataForReport = {};

	// --- FUNÇÃO AUXILIAR DE ARREDONDAMENTO ---
	// Converte MB para GB e arredonda para o próximo número PAR de GB
	function roundUpToNextEvenGB(valueMB) {
		const valueGB = valueMB / 1024;
		const roundedValue = Math.ceil(valueGB);
		if (roundedValue % 2 !== 0) {
			return (roundedValue + 1) + ' GB';
		}
		return roundedValue + ' GB';
	}

	// Função auxiliar para preencher um elemento com dados da URL
	function fillElement(id, paramName, suffix = '') {
		let value = params.get(paramName);
		
		if (value !== null) {
			// Decodificação e tratamento de vírgulas (mantido)
			value = decodeURIComponent(value.replace(/\+/g, ' '));
			
			let displayValue = value;
			let storedValue = value;

			// Tratamento de vírgula/ponto para valores numéricos no objeto de relatório
			if (paramName.includes('MB') || paramName.includes('GB') || paramName.includes('Mbps') || paramName.includes('Score')) {
				storedValue = value.replace(',', '.');
			}
			
			// Atribui o valor para o elemento na página
			const element = document.getElementById(id);
			if (element) {
				element.textContent = displayValue + suffix;
				dataFound = true;
				collectedDataForReport[paramName] = storedValue;
			}
		} else {
			const element = document.getElementById(id);
			if (element) {
				element.textContent = 'N/A';
				collectedDataForReport[paramName] = 'N/A';
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
	fillElement('sqlMaiorBancoBaseMB', 'sqlMaiorBancoBaseMB', ' GB'); 
	fillElement('NomesqlMaiorBancoBaseMB', 'NomesqlMaiorBancoBaseMB');
	fillElement('sqlTotalBancoBaseMB', 'sqlTotalBancoBaseMB', ' ' + 'GB'); 
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
			console.log('Botão de processamento encontrado e event listener anexado!');
			processButton.addEventListener('click', () => {
				console.log('Botão clicado! Iniciando o processamento...');

				if (!validateMappingParameters()) {
					return;
				}

				const mappingData = getMappingParameters();
				const finalReportData = { ...collectedDataForReport, ...mappingData };

				// Calcula as recomendações
				const recommendations = calculateRecommendations(finalReportData);
				
				const reportText = generateReportText(finalReportData, recommendations);
				
				// configuração de disparo de email com o emailJS
				
				const serviceID = 'service_o8pq2op';	
				const templateID = 'template_m7nu82b';	
				
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
    // --- Definição dos Pacotes (Inalterada) ---
    const PACKAGES = [
        // ... (Seus pacotes existentes) ...
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
        const HolosSelected = data.holos === 'Sim';
        const NFeSelected = data.nfe === 'Sim';
        const PontoSelected = data.ponto === 'Sim';
        const VpnSelected = data.vpn === 'Sim';
        const sqlMaiorBancoBaseMB = parseFloat(data.sqlMaiorBancoBaseMB) || 0;
        const mediaXMLmensal = parseFloat(data.mediaXMLmensal) || 0;
        const connectionType = (data.connectionType || '').toLowerCase();
        const internetDownloadSpeedMbps = parseFloat(data.internetDownloadSpeedMbps) || 0;
        
        const TEN_GB_MB = 10 * 1024;
        let reasonsForUpgrade = [];
		
		let observacoes = [];
        // --- 1. Encontrar o Pacote Mínimo Shared (Base para Sugestão 1) ---
        let minSharedPackageDetails = null;

        // Loop sobre APENAS pacotes Shared (0 a 10)
        for (let i = 0; i < 11 && i < PACKAGES.length; i++) {
            const pkg = PACKAGES[i]; 
            // Testa APENAS os limites não-LR. O limite LR será tratado como "Avulso".
            const meetsUsers = qtdUsuarios <= pkg.users;
            const meetsTotalCompanies = totalEmpresas <= pkg.totalCompanies;
            const meetsPresumptive = empLucroPresumido <= pkg.presumptiveProfit;
            const meetsMaxEmployees = maiorQuadroFuncionarios <= pkg.maxEmployeesPerCompany;
            const meetsTotalEmployees = totalFuncionarios <= pkg.totalEmployees;

            if (meetsUsers && meetsTotalCompanies && meetsPresumptive && meetsMaxEmployees && meetsTotalEmployees) {
                minSharedPackageDetails = pkg;
                break; // Encontramos o mínimo Shared que atende o resto
            }
        }
        // Se não houver pacote Shared que atenda (ex: 150 empresas), o fallback será Fly IV (máximo)
        if (!minSharedPackageDetails) {
             minSharedPackageDetails = PACKAGES.find(p => p.name.includes('NG Essence X'));
        }

        // 4. Calcular o AVULSO necessário
        const minSharedLRLimit = minSharedPackageDetails.actualProfit; // Limite de LR do pacote Shared escolhido
        let avulsoNeededLR = 0;
        
        if (empLucroReal > minSharedLRLimit) {
            avulsoNeededLR = empLucroReal - minSharedLRLimit;
        }

        // --- 5. Definir as Duas Sugestões Finais ---
        
        // Sugestão 1 (Simples + Adequação Avulsa)
        const suggestion1Name = minSharedPackageDetails.name + (avulsoNeededLR > 0 ? ` + ${avulsoNeededLR} Empresas Lucro Real Avulso` : '');
        
        // Sugestão 2 (Robusta) - Usamos o Fly I como base, mas verificamos o próximo nível, se necessário
        let robustPackageDetails = PACKAGES.find(p => p.name.includes('Fly I')); // Começa no Fly I
        
        // Roda a lógica de forçamento original para identificar a necessidade Dedicada
        if (sqlMaiorBancoBaseMB > TEN_GB_MB) reasonsForUpgrade.push('Banco de Dados: Maior banco de dados excede 10 GB.');
        // ... (outras razões de upgrade, se aplicável, para preencher reasonsForUpgrade) ...
        
        if (reasonsForUpgrade.length > 0 || empLucroReal > minSharedLRLimit) {
            // Se o cliente violou o limite LR, ou tem outro motivo, o robusto deve ser Fly I ou superior
            
            // Re-executa a lógica de classificação COMPLETA (com LR) para encontrar o MÍNIMO FLY que o cliente realmente precisa
            let minFlyViableIndex = PACKAGES.findIndex(p => p.actualProfit >= empLucroReal && p.isFly);

            if (minFlyViableIndex === -1 && empLucroReal > 100) { // Se o LR for absurdo e ultrapassar Fly IV
                 minFlyViableIndex = PACKAGES.findIndex(p => p.name.includes('Fly IV'));
            }
            if (minFlyViableIndex !== -1) {
                 robustPackageDetails = PACKAGES[minFlyViableIndex];
            }
            
            // Define o Robust como o próximo Fly, para dar a opção de crescimento (Ex: Fly I -> Fly II)
            const minFlyIndex = PACKAGES.findIndex(p => p.name === robustPackageDetails.name);
            if (minFlyIndex !== -1 && minFlyIndex + 1 < PACKAGES.length && PACKAGES[minFlyIndex + 1].isFly) {
                 robustPackageDetails = PACKAGES[minFlyIndex + 1];
            }
        }
        
        const suggestion2Name = robustPackageDetails.name;


        // --- CÁLCULOS DE DIMENSIONAMENTO (Baseado no Pacote ROBUSTO, agora 'robustPackageDetails') ---
        
        let serverSpecs = {
            vCPURecomendado: 'N/A',
            memoriaRamTotalRecomendado: 'N/A',
            sqlServerVersionRecomendado: robustPackageDetails.sql || 'N/A',
            armazenamento: '2 GB',
        };
        
        if (robustPackageDetails.isFly) {
             const MIN_DEDICADO_VCPU = 3;
             const MIN_DEDICADO_RAM_MB = 8 * 1024;
             
             let vCPUValue = Math.ceil(qtdUsuarios / 1.5);
             if (vCPUValue < MIN_DEDICADO_VCPU) { vCPUValue = MIN_DEDICADO_VCPU; }
             serverSpecs.vCPURecomendado = vCPUValue;
             
             let sqlRecMB = 3584 + (Math.max(0, qtdUsuarios - 6) * 896); // Base + 896MB por usuário extra
             
             const windowsRecVal = 4096;
             const usuariosRecMB = qtdUsuarios * 1280;
             const holosBotRecMB = HolosSelected ? 2048 : 0;
             const totalRamRecMB = sqlRecMB + windowsRecVal + usuariosRecMB + holosBotRecMB;

             serverSpecs.memoriaRamTotalRecomendado = roundUpToNextEvenGB(totalRamRecMB);
             serverSpecs.armazenamento = '140 GB';
        }
        
        // --- Retorno Final ---
        return {
            recommendedPackage: suggestion1Name, // Simples + Avulso
            robustPackage: suggestion2Name,      // Próximo Nível (Fly)
            packageDetails: minSharedPackageDetails, // Detalhes do Simples
            robustDetails: robustPackageDetails,     // Detalhes do Robusto (Fly)
            serverSpecs: serverSpecs, 
            isDedicated: robustPackageDetails.isFly, // Se o robusto for Fly, é Dedicado
            observacoes: observacoes.join('\n')
        };
    }

	// A função generateReportText usa 'data' (dados coletados) e 'recommendations' (rec)
	
	function generateReportText(data, recommendations) {
		// Helper function to check for NA/null/empty strings
		const isNA = (value) => {
			return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim().toLowerCase() === 'n/a');
		};

		// Helper function to build list items conditionally
		const buildLine = (label, value, suffix = '') => {
			if (!isNA(value)) {
				return `<li><strong>${label}:</strong> ${value}${suffix}</li>`;
			}
			return '';
		};

		let reportParts = [];
		const rec = recommendations;
		const serverSpecs = rec.serverSpecs; 

		// --- 1. Pacote Recomendado (Duas Sugestões) ---
		reportParts.push(`<h5>Resultado do Mapeamento de Pacotes (Duas Sugestões)</h5>`);
		
		let packageLines = [
			// Sugestão 1: Mínimo Viável (Adequação)
			buildLine('1ª Sugestão (Mínimo Viável)', rec.recommendedPackage),
			// Sugestão 2: Mais Robusta (Recomendação)
			buildLine('2ª Sugestão (Robusta/Recomendada)', rec.robustPackage),
			buildLine('Versão SQL Server (Pacote)', rec.robustDetails ? rec.robustDetails.sql : 'N/A')
		].filter(line => line !== '');
		
		if (packageLines.length > 0) {
			reportParts.push(`<ul style="margin-top:0;">${packageLines.join('')}</ul>`);
		}

		// --- 2. Dimensionamento Dedicado (Baseado no Pacote Robusto) ---
		if (rec.isDedicated) {
			let dedicatedLinesRec = [
				buildLine('Quantidade de vCPU', serverSpecs.vCPURecomendado),
				buildLine('Memória RAM Total', serverSpecs.memoriaRamTotalRecomendado),
				buildLine('Versão do SQL Server', serverSpecs.sqlServerVersionRecomendado),
				buildLine('Armazenamento', serverSpecs.armazenamento)
			].filter(line => line !== '');
			
			if (dedicatedLinesRec.length > 0) {
				reportParts.push('<hr style="margin: 24px 0;">');
				reportParts.push(`<h5 style="margin-bottom:8px; color: #cc0000;">Dimensionamento Recomendado do Servidor Dedicado</h5><ul style="margin-top:0;">${dedicatedLinesRec.join('')}</ul>`);
			}
		}

		// --- 3. Dados do Cliente e Empresas (Raw Data) ---
		
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
			// Converte MB para GB para exibição
			buildLine('Maior Banco de Dados', data.sqlMaiorBancoBaseMB, ' GB'),
			buildLine('Nome do Maior Banco de Dados', data.NomesqlMaiorBancoBaseMB),
			buildLine('Tamanho Total da Base', data.sqlTotalBancoBaseMB, ' GB')
		].filter(line => line !== '');

		if (clientDataLines.length > 0) {
			reportParts.push(`<h5 style="margin-bottom:8px;">Dados Coletados da Base e Cliente</h5><ul style="margin-top:0;">${clientDataLines.join('')}</ul>`);
		}

		// --- 4. Parâmetros do Mapeamento ---
		let mappingDataLines = [
			buildLine('Possui NFe Express', data.nfe),
			buildLine('Utiliza NGPonto', data.ponto),
			buildLine('Utiliza Holos/People', data.holos),
			buildLine('Precisa de VPN', data.vpn),
			buildLine('Quantidade de Usuários para acesso', data.qtdUsuarios)
		].filter(line => line !== '');

		if (mappingDataLines.length > 0) {
			reportParts.push(`<h5 style="margin-bottom:8px;">Parâmetros de Mapeamento</h5><ul style="margin-top:0;">${mappingDataLines.join('')}</ul>`);
		}

		// --- 5. Dados do Ambiente (Rede e Hardware) ---
		let envDataLines = [
			buildLine('Versão do Windows', data.windowsVersion),
			buildLine('Tipo de Conexão', data.connectionType),
			buildLine('Velocidade de Upload (Aproximado)', data.internetUploadSpeedMbps, ' Mbps'),
			buildLine('Velocidade de Download (Aproximado)', data.internetDownloadSpeedMbps, ' Mbps')
		].filter(line => line !== '');

		if (envDataLines.length > 0) {
			reportParts.push(`<h5 style="margin-bottom:8px;">Dados do Ambiente (SO, Hardware e SQL Server)</h5><ul style="margin-top:0;">${envDataLines.join('')}</ul>`);
		}

		// --- 6. Observações Finais (Alertas/Justificativas) ---
		if (rec.observacoes && rec.observacoes.length > 0) {
			// Usa white-space: pre-wrap para que as quebras de linha '\n' funcionem
			reportParts.push(`<h5 style="margin-bottom:8px;">Observações (Alertas/Justificativas)</h5><p style="white-space: pre-wrap; font-family: monospace; background-color: #fdd; padding: 10px; border-radius: 5px;">${rec.observacoes}</p>`);
		}

		// Junta todas as seções com o separador visual
		return reportParts.join('<hr style="margin: 24px 0;">');
	}
});