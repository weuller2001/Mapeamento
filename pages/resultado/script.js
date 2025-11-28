// script.js

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const resultsContent = document.getElementById('resultsContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const processButton = document.getElementById('processButton');
    
    let dataFound = false;
    let collectedDataForReport = {};

    // --- FUNÇÃO AUXILIAR DE ARREDONDAMENTO ---
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
            // Decodificação
            value = decodeURIComponent(value.replace(/\+/g, ' '));
            
            let displayValue = value;
            let storedValue = value;

            // Tratamento de vírgula/ponto para cálculos internos (mantém original para exibição se quiser, 
            // mas aqui vamos padronizar com ponto para garantir que o JS consiga ler nos cálculos)
            if (paramName.includes('MB') || paramName.includes('GB') || paramName.includes('Mbps') || paramName.includes('Score')) {
                storedValue = value.replace(',', '.');
            }
            
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

    // --- Preenche os campos na tela (HTML) ---
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
    
    // No HTML, apenas exibe o valor que veio (ex: 8,22) + GB
    fillElement('sqlMaiorBancoBaseMB', 'sqlMaiorBancoBaseMB', ' GB'); 
    fillElement('NomesqlMaiorBancoBaseMB', 'NomesqlMaiorBancoBaseMB');
    fillElement('sqlTotalBancoBaseMB', 'sqlTotalBancoBaseMB', ' GB'); 
    
    fillElement('windowsVersion', 'windowsVersion');
    fillElement('connectionType', 'connectionType');
    fillElement('internetUploadSpeedMbps', 'internetUploadSpeedMbps', ' Mbps');
    fillElement('internetDownloadSpeedMbps', 'internetDownloadSpeedMbps', ' Mbps');


    if (dataFound) {
        loadingMessage.style.display = 'none';
        resultsContent.style.display = 'block';

        if (processButton) {
            processButton.addEventListener('click', () => {
                if (!validateMappingParameters()) {
                    return;
                }

                const mappingData = getMappingParameters();
                const finalReportData = { ...collectedDataForReport, ...mappingData };

                // Calcula apenas a sugestão de hardware
                const specs = calculateDedicatedSpecs(finalReportData);
                
                // Gera o relatório com o novo layout
                const reportText = generateReportText(finalReportData, specs);
                
                // Configuração de envio de email
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
                        alert('Houve um erro ao enviar o e-mail.');
                    });
            });
        }       
    } else {
        loadingMessage.textContent = "Nenhum dado válido encontrado na URL.";
        if (processButton) {
            processButton.style.display = 'none';
        }
    }
    
    // --- Funções de Validação e Coleta ---
    function getMappingParameters() {
        const getRadioValue = (name) => {
            const selectedRadio = document.querySelector(`input[name="${name}"]:checked`);
            return selectedRadio ? (selectedRadio.value || selectedRadio.id) : '';
        };

        return {
            nfe: getRadioValue('nfe'),
            ponto: getRadioValue('ponto'),
            holos: getRadioValue('holos'),
            vpn: getRadioValue('vpn'),
            qtdUsuarios: parseInt(document.getElementById('qtdUsuarios')?.value.trim()) || 0
        };
    }

    function validateMappingParameters() {
        const mappingData = getMappingParameters();
        let missingFields = [];

        if (!mappingData.nfe) missingFields.push('NFe Express');
        if (!mappingData.ponto) missingFields.push('NGPonto');
        if (!mappingData.holos) missingFields.push('Holos/People');
        if (!mappingData.vpn) missingFields.push('VPN');
        if (mappingData.qtdUsuarios === 0) missingFields.push('Quantidade de Usuários');

        if (missingFields.length > 0) {
            alert('Por favor, preencha os seguintes campos:\n\n- ' + missingFields.join('\n- '));
            return false;
        }
        return true;
    }

    const qtdUsuariosInput = document.getElementById('qtdUsuarios');
    if (qtdUsuariosInput) {
        qtdUsuariosInput.addEventListener('input', function(event) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // --- CÁLCULO APENAS DA SUGESTÃO DEDICADA ---
    function calculateDedicatedSpecs(data) {
        // Variáveis de Entrada
        const qtdUsuarios = parseInt(data.qtdUsuarios) || 0;
        const HolosSelected = data.holos === 'Sim';
        
        // O valor vem em GB da URL, mas convertemos vírgula para ponto no fillElement (storedValue)
        // Ex: "8,22" vira 8.22
        const sqlMaiorBancoBaseGB = parseFloat(data.sqlMaiorBancoBaseMB) || 0; 

        let specs = {
            vCPU: 0,
            memoriaRAM: '',
            sqlVersion: '',
            armazenamento: '140 GB',
            observacoes: []
        };

        // 1. Cálculo de vCPU (Mínimo 3 para dedicado)
        const MIN_DEDICADO_VCPU = 3;
        let vCPUValue = Math.ceil(qtdUsuarios / 1.5);
        if (vCPUValue < MIN_DEDICADO_VCPU) { 
            vCPUValue = MIN_DEDICADO_VCPU; 
        }
        specs.vCPU = vCPUValue;

        // 2. Cálculo de RAM
        // Bases em MB para cálculo
        let sqlRecMB = 3584 + (Math.max(0, qtdUsuarios - 6) * 896); // Base SQL + Usuários Extras
        const windowsRecVal = 4096;
        const usuariosRecMB = qtdUsuarios * 1280;
        const holosBotRecMB = HolosSelected ? 2048 : 0;
        
        let totalRamRecMB = sqlRecMB + windowsRecVal + usuariosRecMB + holosBotRecMB;
        
        // Mínimo de 8GB para dedicado
        if (totalRamRecMB < (8 * 1024)) {
            totalRamRecMB = 8 * 1024;
        }

        specs.memoriaRAM = roundUpToNextEvenGB(totalRamRecMB);

        // 3. Lógica da Versão do SQL Server
        // Se maior banco > 9GB, obrigatoriamente Web. Senão Express ou Web.
        if (sqlMaiorBancoBaseGB > 9) {
            specs.sqlVersion = 'Web';
        } else {
            specs.sqlVersion = 'Express ou Web';
        }

        // 4. Observações
        const connectionType = (data.connectionType || '').toLowerCase();
        const internetDownloadSpeedMbps = parseFloat(data.internetDownloadSpeedMbps) || 0;

        if (connectionType === 'wifi') specs.observacoes.push('Alerta: Conexão Wi-Fi detectada. Sugerir cabeada.');
        if (internetDownloadSpeedMbps > 0 && internetDownloadSpeedMbps < 15) specs.observacoes.push('Alerta: Internet lenta (< 15 Mbps).');
        if (data.ponto === 'Sim') specs.observacoes.push('NGPonto: Importações de ponto serão manuais.');
        if (data.vpn === 'Sim') specs.observacoes.push('VPN: Permitido apenas 1 usuário.');
        if (HolosSelected) specs.observacoes.push('Holos/People: Requer recursos adicionais para o BOT (já calculados na RAM).');

        return specs;
    }

    // --- GERADOR DE RELATÓRIO (NOVO LAYOUT) ---
    function generateReportText(data, specs) {
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

        // --- Título ---
        //reportParts.push(`<h5>Relatório de Mapeamento</h5>`);

        // --- 1. SUGESTÃO DE AMBIENTE DEDICADO (NO TOPO) ---
        reportParts.push(`<h5 style="margin-bottom:8px;">Caso o vendedor opte por ambiente dedicado, ele deve respeitar as seguintes configurações:</h5>`);
        
        let dedicatedLines = [
            buildLine('Quantidade de vCPU', specs.vCPU),
            buildLine('Memória RAM Total', specs.memoriaRAM),
            buildLine('Versão do SQL Server', specs.sqlVersion),
            buildLine('Armazenamento', specs.armazenamento)
        ];
        reportParts.push(`<ul style="margin-top:0;">${dedicatedLines.join('')}</ul>`);

        // --- 2. Dados Coletados da Base e Cliente ---
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
            // Exibe exatamente como veio da URL/C#
            buildLine('Maior Banco de Dados', data.NomesqlMaiorBancoBaseMB + ' ' + data.sqlMaiorBancoBaseMB, ' GB'),
            buildLine('Tamanho Total da Base', data.sqlTotalBancoBaseMB, ' GB')
        ].filter(line => line !== '');

        if (clientDataLines.length > 0) {
            reportParts.push(`<h5 style="margin-bottom:8px;">Dados Coletados da Base e Cliente</h5><ul style="margin-top:0;">${clientDataLines.join('')}</ul>`);
        }

        // --- 3. Parâmetros do Mapeamento ---
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

        // --- 4. Dados do Ambiente ---
        let envDataLines = [
            buildLine('Versão do Windows', data.windowsVersion),
            buildLine('Tipo de Conexão', data.connectionType),
            buildLine('Velocidade de Upload (Aproximado)', data.internetUploadSpeedMbps, ' Mbps'),
            buildLine('Velocidade de Download (Aproximado)', data.internetDownloadSpeedMbps, ' Mbps')
        ].filter(line => line !== '');

        if (envDataLines.length > 0) {
            reportParts.push(`<h5 style="margin-bottom:8px;">Dados do Ambiente (SO, Hardware e SQL Server)</h5><ul style="margin-top:0;">${envDataLines.join('')}</ul>`);
        }

        // --- 5. Observações ---
        if (specs.observacoes && specs.observacoes.length > 0) {
             reportParts.push(`<h5 style="margin-bottom:8px;">Observações e Alertas</h5><p style="white-space: pre-wrap; font-family: monospace; background-color: #fdd; padding: 10px; border-radius: 5px;">${specs.observacoes.join('\n')}</p>`);
        }

        return reportParts.join('<hr style="margin: 24px 0;">');
    }
});