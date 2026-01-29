const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // ID Tanımlamaları
        const STAFF_ROLE = process.env.STAFF_TR_ROLE_ID;
        const CATEGORY = process.env.TICKET_KATEGORI;

        // --- BUTON VE MENU KONTROLÜ ---
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        // 1. TICKET AÇMA (Panelden seçim yapıldığında)
        const customIds = ['ticket_info', 'ticket_sikayet', 'ticket_basvuru', 'ticket_destek'];
        if (customIds.includes(interaction.customId) || (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select')) {
            await interaction.deferReply({ ephemeral: true });

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CATEGORY,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await Ticket.create({ channelID: channel.id, ownerID: interaction.user.id });

            const embed = new EmbedBuilder()
                .setTitle('Zyphera Destek Talebi')
                .setDescription(`Hoş geldin ${interaction.user}! Talebin oluşturuldu.\n\n**Durum:** 🔓 Sahiplenilmedi`)
                .setColor('Blurple')
                .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );

            await channel.send({ content: `<@&${STAFF_ROLE}> | ${interaction.user}`, embeds: [embed], components: [buttons] });
            return interaction.editReply(`Kanal açıldı: ${channel}`);
        }

        // 2. TICKET SAHİPLENME (CLAIM)
        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE)) return interaction.reply({ content: 'Bunu sadece yetkililer yapabilir!', ephemeral: true });

            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: 'Zaten sahiplenilmiş!', ephemeral: true });

            // DB Güncelle ve Puan Ver
            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(interaction.message.embeds[0].description.replace('🔓 Sahiplenilmedi', `✅ Sahiplenen: ${interaction.user}`))
                .setColor('Green');

            const newButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim').setEmoji('📌').setLabel('Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('close').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({ embeds: [newEmbed], components: [newButtons] });
        }

        // 3. SAHİPLİĞİ BIRAKMA (UNCLAIM)
        if (interaction.customId === 'unclaim') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: 'Sadece sahiplenen kişi bırakabilir!', ephemeral: true });

            // DB Güncelle ve Puan Sil
            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            const resetEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(interaction.message.embeds[0].description.replace(/✅ Sahiplenen: <@!?\d+>/, '🔓 Sahiplenilmedi'))
                .setColor('Blurple');

            const resetButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({ embeds: [resetEmbed], components: [resetButtons] });
        }

        // 4. KAPATMA VE SİLME (Basitçe)
        if (interaction.customId === 'close') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel('Kanalı Sil').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ content: 'Ticket kapatıldı, silmek ister misin?', components: [row] });
        }

        if (interaction.customId === 'delete') {
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            await interaction.channel.delete();
        }
    },
};