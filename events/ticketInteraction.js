const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const StaffStats = require('../models/StaffStats');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // Terminale log basıyoruz (Çalışıp çalışmadığını anlamak için)
        console.log(`>>> Buton Algılandı: ${interaction.customId}`);

        const { customId, guild, user, member, channel } = interaction;
        
        // .env kontrolü (Eğer bunlar undefined ise bot çöker)
        const staffRoleId = process.env.STAFF_TR_ROLE_ID;
        const ticketCategory = process.env.TICKET_KATEGORI;

        if (!staffRoleId || !ticketCategory) {
            console.error("HATA: .env dosyasındaki STAFF_TR_ROLE_ID veya TICKET_KATEGORI eksik!");
            return interaction.reply({ content: "Sistem yapılandırması hatalı (.env kontrol et).", ephemeral: true });
        }

        try {
            // TICKET OLUŞTURMA
            if (customId.startsWith('create_')) {
                await interaction.deferReply({ ephemeral: true });

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: ticketCategory,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                        { id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                    topic: `Sahip: ${user.id} | Durum: Beklemede | Yetkili: Yok`
                });

                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Sahiplen').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('ticket_close').setLabel('Kilitle').setEmoji('<:zyphera_lock:1466044664346968309>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji('<:zyphera_cop:1466044646403870730>').setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ 
                    content: `<@&${staffRoleId}> | ${user}`, 
                    embeds: [new EmbedBuilder().setDescription(`Destek talebiniz açıldı. Yetkililer birazdan burada olacak.`).setColor('Blurple')],
                    components: [controlRow]
                });

                return await interaction.editReply({ content: `Kanalın açıldı: ${ticketChannel}` });
            }

            // DİĞER TICKET İŞLEMLERİ
            if (customId.startsWith('ticket_')) {
                // Yetki kontrolü
                if (!member.roles.cache.has(staffRoleId)) {
                    return interaction.reply({ content: 'Bu butonu sadece yetkililer kullanabilir!', ephemeral: true });
                }

                // ANINDA CEVAP (Interaction Failed hatasını burada öldürüyoruz)
                await interaction.deferUpdate();

                // SAHİPLENME (CLAIM)
                if (customId === 'ticket_claim') {
                    const topic = channel.topic || "";
                    if (!topic.includes("Yetkili: Yok")) return console.log("Zaten sahiplenilmiş.");

                    await StaffStats.findOneAndUpdate(
                        { userId: user.id, guildId: guild.id },
                        { $inc: { ticketCount: 1 } },
                        { upsert: true }
                    );

                    const ticketOwnerId = topic.split('|')[0].replace('Sahip:', '').trim();
                    await channel.setTopic(`Sahip: ${ticketOwnerId} | Durum: İlgileniliyor | Yetkili: ${user.id}`);

                    const claimRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('Bırak').setEmoji('📌').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket_close').setLabel('Kilitle').setEmoji('<:zyphera_lock:1466044664346968309>').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji('<:zyphera_cop:1466044646403870730>').setStyle(ButtonStyle.Danger)
                    );

                    await interaction.message.edit({ components: [claimRow] });
                    await channel.send({ content: `🛡️ Bu ticket ${user} tarafından sahiplenildi.` });
                }

                // BIRAKMA (UNCLAIM)
                if (customId === 'ticket_unclaim') {
                    const topic = channel.topic || "";
                    if (!topic.includes(user.id)) return;

                    await StaffStats.findOneAndUpdate(
                        { userId: user.id, guildId: guild.id },
                        { $inc: { ticketCount: -1 } }
                    );

                    const ticketOwnerId = topic.split('|')[0].replace('Sahip:', '').trim();
                    await channel.setTopic(`Sahip: ${ticketOwnerId} | Durum: Beklemede | Yetkili: Yok`);

                    const resetRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Sahiplen').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('ticket_close').setLabel('Kilitle').setEmoji('<:zyphera_lock:1466044664346968309>').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji('<:zyphera_cop:1466044646403870730>').setStyle(ButtonStyle.Danger)
                    );

                    await interaction.message.edit({ components: [resetRow] });
                    await channel.send({ content: `📌 Ticket sahipliği ${user} tarafından bırakıldı.` });
                }

                // SİLME
                if (customId === 'ticket_delete') {
                    await channel.send("Kanal 5 saniye içinde siliniyor...");
                    setTimeout(() => channel.delete().catch(() => {}), 5000);
                }
            }

        } catch (error) {
            console.error("BİR HATA OLUŞTU:", error);
            // Eğer daha önce cevap verilmediyse hata mesajı gönder
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ content: "İşlem sırasında bir hata oluştu!", ephemeral: true });
            }
        }
    },
};