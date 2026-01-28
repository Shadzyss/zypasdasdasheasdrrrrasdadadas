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
// interactionCreate Event'i içi
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId, guild, user, channel } = interaction;
    const staffRole = process.env.STAFF_TR_ROLE_ID;
    const categoryId = process.env.TICKET_KATEGORI;

    // --- TICKET OLUŞTURMA ---
    if (customId.startsWith('ticket_')) {
        const typeMap = {
            'ticket_bilgi': { label: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet': { label: 'Şikayet', emoji: '<:zyphera_yonetici:1464095317526839296>' },
            'ticket_basvuru': { label: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_diger': { label: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };

        const selected = typeMap[customId];
        if (!selected) return;

        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const initialEmbed = new EmbedBuilder()
            .setDescription(`**<@${user.id}> Ticket Açtığın İçin Teşekkür Ederiz Lütfen Sorununuzu Belirtin Yetkililerimiz Birazdan Geri Dönüş Sağlayacaklar Sabrınız İçin Teşekkür Ederiz
- Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Tıklayın
- Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın

\`----- Ticket Bilgileri -----\`
<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> <@${user.id}>
<:zyphera_server:1466051437086773290> Ticketin Oluşturulma Zamanı --> <t:${Math.floor(Date.now() / 1000)}:R>
<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${selected.emoji} ${selected.label}
<:zyphera_yesilraptiye:1466044628506771588> Ticketi Sahiplenen Yetkili --> \`Ticket Sahiplenilmedi\`**`)
            .setColor('Random');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('lock_ticket').setEmoji('1466044664346968309').setStyle(ButtonStyle.Danger),
        );

        const msg = await ticketChannel.send({ 
            content: `<@${user.id}> - <@&${staffRole}>`, 
            embeds: [initialEmbed], 
            components: [row] 
        });
        
        await msg.pin();
        await interaction.reply({ content: `Ticket oluşturuldu: ${ticketChannel}`, ephemeral: true });
    }

    // --- SAHİPLENME (CLAIM) ---
    if (customId === 'claim_ticket') {
        if (!interaction.member.roles.cache.has(staffRole)) {
            return interaction.reply({ content: 'Bu işlemi sadece yetkililer yapabilir.', ephemeral: true });
        }

        // İlk mesajı bul ve güncelle
        const pinnedMessages = await channel.messages.fetchPinned();
        const mainMsg = pinnedMessages.first();
        
        if (mainMsg && mainMsg.embeds[0].description.includes('Ticketi Sahiplenen Yetkili --> <@')) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('Red').setDescription('**Bu ticket zaten sahiplenilmiş!**')] ,
                ephemeral: true 
            });
        }

        // MongoDB Kayıt
        await Yetkili.findOneAndUpdate(
            { yetkiliId: user.id },
            { $inc: { toplamTicketSahiplenme: 1 } },
            { upsert: true }
        );

        // Ana Embed Güncelleme
        const editedEmbed = EmbedBuilder.from(mainMsg.embeds[0])
            .setDescription(mainMsg.embeds[0].description.replace('`Ticket Sahiplenilmedi`', `<@${user.id}>`));
        await mainMsg.edit({ embeds: [editedEmbed] });

        // Sahiplenme Mesajı
        const claimEmbed = new EmbedBuilder()
            .setColor('Green')
            .setDescription(`**Ticket <@${user.id}> Tarafından Sahiplenildi Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`);
        
        const claimRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unclaim_ticket').setEmoji('📌').setStyle(ButtonStyle.Danger)
        );

        const claimMsg = await interaction.reply({ embeds: [claimEmbed], components: [claimRow], fetchReply: true });
        await claimMsg.pin();
    }

    // --- SAHİPLENMEYİ BIRAKMA (UNCLAIM) ---
    if (customId === 'unclaim_ticket') {
        if (!interaction.member.roles.cache.has(staffRole)) return;
        
        // Sadece sahiplenen kişi bırakabilir (opsiyonel, isteğine göre)
        // if (interaction.message.description.includes(user.id)) ...

        // MongoDB -1
        await Yetkili.findOneAndUpdate({ yetkiliId: user.id }, { $inc: { toplamTicketSahiplenme: -1 } });

        // Pin Kaldır ve Mesajı Düzenle
        await interaction.message.unpin();
        
        const pinnedMessages = await channel.messages.fetchPinned();
        const mainMsg = pinnedMessages.first();
        const resetEmbed = EmbedBuilder.from(mainMsg.embeds[0])
            .setDescription(mainMsg.embeds[0].description.replace(`<@${user.id}>`, '`Ticket Sahiplenilmedi`'));
        await mainMsg.edit({ embeds: [resetEmbed] });

        const unclaimEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`**<@${user.id}> Adlı Yetkili Ticketi Sahiplenmeyi Bıraktı Ticketi Sahiplenmek İsteyen Yetkili <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`);
        
        await interaction.update({ embeds: [unclaimEmbed], components: [], components: [] });
    }

    // --- KAPATMA (LOCK) ---
    if (customId === 'lock_ticket') {
        const lockEmbed = new EmbedBuilder()
            .setTitle('Ticket Kapatılıyor')
            .setDescription(`**<@${user.id}> Ticketi Kapatmak İstiyor Musunuz? Kapatmak İçin "Onayla" Butonuna Tıklayın İşlemi İptal Etmek İçin "İptal Et" Butonuna Tıklayın**`)
            .setColor('Yellow');

        const lockRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_lock').setLabel('Onayla').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel_lock').setLabel('İptal Et').setStyle(ButtonStyle.Danger),
        );

        await interaction.reply({ embeds: [lockEmbed], components: [lockRow] });
    }

    if (customId === 'confirm_lock') {
        const closedEmbed = new EmbedBuilder()
            .setTitle('Ticket Kapatıldı')
            .setDescription(`**Ticket Kapatıldı Ticketi Geri Açmak İçin <:zyphera_unlock:1466044688908947636> Butonuna Tıklayın Ticketi Silmek İçin <:zyphera_cop:1466044646403870730> Butonuna Tıklayın**`)
            .setColor('Green');

        const closedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unlock_ticket').setEmoji('1466044688908947636').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('delete_ticket').setEmoji('1466044646403870730').setStyle(ButtonStyle.Secondary),
        );

        // İzinleri Kapat
        await channel.permissionOverwrites.edit(channel.permissionOverwrites.cache.find(po => po.type === 1 && po.id !== staffRole).id, { SendMessages: false });
        
        await interaction.update({ embeds: [closedEmbed], components: [closedRow] });
    }

    // --- SİLME ---
    if (customId === 'delete_ticket') {
        await interaction.reply({ embeds: [new EmbedBuilder().setDescription('**Ticket Saniyeler İçinde Silinecek**').setColor('Green')] });
        setTimeout(() => channel.delete(), 5000);
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

client.login(process.env.TOKEN);