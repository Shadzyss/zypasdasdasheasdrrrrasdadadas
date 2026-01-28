// index.js
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const express = require('express'); 

// Modelleri Çağırıyoruz
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

// ==========================================================
// 🏠 ANA SAYFA (Root Endpoint)
// ==========================================================
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

    // Bağlantı yoksa veya durumu 'Destroyed' ise tekrar bağlan
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

client.once('ready', () => {
    console.log(`${client.user.tag} hazır ve sese bağlanıyor...`);
    
    // İlk açılışta bağlan
    checkVoiceConnection();

    // Her 5 saniyede bir kontrol et
    setInterval(checkVoiceConnection, 5000);
});


// ==========================================================
// 🌍 ROBLOX API ENDPOINT (TAM GÜVENLİK - STRICT MODE)
// ==========================================================
app.get('/check-key', async (req, res) => {
    // Lua scriptinden gelen veriler
    const { key, hwid, scriptName } = req.query;

    if (!key || !hwid) {
        return res.json({ success: false, message: "Key veya HWID eksik! / Key or HWID missing!" });
    }

    try {
        // 1. Önce Normal Keylerde Ara
        let dbKey = await GeneralKey.findOne({ key: key });
        let keyType = 'general';

        // 2. Bulamazsa Abone Keylerde Ara
        if (!dbKey) {
            dbKey = await SubscriberKey.findOne({ key: key });
            keyType = 'subscriber';
        }

        // 3. Hiçbir yerde yoksa
        if (!dbKey) {
            return res.json({ success: false, message: "Geçersiz Key! / Invalid Key!" });
        }

        // --- 🛡️ SCRIPT İSMİ KONTROLÜ (EN KRİTİK NOKTA) ---
        // Bu kontrol HWID kaydetmeden ÖNCE yapılır.
        // Eğer Script isimleri BİREBİR TUTMUYORSA işlem iptal edilir ve HWID KAYDEDİLMEZ.
        // Abone Key bile olsa, yanlış script adına girmeye çalışırsa reddedilir.
        
        if (scriptName) {
            if (dbKey.scriptName !== scriptName) {
                // İsimler farklı! 
                // Örn: Veritabanı="ABONE KEY", Gelen="BLOX FRUITS" -> HATA!
                // Örn: Veritabanı="PET SIM", Gelen="DOORS" -> HATA!
                
                return res.json({ 
                    success: false, 
                    scriptName: dbKey.scriptName, // Doğrusunu göster
                    message: `HATA: Yanlış Key! / Wrong Key!` 
                });
                // BURADA "RETURN" ETTİĞİMİZ İÇİN KOD AŞAĞIYA İNMEZ VE HWID KAYDETMEZ.
            }
        }

        // --- KONTROLLER ---

        // A) Süre Kontrolü (Sadece General Key için)
        if (keyType === 'general' && dbKey.expiresAt) {
            const now = new Date();
            if (now > dbKey.expiresAt) {
                return res.json({ success: false, message: "Key süresi dolmuş! / Key has expired!" });
            }
        }

        // B) HWID Kontrolü ve Kaydetme
        // Buraya kadar geldiyse İSİM DOĞRUDUR. Artık HWID işlemine geçebiliriz.
        if (!dbKey.hwid) {
            // İlk defa kullanılıyor, HWID'i kilitle
            dbKey.hwid = hwid;
            dbKey.isUsed = true;
            await dbKey.save(); // <-- HWID SADECE BURADA VE SADECE İSİM DOĞRUYSA KAYDEDİLİR.
        } else {
            // Daha önce kullanılmış, HWID eşleşiyor mu?
            if (dbKey.hwid !== hwid) {
                return res.json({ success: false, message: "HWID Hatası! Başka cihazda kullanılmış. / HWID Mismatch!" });
            }
        }

        // C) BAŞARILI!
        const scriptToLoad = `print('Zyphera: Hoşgeldin/Welcome! (${keyType})')`; 

        return res.json({
            success: true,
            message: "Giriş Başarılı / Login Successful",
            script: scriptToLoad, 
            type: keyType,
            scriptName: dbKey.scriptName 
        });

    } catch (error) {
        console.error("API Hatası:", error);
        return res.json({ success: false, message: "Sunucu hatası! / Server error!" });
    }
});

// API Sunucusunu Başlat
app.listen(PORT, () => {
    console.log(`🌍 Roblox API çalışıyor: Port ${PORT}`);
});


// ==========================================================
// 🤖 DISCORD BOT EVENTS
// ==========================================================
client.once('ready', async () => {
    console.log(`🤖 Giriş yapıldı: ${client.user.tag}`);

    // MongoDB Bağlantısı
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ MongoDB bağlantısı başarılı.'))
        .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

    // Hareketli Durum Ayarı
    const activities = [
        { name: "👑 Zyphera #SCR1PT", type: ActivityType.Watching},
    ];

    let i = 0;
    setInterval(() => {
        if (i >= activities.length) i = 0;
        client.user.setPresence({
            activities: [activities[i]],
            status: 'online',
        });
        i++;
    }, 5000); 

    // ==========================================================
    // 🕒 OTOMATİK SÜRE KONTROL SİSTEMİ
    // ==========================================================
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

                let createdTs, expiresTs;
                try {
                    createdTs = Math.floor(new Date(keyData.createdAt).getTime() / 1000);
                    expiresTs = Math.floor(new Date(keyData.expiresAt).getTime() / 1000);
                } catch (e) {
                    createdTs = Math.floor(Date.now() / 1000);
                    expiresTs = createdTs;
                }

                // DM GÖNDER
                if (member) {
                    const dmTitle = isEnglish ? "Your Key Has Expired" : "Bir Key'iniz Süresi Doldu";
                    const dmDesc = isEnglish 
                        ? `**⛓️‍💥 Expired Key --> ||\`${keyData.key}\`||
🆔 Expired Key ID --> \`${keyData.keyId}\`
🪄 Key Creator --> <@${keyData.creatorId}>
🧾 Creation Reason --> \`${keyData.reason}\`
📜 Script Name --> \`${keyData.scriptName}\`
⏰ Creation Time --> <t:${createdTs}:F>
⏱️ Expiration Time --> <t:${expiresTs}:F>
❗ __IF YOU THINK THERE IS AN ERROR, PLEASE OPEN A TICKET AT <#${ticketChannelId}>__**`
                        : `**⛓️‍💥 Süresi Biten Key --> ||\`${keyData.key}\`||
🆔 Süresi Biten Key'in ID --> \`${keyData.keyId}\`
🪄 Key'i Oluşturan Yetkili --> <@${keyData.creatorId}>
🧾 Key'in Oluşturulma Sebebi --> \`${keyData.reason}\`
📜 Script Adı --> \`${keyData.scriptName}\`
⏰ Key'in Oluşturulma Zamanı --> <t:${createdTs}:F>
⏱️ Key'in Bitiş Zamanı --> <t:${expiresTs}:F>
❗ __EĞER BİR HATA OLDUĞUNU DÜŞÜNÜYORSANIZ <#${ticketChannelId}> KANALINDAN BİLET OLUŞTURUN__**`;

                    const dmEmbed = new EmbedBuilder()
                        .setTitle(dmTitle)
                        .setDescription(dmDesc)
                        .setColor('Random');

                    await member.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                // LOG KANALINA GÖNDER
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Bir Key\'in Süresi Bitti')
                        .setDescription(`
**⛓️‍💥 Süresi Biten Key --> ||\`${keyData.key}\`||
🆔 Süresi Biten Key'in ID --> \`${keyData.keyId}\`
🪄 Key'i Oluşturan Yetkili --> <@${keyData.creatorId}>
👑 Key Sahibi --> <@${keyData.ownerId}>
🧾 Key'in Oluşturulma Sebebi --> \`${keyData.reason}\`
📜 Script Adı --> \`${keyData.scriptName}\`
⏰ Key'in Oluşturulma Zamanı --> <t:${createdTs}:F>
⏱️ Key'in Bitiş Zamanı --> <t:${expiresTs}:F>**`)
                        .setColor('Random');

                    await logChannel.send({ embeds: [logEmbed] });
                }

                await Model.deleteOne({ _id: keyData._id });
                console.log(`[OTOMATİK] ${keyData.keyId} ID'li keyin süresi doldu ve silindi.`);

            } catch (err) {
                console.error("Otomatik silme hatası:", err);
            }
        };

        for (const key of expiredGeneral) {
            await processExpiredKey(key, GeneralKey);
        }
        
        for (const key of expiredSub) {
            await processExpiredKey(key, SubscriberKey);
        }

    }, 5000); 
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`${interaction.commandName} komutu bulunamadı.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Komutu çalıştırırken bir hata oluştu!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Komutu çalıştırırken bir hata oluştu!', ephemeral: true });
        }
    }
});

// ==========================================================
// 🛡️ SUNUCUDAN AYRILAN KİŞİNİN KEYLERİNİ SİLME SİSTEMİ
// ==========================================================
client.on('guildMemberRemove', async (member) => {
    if (member.user.bot) return;

    const LOG_CHANNEL_ID = "1460584716439916645";

    try {
        // Önce kullanıcının sahip olduğu toplam key sayısını bulalım
        const generalKeys = await GeneralKey.find({ ownerId: member.id });
        const subKeys = await SubscriberKey.find({ ownerId: member.id });
        const totalKeys = generalKeys.length + subKeys.length;

        const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('Kullanıcı Sunucudan Ayrıldı');

        if (totalKeys > 0) {
            // Keyleri veritabanından siliyoruz
            await GeneralKey.deleteMany({ ownerId: member.id });
            await SubscriberKey.deleteMany({ ownerId: member.id });

            // Başarılı (Yeşil) Embed
            embed.setColor('Green')
                .setDescription(`**👑 Sunucudan Ayrılan Kişi --> ${member} / \`${member.id}\`
⛓️‍💥 Kişinin Sahip Olduğu Toplam Key Sayısı --> \`${totalKeys}\`
❗ __KİŞİNİN ÜSTÜNE KAYITLI OLAN BÜTÜN KEYLER SİLİNDİ__**`);
        } else {
            // Key yoksa (Kırmızı) Embed
            embed.setColor('Red')
                .setDescription(`**👑 Sunucudan Ayrılan Kişi --> ${member} / \`${member.id}\`
⛓️‍💥 Kişinin Sahip Olduğu Toplam Key Sayısı --> \`0\`
❗ __KİŞİNİN ÜSTÜNDE HİÇ KAYITLI KEY OLMADIĞI İÇİN HİÇBİR KEY SİLİNMEDİ__**`);
        }

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error("Ayrılan üye key silme hatası:", error);
    }
});

//////// TİCKET SİSTEMİ ////////
const ticketModel = require('./models/ticketSchema'); // Yolunu kontrol et
const { ChannelType, PermissionsBitField } = require('discord.js');

// Buton Tıklamalarını Dinleme (Özet Mantık)
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const staffRoleId = process.env.STAFF_ROLE_ID; // 1446481571807887482
    const guild = interaction.guild;

    // --- TICKET AÇMA ---
    if (interaction.customId.startsWith('tkt_')) {
        const categoryNames = { tkt_bilgi: 'bilgi', tkt_sikayet: 'sikayet', tkt_basvuru: 'basvuru', tkt_diger: 'diger' };
        const categoryName = categoryNames[interaction.customId];

        const ticketChannel = await guild.channels.create({
            name: `ticket-${categoryName}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
        });

        const welcomeEmbed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> Ticket Açtığınız İçin Teşekkür Ederiz Ticketi Kapatmak İçin 🔒 Butonuna Basın\n\n` +
                `\`----- Ticket Bilgileri -----\`\nTicketi Açan Kişi --> <@${interaction.user.id}>\nTicket Kategorisi --> ${categoryName}\nTicketin Açılış Tarihi --> <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                `<:zyphera_sagok:1464095169220448455> Ticket İle İlgilenecek Yetkili <a:zyphera_raptiye:1464095171921842290> Butonuna Tıklasın Ve Ticketi Sahiplensin`)
            .setColor('Random');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setEmoji('1464095171921842290').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket_request').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}> - <@&${staffRoleId}>`, embeds: [welcomeEmbed], components: [row] });
        await interaction.reply({ content: `Ticket kanalınız açıldı: ${ticketChannel}`, ephemeral: true });
    }

    // --- SAHİPLENME (CLAIM) ---
    if (interaction.customId === 'claim_ticket') {
        if (!interaction.member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Sadece yetkililer sahiplenebilir.', ephemeral: true });

        // Veritabanı +1
        await ticketModel.findOneAndUpdate({ guildId: guild.id, userId: interaction.user.id }, { $inc: { ticketCount: 1 } }, { upsert: true });

        const claimEmbed = new EmbedBuilder()
            .setTitle('Ticket Sahiplenildi')
            .setDescription(`Ticket <@${interaction.user.id}> Tarafından Sahiplenildi. <@${interaction.user.id}> Sorunu Çözemiyorsanız Ticketı Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın`)
            .setColor('Green');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unclaim_ticket').setEmoji('📌').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('close_ticket_request').setEmoji('🔒').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [claimEmbed], components: [row] });
    }

    // --- BIRAKMA (UNCLAIM) ---
    if (interaction.customId === 'unclaim_ticket') {
        // Veritabanı -1
        await ticketModel.findOneAndUpdate({ guildId: guild.id, userId: interaction.user.id }, { $inc: { ticketCount: -1 } });

        const unclaimEmbed = new EmbedBuilder()
            .setTitle('Ticket Sahipliği Bırakıldı')
            .setDescription(`<@${interaction.user.id}> Tarafından Ticket Sahipliği Bırakıldı Ticketi Sahiplenmek İçin <a:zyphera_raptiye:1464095171921842290> Butonuna Tıklasın`)
            .setColor('Red');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setEmoji('1464095171921842290').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket_request').setEmoji('🔒').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [unclaimEmbed], components: [row] });
    }

    // --- KAPATMA / ONAY / SİLME ---
    if (interaction.customId === 'close_ticket_request') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_close').setLabel('Onayla').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_close').setLabel('İptal Et').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Ticket Kapatılıyor').setDescription('Onaylıyor musunuz?').setColor('Yellow')], components: [row] });
    }

    if (interaction.customId === 'confirm_close') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reopen_ticket').setEmoji('🔓').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('delete_ticket').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );
        await interaction.update({ embeds: [new EmbedBuilder().setDescription('Ticket Kapatıldı. Yeniden açabilir veya silebilirsiniz.').setColor('Yellow')], components: [row] });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    }

    if (interaction.customId === 'delete_ticket') {
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Ticket Siliniyor').setDescription('Ticket saniyeler içinde silinecek.').setColor('Random')] });
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

client.login(process.env.CLIENT_TOKEN);