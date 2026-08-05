const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone'); 

// O caminho do Chromium é configurado pelas variáveis de ambiente do Docker (veremos no Passo 4)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

// Memória para não mandar o textão repetidas vezes para a mesma pessoa
const chatsRespondidos = new Set(); 

client.on('qr', (qr) => {
    console.log('\n[!] ESCANEIE O QR CODE ABAIXO COM O WHATSAPP DO SUPORTE:\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n[✅] BOT MAGIC CASINO ONLINE E PRONTO PARA ATENDER!');
});

client.on('message', async message => {
    const chatId = message.from;

    // Ignora mensagens de grupos ou mensagens do próprio bot
    if (chatId.includes('@g.us') || message.fromMe) return;

    // Se já respondemos essa pessoa desde que o bot ligou, ignora
    if (chatsRespondidos.has(chatId)) return;

    console.log(`[RADAR] Novo atendimento solicitado por: ${chatId}`);

    // Pega a hora atual no fuso horário do Brasil para dar o bom dia/tarde/noite correto
    const horaAtual = moment().tz("America/Sao_Paulo").hour();
    
    let saudacao = "Boa noite!";
    if (horaAtual >= 5 && horaAtual < 12) {
        saudacao = "Bom dia!";
    } else if (horaAtual >= 12 && horaAtual < 18) {
        saudacao = "Boa tarde!";
    }

    const resposta = `${saudacao}\n\nSou o assistente virtual do Magic Casino Online!\nPor favor, digite abaixo como podemos ajudar, que em até 24h entraremos em contato...\n\n(se tiver prints, fotos, ou vídeos, pode anexar)`;

    await client.sendMessage(chatId, resposta);
    
    // Marca que a pessoa já recebeu a saudação
    chatsRespondidos.add(chatId);
});

client.initialize();