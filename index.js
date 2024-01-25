const { Client, LocalAuth, MessageAck, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const colors = require('colors');
const mime = require('mime-types');
const TikTokScraper = require('tiktok-scraper');
const fs = require('fs');
const ytdl = require('ytdl-core');
const getStream = require('get-stream');
/////////////////
const express = require('express');
const app = express();
/////////////////


const googleTTS = require('google-tts-api');
const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
    },
    ffmpeg: './ffmpeg.exe',
    authStrategy: new LocalAuth({ clientId: "client" })
});
const config = require('./config/config.json');
const { start } = require('repl');

client.on('qr', (qr) => {
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Scan the QR below : `);
    qrcode.generate(qr, { small: true });

    // Create a route to display the QR code in a web page
    app.get('/qr', (req, res) => {
        const qrHtml = `
            <html>
            <head>
                <title>WhatsApp QR Code</title>
            </head>
            <body>
                <h1>Scan the QR code below:</h1>
                <img src="data:image/png;base64,${qrcode.toDataURL(qr, { errorCorrectionLevel: 'H' })}" alt="WhatsApp QR Code">
            </body>
            </html>
        `;
        res.send(qrHtml);
    });

    // Start the Express server
    app.listen(3000, () => {
        console.log('Server is running on http://localhost:3000');
    });
});

client.on('ready', () => {
    console.clear();
    const consoleText = './config/console.txt';
    fs.readFile(consoleText, 'utf-8', (err, data) => {
        if (err) {
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Console Text not found!`.yellow);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        } else {
            console.log(data.green);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        }
    });
});


client.on('message', async (message) => {
    const isGroups = message.from.endsWith('@g.us') ? true : false;
    if ((isGroups && config.groups) || !isGroups) {

        const isGroupMessage = message.from.endsWith('@g.us');

        // Image to Sticker (Auto && Caption)
        if (!isGroupMessage && (message.type == "image" || message.type == "video" || message.type  == "gif") || (message._data.caption == `${config.prefix}sticker`)) {
            client.sendMessage(message.from, "*[⏳]* Loading..");
            try {
                const media = await message.downloadMedia();
                client.sendMessage(message.from, media, {
                    sendMediaAsSticker: true,
                    stickerName: config.name, // Sticker Name = Edit in 'config/config.json'
                    stickerAuthor: config.author // Sticker Author = Edit in 'config/config.json'
                }).then(() => {
                    client.sendMessage(message.from, "*[✅]* Successfully!");
                });
            } catch {
                client.sendMessage(message.from, "*[❎]* Failed!");
            }

        // Image to Sticker (With Reply Image)
        } else if (!isGroupMessage && message.body == `${config.prefix}sticker`) {
            const quotedMsg = await message.getQuotedMessage(); 
            if (message.hasQuotedMsg && quotedMsg.hasMedia) {
                client.sendMessage(message.from, "*[⏳]* Loading..");
                try {
                    const media = await quotedMsg.downloadMedia();
                    client.sendMessage(message.from, media, {
                        sendMediaAsSticker: true,
                        stickerName: config.name, // Sticker Name = Edit in 'config/config.json'
                        stickerAuthor: config.author // Sticker Author = Edit in 'config/config.json'
                    }).then(() => {
                        client.sendMessage(message.from, "*[✅]* Successfully!");
                    });
                } catch {
                    client.sendMessage(message.from, "*[❎]* Failed!");
                }
            } else {
                client.sendMessage(message.from, "*[❎]* Reply Image First!");
            }

        // Sticker to Image (Auto)
        } else if (!isGroupMessage && message.type == "sticker") {
            client.sendMessage(message.from, "*[⏳]* Loading..");
            try {
                const media = await message.downloadMedia();
                client.sendMessage(message.from, media).then(() => {
                    client.sendMessage(message.from, "*[✅]* Successfully!");
                });  
            } catch {
                client.sendMessage(message.from, "*[❎]* Failed!");
            }

        // Sticker to Image (With Reply Sticker)
        } else if (!isGroupMessage && message.body == `${config.prefix}image`) {
            const quotedMsg = await message.getQuotedMessage(); 
            if (message.hasQuotedMsg && quotedMsg.hasMedia) {
                client.sendMessage(message.from, "*[⏳]* Loading..");
                try {
                    const media = await quotedMsg.downloadMedia();
                    client.sendMessage(message.from, media).then(() => {
                        client.sendMessage(message.from, "*[✅]* Successfully!");
                    });
                } catch {
                    client.sendMessage(message.from, "*[❎]* Failed!");
                }
            } else {
                client.sendMessage(message.from, "*[❎]* Reply Sticker First!");
            }
            

        // Claim or change sticker name and sticker author
        } else if (!isGroupMessage && message.body.startsWith(`${config.prefix}change`)) {
            if (message.body.includes('|')) {
                let name = message.body.split('|')[0].replace(message.body.split(' ')[0], '').trim();
                let author = message.body.split('|')[1].trim();
                const quotedMsg = await message.getQuotedMessage(); 
                if (message.hasQuotedMsg && quotedMsg.hasMedia) {
                    client.sendMessage(message.from, "*[⏳]* Loading..");
                    try {
                        const media = await quotedMsg.downloadMedia();
                        client.sendMessage(message.from, media, {
                            sendMediaAsSticker: true,
                            stickerName: name,
                            stickerAuthor: author
                        }).then(() => {
                            client.sendMessage(message.from, "*[✅]* Successfully!");
                        });
                    } catch {
                        client.sendMessage(message.from, "*[❎]* Failed!");
                    }
                } else {
                    client.sendMessage(message.from, "*[❎]* Reply Sticker First!");
                }
            } else {
                client.sendMessage(message.from, `*[❎]* Run the command :\n*${config.prefix}change <name> | <author>*`);
            }
        
        // Read chat
        } else {
            client.getChatById(message.id.remote).then(async (chat) => {
                await chat.sendSeen();
            });
        }
    }
});
client.on('message', async (message) => {
    if (message.body === '@everyone') {
        const isGroup = message.from.endsWith('@g.us');
        if (isGroup) {
            let chat = await client.getChatById(message.from);
            let mentions = [];

            for(let participant of chat.participants) {
                mentions.push(participant.id._serialized);
            }

            // Comprueba si el remitente del mensaje es un administrador del grupo
            const sender = chat.participants.find(participant => participant.id._serialized === message.author);
            if (sender && sender.isAdmin) {
                chat.sendMessage('Mentioning everyone 🤖', {
                    mentions: mentions
                });
            }else{
                chat.sendMessage('You are not an admin 🤖');
            }
        }
    }
});
client.on('message', async (message) => {
    if (message.body.startsWith(`${config.prefix}levantate`)) {
        // Lee el archivo de audio
        const file = fs.readFileSync('./static/audio/x2mate.com - levantate de pie muchacho (128 kbps).mp3');
        
        // Crea un objeto MessageMedia
        const media = new MessageMedia('audio/mp3', file.toString('base64'));
        
        // Envía el audio
        message.reply(media);
    }
    else if (message.body.startsWith(`${config.prefix}vamos`))
    {
        const file = fs.readFileSync('./static/audio/vamos gg brianeitor [TubeRipper.com].mp3');
        
        // Crea un objeto MessageMedia
        const media = new MessageMedia('audio/mp3', file.toString('base64'));
        
        // Envía el audio
        message.reply(media);
    }
});
// send tts


client.on('message', async (message) => {
    if (message.body.startsWith(`${config.prefix}tts`)) {
        const text = message.body.slice(`${config.prefix}tts`.length).trim();
        if (text) {
            try {
                const url = googleTTS.getAudioUrl(text, {
                    lang: 'es',
                    slow: false,
                    host: 'https://translate.google.com',
                });
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const media = new MessageMedia('audio/mp3', buffer.toString('base64'));
                message.reply(media);
            } catch (error) {
                console.error(error);
                message.reply('Failed to convert text to speech.');
            }
        }
    }
});





client.on('message', async (message) => {
    if (message.body.includes('tiktok.com')) {
        const url = message.body.match(/(http(s)?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ;,./?%&=]*)?/)[0];
        if (url) {
            try {
                const buffer = await TikTokScraper.video(url, { noWaterMark: true });
                fs.writeFileSync('./tiktok.mp4', buffer);
                const media = MessageMedia.fromFilePath('./tiktok.mp4');
                message.reply(media);
            } catch (error) {

                console.error(error);
                message.reply('Failed to download the TikTok video.');
            }
        }
    }
});


client.on('message', async (message) => {
    if(message.body.startsWith(`${config.prefix}ping`)) {
        const timestamp = moment();
        const start = moment();
        await message.reply('*[⏳]* Loading..');
        const end = moment();
        const diff = end - start;
        message.reply(`*[🤖] Ping :* ${diff}ms`);
    }
});

client.on('message', async (message) => {
    if(message.body.startsWith(`${config.prefix}uptime`)) {
        const timestamp = moment();
        const start = moment();
        await message.reply('*[⏳]* Loading..');
        const end = moment();
        const diff = end - start;
        message.reply(`*[🤖] Uptime :* ${diff}ms`);
    }
});




client.on('message', async (message) => {
    if(message.body.startsWith(`${config.prefix}yt`)) {
        const url = message.body.split(`${config.prefix}yt `)[1];
        if (ytdl.validateURL(url)) {
            try {
                const stream = ytdl(url);
                const buffer = await getStream.buffer(stream);
                const media = new MessageMedia('video/mp4', buffer.toString('base64'), 'video');
                message.reply(media);
            } catch (error) {
                console.error(error);
                message.reply('Failed to download the YouTube video.');
            }
        } else {
            message.reply('Please provide a valid YouTube URL.');
        }
    }
});



app.use(express.json()); // Para poder parsear el cuerpo de las solicitudes POST en formato JSON

app.post('/send-message', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Faltan los campos "to" o "message".' });
    }

    try {
        await client.sendMessage(to, message);
        res.status(200).json({ success: 'Mensaje enviado con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
});

app.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});
















client.on('message', async (message) => {
    if (message.body.startsWith(`${config.prefix}help`)) {
        client.sendMessage(message.from, `*[🤖] Commands :*\n\n*${config.prefix}sticker* - Convert Image to Sticker\n*${config.prefix}image* - Convert Sticker to Image\n*${config.prefix}change <name> | <author>* - Change Sticker Name and Sticker Author\n\n*${config.prefix}help* - Show Commands\n*${config.prefix}info* - Show Information\n*${config.prefix}ping* - Show Ping\n*${config.prefix}uptime* - Show Uptime\n*${config.prefix}about* - Show About`, { quotedMessageId: message.id._serialized });


    }
});
                           
client 
        
    



client.initialize();
