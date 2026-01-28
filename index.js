// index.js
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');

// Modeller
const GeneralKey = require('./models/generalKeyModel');
const SubscriberKey = require('./models/subscriberKeyModel');

// --- EXPRESS (ROBLOX API) AYARLARI ---
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Botu oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// 🏠 ANA SAYFA
app.get('/', (req, res) => {
    res.send('👑 Zyphera Bot API Sistemi Aktif! 👑');
});

// Komut koleksiyonunu hazırla
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[UYARI] ${filePath} dosyasında gerekli özellikler eksik.`);
        }
    }
}

// Ses Kontrol Fonksiyonu
const checkVoiceConnection = () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;

    const connection = getVoiceConnection(process.env.GUILD_ID);

    if (!connection) {
        try {
            joinVoiceChannel({
                channelId: process.env.VOICE_CHANNEL_ID,
                guildId: process.env.GUILD_ID,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
            console.log("Bağlantı kesilmişti, kanala tekrar giriş yapıldı.");
        } catch (error) {
            console.error("Ses kanalına bağlanırken hata oluştu:", error);
        }
    }
};

// 🌍 ROBLOX API ENDPOINT
app.get('/check-key', async (req, res) => {
    const { key, hwid, scriptName } = req.query;

    if (!key || !hwid) {
        return res.json({ success: false, message: "Key veya HWID eksik! / Key or HWID missing!" });
    }

    try {
        let dbKey = await GeneralKey.findOne({ key: key });
        let keyType = 'general';

        if (!dbKey) {
            dbKey = await SubscriberKey.findOne({ key: key });
            keyType = 'subscriber';
        }

        if (!dbKey) {
            return res.json({ success: false, message: "Geçersiz Key! / Invalid Key!" });
        }

        // Script İsim Kontrolü
        if (scriptName && dbKey.scriptName !== scriptName) {
            return res.json({
                success: false,
                scriptName: dbKey.scriptName,
                message: `HATA: Yanlış Key! / Wrong Key!`
            });
        }

        // Süre Kontrolü (General Key)
        if (keyType === 'general' && dbKey.expiresAt) {
            if (new Date() > dbKey.expiresAt) {
                return res.json({ success: false, message: "Key süresi dolmuş! / Key has expired!" });
            }
        }

        // HWID Kontrolü
        if (!dbKey.hwid) {
            dbKey.hwid = hwid;
            dbKey.isUsed = true;
            await dbKey.save();
        } else if (dbKey.hwid !== hwid) {
            return res.json({ success: false, message: "HWID Hatası! Başka cihazda kullanılmış. / HWID Mismatch!" });
        }

        return res.json({
            success: true,
            message: "Giriş Başarılı / Login Successful",
            script: `print('Zyphera: Hoşgeldin/Welcome! (${keyType})')`,
            type: keyType,
            scriptName: dbKey.scriptName
        });
    } catch (error) {
        console.error("API Hatası:", error);
        return res.json({ success: false, message: "Sunucu hatası! / Server error!" });
    }
});
app.listen(PORT, () => {
    console.log(`🌍 Roblox API çalışıyor: Port ${PORT}`);
});

// 🤖 DISCORD BOT EVENTS
client.once('ready', async () => {
    console.log(`🤖 Giriş yapıldı: ${client.user.tag}`);

    // MongoDB Bağlantısı
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ MongoDB bağlantısı başarılı.'))
        .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

    // Ses Bağlantısı ve Kontrolü
    checkVoiceConnection();
    setInterval(checkVoiceConnection, 5000);

    // Hareketli Durum
    const activities = [{ name: "👑 Zyphera #SCR1PT", type: ActivityType.Watching }];
    let i = 0;
    setInterval(() => {
        if (i >= activities.length) i = 0;
        client.user.setPresence({
            activities: [activities[i]],
            status: 'online',
        });
        i++;
    }, 5000);

    // 🕒 OTOMATİK SÜRE KONTROL SİSTEMİ
    setInterval(async () => {
        const now = new Date();
        const expiredGeneral = await GeneralKey.find({ expiresAt: { $ne: null, $lte: now } });
        const expiredSub = await SubscriberKey.find({ expiresAt: { $ne: null, $lte: now } });

        const processExpiredKey = async (keyData, Model) => {
            try {
                const guild = client.guilds.cache.get(process.env.GUILD_ID);
                if (!guild) return;

                const logChannel = guild.channels.cache.get(process.env.CHANNEL_ID_LOG_EXPIRED);
                let member;
                try {
                    member = await guild.members.fetch(keyData.ownerId);
                } catch (e) {
                    member = null;
                }

                const isEnglish = member ? member.roles.cache.has(process.env.ROLE_ID_ENGLISH) : false;
                const ticketChannelId = isEnglish ? process.env.CHANNEL_ID_TICKET_EN : process.env.CHANNEL_ID_TICKET_TR;

                const createdTs = Math.floor(new Date(keyData.createdAt).getTime() / 1000);
                const expiresTs = Math.floor(new Date(keyData.expiresAt).getTime() / 1000);

                const dmContent = isEnglish ? {
                    title: "Your Key Has Expired",
                    desc: `**⛓️‍💥 Expired Key --> ||\`${keyData.key}\`|| \n🆔 Expired Key ID --> \`${keyData.keyId}\` \n🪄 Key Creator --> <@${keyData.creatorId}> \n🧾 Creation Reason --> \`${keyData.reason}\` \n📜 Script Name --> \`${keyData.scriptName}\` \n⏰ Creation Time --> <t:${createdTs}:F> \n⏱️ Expiration Time --> <t:${expiresTs}:F> \n❗ __IF YOU THINK THERE IS AN ERROR, PLEASE OPEN A TICKET AT <#${ticketChannelId}>__**`
                } : {
                    title: "Bir Key'iniz Süresi Doldu",
                    desc: `**⛓️‍💥 Süresi Biten Key --> ||\`${keyData.key}\`|| \n🆔 Süresi Biten Key'in ID --> \`${keyData.keyId}\` \n🪄 Key'i Oluşturan Yetkili --> <@${keyData.creatorId}> \n🧾 Key'in Oluşturulma Sebebi --> \`${keyData.reason}\` \n📜 Script Adı --> \`${keyData.scriptName}\` \n⏰ Key'in Oluşturulma Zamanı --> <t:${createdTs}:F> \n⏱️ Key'in Bitiş Zamanı --> <t:${expiresTs}:F> \n❗ __EĞER BİR HATA OLDUĞUNU DÜŞÜNÜYORSANIZ <#${ticketChannelId}> KANALINDAN BİLET OLUŞTURUN__**`
                };

                if (member) {
                    const dmEmbed = new EmbedBuilder().setTitle(dmContent.title).setDescription(dmContent.desc).setColor('Random');
                    await member.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Bir Key\'in Süresi Bitti')
                        .setDescription(`**⛓️‍💥 Süresi Biten Key --> ||\`${keyData.key}\`|| \n🆔 Süresi Biten Key'in ID --> \`${keyData.keyId}\` \n🪄 Key'i Oluşturan Yetkili --> <@${keyData.creatorId}> \n👑 Key Sahibi --> <@${keyData.ownerId}> \n🧾 Key'in Oluşturulma Sebebi --> \`${keyData.reason}\` \n📜 Script Adı --> \`${keyData.scriptName}\` \n⏰ Key'in Oluşturulma Zamanı --> <t:${createdTs}:F> \n⏱️ Key'in Bitiş Zamanı --> <t:${expiresTs}:F>**`)
                        .setColor('Random');
                    await logChannel.send({ embeds: [logEmbed] });
                }

                await Model.deleteOne({ _id: keyData._id });
                console.log(`[OTOMATİK] ${keyData.keyId} ID'li key silindi.`);
            } catch (err) {
                console.error("Otomatik silme hatası:", err);
            }
        };

        for (const key of expiredGeneral) await processExpiredKey(key, GeneralKey);
        for (const key of expiredSub) await processExpiredKey(key, SubscriberKey);
    }, 5000);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMsg = { content: 'Komutu çalıştırırken bir hata oluştu!', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(errorMsg);
        else await interaction.reply(errorMsg);
    }
});

// 🛡️ SUNUCUDAN AYRILAN KİŞİNİN KEYLERİNİ SİLME
client.on('guildMemberRemove', async (member) => {
    if (member.user.bot) return;
    const LOG_CHANNEL_ID = "1460584716439916645";

    try {
        const generalKeys = await GeneralKey.find({ ownerId: member.id });
        const subKeys = await SubscriberKey.find({ ownerId: member.id });
        const totalKeys = generalKeys.length + subKeys.length;

        const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embed = new EmbedBuilder().setTitle('Kullanıcı Sunucudan Ayrıldı');

        if (totalKeys > 0) {
            await GeneralKey.deleteMany({ ownerId: member.id });
            await SubscriberKey.deleteMany({ ownerId: member.id });
            embed.setColor('Green').setDescription(`**👑 Sunucudan Ayrılan Kişi --> ${member} / \`${member.id}\` \n⛓️‍💥 Toplam Key Sayısı --> \`${totalKeys}\` \n❗ __BÜTÜN KEYLER SİLİNDİ__**`);
        } else {
            embed.setColor('Red').setDescription(`**👑 Sunucudan Ayrılan Kişi --> ${member} / \`${member.id}\` \n⛓️‍💥 Toplam Key Sayısı --> \`0\` \n❗ __SİLİNECEK KEY BULUNAMADI__**`);
        }

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error("Ayrılan üye key silme hatası:", error);
    }
});

////////// EVENTS YÜKLEME /////////

// Event handler: events klasöründeki her dosyayı bir event olarak yükler
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}


client.login(process.env.TOKEN);