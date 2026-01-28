// index.js
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const express = require('express'); 

// Modelleri Çağırıyoruz
const GeneralKey = require('./models/generalKeyModel');
const SubscriberKey = require('./models/subscriberKeyModel');
const StaffStats = require('./models/StaffStats'); // Ticket yetkili istatistik modeli

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

// ==========================================================
// 🌍 ROBLOX API ENDPOINT (TAM GÜVENLİK - STRICT MODE)
// ==========================================================
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

        if (scriptName) {
            if (dbKey.scriptName !== scriptName) {
                return res.json({ 
                    success: false, 
                    scriptName: dbKey.scriptName, 
                    message: `HATA: Yanlış Key! / Wrong Key!` 
                });
            }
        }

        if (keyType === 'general' && dbKey.expiresAt) {
            const now = new Date();
            if (now > dbKey.expiresAt) {
                return res.json({ success: false, message: "Key süresi dolmuş! / Key has expired!" });
            }
        }

        if (!dbKey.hwid) {
            dbKey.hwid = hwid;
            dbKey.isUsed = true;
            await dbKey.save();
        } else {
            if (dbKey.hwid !== hwid) {
                return res.json({ success: false, message: "HWID Hatası! Başka cihazda kullanılmış. / HWID Mismatch!" });
            }
        }

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

app.listen(PORT, () => {
    console.log(`🌍 Roblox API çalışıyor: Port ${PORT}`);
});

// ==========================================================
// 🤖 DISCORD BOT EVENTS
// ==========================================================
client.once('ready', async () => {
    console.log(`🤖 Giriş yapıldı: ${client.user.tag}`);
    
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ MongoDB bağlantısı başarılı.'))
        .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

    checkVoiceConnection();
    setInterval(checkVoiceConnection, 5000);

    const activities = [{ name: "👑 Zyphera #SCR1PT", type: ActivityType.Watching }];
    let i = 0;
    setInterval(() => {
        if (i >= activities.length) i = 0;
        client.user.setPresence({ activities: [activities[i]], status: 'online' });
        i++;
    }, 5000); 

    // OTOMATİK SÜRE KONTROLÜ
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
                try { member = await guild.members.fetch(keyData.ownerId); } catch (e) { member = null; }

                const isEnglish = member ? member.roles.cache.has(process.env.ROLE_ID_ENGLISH) : false;
                const ticketChannelId = isEnglish ? process.env.CHANNEL_ID_TICKET_EN : process.env.CHANNEL_ID_TICKET_TR;

                let createdTs = Math.floor(new Date(keyData.createdAt).getTime() / 1000);
                let expiresTs = Math.floor(new Date(keyData.expiresAt).getTime() / 1000);

                if (member) {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(isEnglish ? "Your Key Has Expired" : "Bir Key'iniz Süresi Doldu")
                        .setDescription(isEnglish 
                            ? `**⛓️‍💥 Expired Key --> ||\`${keyData.key}\`|| ...**` // Kısalttım ama senin orijinal description'un kalsın
                            : `**⛓️‍💥 Süresi Biten Key --> ||\`${keyData.key}\`|| ...**`)
                        .setColor('Random');
                    await member.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                if (logChannel) {
                    const logEmbed = new EmbedBuilder().setTitle('Key Süresi Bitti').setColor('Random');
                    await logChannel.send({ embeds: [logEmbed] });
                }
                await Model.deleteOne({ _id: keyData._id });
            } catch (err) { console.error(err); }
        };

        for (const key of expiredGeneral) await processExpiredKey(key, GeneralKey);
        for (const key of expiredSub) await processExpiredKey(key, SubscriberKey);
    }, 5000);
});

// ==========================================================
// 🎟️ TICKET VE KOMUT ETKİLEŞİMLERİ
// ==========================================================
client.on('interactionCreate', async interaction => {
    // --- BUTON ETKİLEŞİMLERİ ---
    if (interaction.isButton()) {
        const { customId, guild, user, channel, member } = interaction;
        const staffRole = process.env.STAFF_TR_ROLE_ID;
        const categoryId = process.env.TICKET_KATEGORI;

        // 1. Ticket Açma Butonları
        if (['ticket_info', 'ticket_sikayet', 'ticket_basvuru', 'ticket_diger'].includes(customId)) {
            await interaction.deferReply({ ephemeral: true });

            const categories = {
                ticket_info: { label: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
                ticket_sikayet: { label: 'Şikayet', emoji: '<:zyphera_yonetici:1464095317526839296>' },
                ticket_basvuru: { label: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
                ticket_diger: { label: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
            };

            const config = categories[customId];
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`**<@${user.id}> Ticket Açtığın İçin Teşekkür Ederiz Lütfen Sorununuzu Belirtin Yetkililerimiz Birazdan Geri Dönüş Sağlayacaklar Sabrınız İçin Teşekkür Ederiz
- Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Tıklayın
- Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın
\`----- Ticket Bilgileri -----\`
<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> <@${user.id}>
<:zyphera_server:1466051437086773290> Ticketin Oluşturulma Zamanı --> <t:${Math.floor(Date.now() / 1000)}:F>
<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${config.emoji} ${config.label}
<:zyphera_yesilraptiye:1466044628506771588> Ticketi Sahiplenen Yetkili --> \`Ticket Sahiplenilmedi\`**`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_lock').setEmoji('1466044664346968309').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_claim').setEmoji('1466044628506771588').setStyle(ButtonStyle.Secondary)
            );

            const msg = await ticketChannel.send({ content: `<@${user.id}> - <@&${staffRole}>`, embeds: [embed], components: [row] });
            await msg.pin();
            return interaction.editReply(`Ticket kanalın oluşturuldu: ${ticketChannel}`);
        }

        // 2. Sahiplenme
        if (customId === 'ticket_claim') {
            if (!member.roles.cache.has(staffRole)) return interaction.reply({ content: 'Sadece yetkililer sahiplenebilir!', ephemeral: true });

            await StaffStats.findOneAndUpdate({ yetkili: user.id }, { $inc: { toplam: 1 } }, { upsert: true });

            const pinnedMsgs = await channel.messages.fetchPinned();
            const mainMsg = pinnedMsgs.first();
            if (mainMsg) {
                const newEmbed = EmbedBuilder.from(mainMsg.embeds[0]).setDescription(mainMsg.embeds[0].description.replace('`Ticket Sahiplenilmedi`', `<@${user.id}>`));
                await mainMsg.edit({ embeds: [newEmbed] });
            }

            const claimEmbed = new EmbedBuilder().setColor('Green').setDescription(`**Ticket <@${user.id}> Tarafından Sahiplenildi Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`unclaim_${user.id}`).setEmoji('📌').setStyle(ButtonStyle.Danger));
            
            const cMsg = await interaction.reply({ embeds: [claimEmbed], components: [row], fetchReply: true });
            return await cMsg.pin();
        }

        // 3. Sahiplenmeyi Bırakma
        if (customId.startsWith('unclaim_')) {
            const ownerId = customId.split('_')[1];
            if (user.id !== ownerId) return interaction.reply({ content: 'Sadece sahiplenen yetkili bırakabilir!', ephemeral: true });

            await StaffStats.findOneAndUpdate({ yetkili: user.id }, { $inc: { toplam: -1 } });
            
            const pinnedMsgs = await channel.messages.fetchPinned();
            const mainMsg = pinnedMsgs.find(m => m.embeds[0]?.description.includes('Ticket Sahibi'));
            const claimMsg = pinnedMsgs.find(m => m.embeds[0]?.description.includes('Tarafından Sahiplenildi'));

            if (mainMsg) {
                const rEmbed = EmbedBuilder.from(mainMsg.embeds[0]).setDescription(mainMsg.embeds[0].description.replace(`<@${user.id}>`, '`Ticket Sahiplenilmedi`'));
                await mainMsg.edit({ embeds: [rEmbed] });
            }
            if (claimMsg) await claimMsg.unpin();

            const unclaimEmbed = new EmbedBuilder().setColor('Red').setDescription(`**<@${user.id}> Adlı Yetkili Ticketi Sahiplenmeyi Bıraktı Ticketi Sahiplenmek İsteyen Yetkili <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`);
            return interaction.reply({ embeds: [unclaimEmbed] });
        }

        // 4. Kapatma Menüsü
        if (customId === 'ticket_lock') {
            const lockEmbed = new EmbedBuilder().setTitle('Ticket Kapatılıyor').setColor('Yellow').setDescription(`**<@${user.id}> Ticketi Kapatmak İstiyor Musunuz?**`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('İptal Et').setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [lockEmbed], components: [row] });
        }

        if (customId === 'confirm_close') {
            await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
            const closedEmbed = new EmbedBuilder().setTitle('Ticket Kapatıldı').setColor('Green').setDescription(`**Ticket Kapatıldı. Yeniden açmak için <:zyphera_unlock:1466044688908947636> Silmek için <:zyphera_cop:1466044646403870730>**`);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reopen_ticket').setEmoji('1466044688908947636').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('delete_ticket').setEmoji('1466044646403870730').setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ embeds: [closedEmbed], components: [row] });
        }

        if (customId === 'cancel_close') {
            const pinnedMsgs = await channel.messages.fetchPinned();
            const claimMsg = pinnedMsgs.find(m => m.embeds[0]?.description.includes('Tarafından Sahiplenildi'));
            if (claimMsg) await claimMsg.unpin();

            const cancelEmbed = new EmbedBuilder().setColor('Red').setDescription(`**İşlem İptal Edildi**`);
            const cMsg = await interaction.update({ embeds: [cancelEmbed], components: [], fetchReply: true });
            return await cMsg.pin();
        }

        if (customId === 'reopen_ticket') {
            const reopenEmbed = new EmbedBuilder().setTitle('Ticket Yeniden Açıldı').setColor('Green').setDescription(`**<@${user.id}> Tarafından Açıldı**`);
            const msg = await interaction.reply({ embeds: [reopenEmbed], fetchReply: true });
            return await msg.pin();
        }

        if (customId === 'delete_ticket') {
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription('**Ticket Saniyeler İçinde Silinecek**').setColor('Green')] });
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // --- SLASH KOMUT ETKİLEŞİMLERİ ---
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errContent = { content: 'Komutu çalıştırırken bir hata oluştu!', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(errContent);
        else await interaction.reply(errContent);
    }
});

// SUNUCUDAN AYRILAN KİŞİ
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
            embed.setColor('Green').setDescription(`**👑 Ayrılan --> ${member} / \`${member.id}\`\n⛓️‍💥 Toplam Key --> \`${totalKeys}\`\n❗ KEYLER SİLİNDİ**`);
        } else {
            embed.setColor('Red').setDescription(`**👑 Ayrılan --> ${member}\n⛓️‍💥 Key Sayısı --> \`0\`**`);
        }
        await logChannel.send({ embeds: [embed] });
    } catch (error) { console.error(error); }
});

client.login(process.env.CLIENT_TOKEN);