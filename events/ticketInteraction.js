const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const StaffStats = require('../models/StaffStats'); // Model yolunu kendine göre ayarla

// Emojiler
const EMOJIS = {
    info: '<:zyphera_info:1466034688903610471>',
    complaint: '<:zyphera_kalkan:1466034432183111761>',
    apply: '<a:zyphera_parca:1464095414201352254>',
    other: '<a:zyphera_yukleniyor:1464095331863101514>',
    lock: '<:zyphera_lock:1466044664346968309>',
    unlock: '<:zyphera_unlock:1466044688908947636>',
    delete: '<:zyphera_cop:1466044646403870730>',
    claim: '<:zyphera_yesilraptiye:1466044628506771588>',
    unclaim: '📌'
};

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, member } = interaction;
        const staffRoleId = process.env.STAFF_TR_ROLE_ID;
        const ticketCategory = process.env.TICKET_KATEGORI;

        // --- 1. TICKET OLUŞTURMA İŞLEMLERİ ---
        if (['create_info', 'create_complaint', 'create_apply', 'create_other'].includes(customId)) {
            await interaction.deferReply({ ephemeral: true });

            const channelName = `ticket-${user.username}`;
            
            try {
                // Kanalı oluştur
                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: ticketCategory,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                    // Topic'i veritabanı gibi kullanıyoruz: Sahip ID ve Yetkili ID burada tutulacak
                    topic: `Sahip: ${user.id} | Durum: Beklemede | Yetkili: Yok`
                });

                // Kontrol Butonları
                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Sahiplen').setEmoji(EMOJIS.claim).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('ticket_close').setLabel('Kilitle').setEmoji(EMOJIS.lock).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji(EMOJIS.delete).setStyle(ButtonStyle.Danger)
                );

                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(`Merhaba ${user}, destek talebiniz oluşturuldu.\nYetkililer en kısa sürede ilgilenecektir.\n\n**Konu:** ${customId.replace('create_', '').toUpperCase()}`)
                    .setColor('Green');

                await channel.send({ content: `<@&${staffRoleId}> | ${user}`, embeds: [welcomeEmbed], components: [controlRow] });
                await interaction.editReply({ content: `Ticket oluşturuldu: ${channel}` });

            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: 'Ticket kanalı oluşturulurken bir hata oluştu.' });
            }
        }

        // --- 2. TICKET SAHİPLENME (CLAIM) ---
        if (customId === 'ticket_claim') {
            if (!member.roles.cache.has(staffRoleId)) {
                return interaction.reply({ content: 'Bu butonu sadece yetkililer kullanabilir!', ephemeral: true });
            }

            const topic = interaction.channel.topic || "";
            // Eğer topic içinde "Yetkili: <@" veya bir ID varsa zaten alınmıştır. "Yetkili: Yok" ise alınabilir.
            if (!topic.includes("Yetkili: Yok")) {
                return interaction.reply({ content: 'Bu ticket zaten sahiplenilmiş!', ephemeral: true });
            }

            // MongoDB: Sayı Arttır (+1)
            await StaffStats.findOneAndUpdate(
                { userId: user.id, guildId: guild.id },
                { $inc: { ticketCount: 1 } },
                { upsert: true, new: true }
            );

            // Kanal Açıklamasını Güncelle
            const ticketOwnerId = topic.split('|')[0].replace('Sahip:', '').trim();
            await interaction.channel.setTopic(`Sahip: ${ticketOwnerId} | Durum: İlgileniliyor | Yetkili: ${user.id}`);

            // Butonları Güncelle (Sahiplen yerine Bırak butonu koy)
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('Bırak').setEmoji(EMOJIS.unclaim).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Kilitle').setEmoji(EMOJIS.lock).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji(EMOJIS.delete).setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder().setDescription(`Bu ticket ${user} tarafından sahiplenildi! ${EMOJIS.claim}`).setColor('Green');
            await interaction.message.edit({ components: [newRow] });
            await interaction.reply({ embeds: [embed] });
        }

        // --- 3. SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (customId === 'ticket_unclaim') {
            if (!member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });

            const topic = interaction.channel.topic || "";
            
            // Sadece sahiplenen kişi bırakabilir
            if (!topic.includes(user.id)) {
                 return interaction.reply({ content: 'Bu ticketi sen sahiplenmedin, bırakamazsın!', ephemeral: true });
            }

            // MongoDB: Sayı Eksilt (-1)
            await StaffStats.findOneAndUpdate(
                { userId: user.id, guildId: guild.id },
                { $inc: { ticketCount: -1 } },
                { upsert: true }
            );

            // Kanal Açıklamasını Sıfırla
            const ticketOwnerId = topic.split('|')[0].replace('Sahip:', '').trim();
            await interaction.channel.setTopic(`Sahip: ${ticketOwnerId} | Durum: Beklemede | Yetkili: Yok`);

            // Butonları Eski Haline Getir
            const resetRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Sahiplen').setEmoji(EMOJIS.claim).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Kilitle').setEmoji(EMOJIS.lock).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji(EMOJIS.delete).setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder().setDescription(`${user} ticket sahipliğini bıraktı. ${EMOJIS.unclaim}`).setColor('Orange');
            await interaction.message.edit({ components: [resetRow] });
            await interaction.reply({ embeds: [embed] });
        }

        // --- 4. TICKET KAPATMA/AÇMA/SİLME ---
        if (customId === 'ticket_close') {
            if (!member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            
            const topic = interaction.channel.topic || "";
            const ticketOwnerId = topic.split('|')[0].replace('Sahip:', '').trim();

            await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { ViewChannel: false });

            const lockRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_open').setLabel('Aç').setEmoji(EMOJIS.unlock).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_delete').setLabel('Sil').setEmoji(EMOJIS.delete).setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ content: `Ticket kapatıldı ${EMOJIS.lock}.` });
            await interaction.message.edit({ components: [lockRow] });
        }

        if (customId === 'ticket_open') {
            if (!member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            const topic = interaction.channel.topic || "";
            const ticketOwnerId = topic.split('|')[0].replace('Sahip:', '').trim();

            await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { ViewChannel: true });
            await interaction.reply({ content: `Ticket tekrar açıldı ${EMOJIS.unlock}.` });
            // Not: Buradan sonra butonları tekrar claim/unclaim durumuna göre düzeltmek gerekebilir ama basitleştirilmiş haliyle bırakıyorum.
        }

        if (customId === 'ticket_delete') {
            if (!member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            await interaction.reply(`Ticket siliniyor... ${EMOJIS.delete}`);
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    },
};