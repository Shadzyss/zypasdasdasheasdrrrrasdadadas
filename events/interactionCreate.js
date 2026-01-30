const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // --- DEĞİŞKENLER ---
        const STAFF_TR = process.env.STAFF_TR_ROLE_ID;
        const CAT_TR = process.env.TICKET_KATEGORI;
        const STAFF_US = process.env.STAFF_US_ROLE_ID; 
        const CAT_US = process.env.TICKET_KATEGORI_US; 

        // ==========================================
        //        🇺🇸 ENGLISH SYSTEM (US)
        // ==========================================
        const ticketConfigUS = {
            'ticket_info_us': { label: 'Information', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet_us': { label: 'Complaint', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru_us': { label: 'Staff Application', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek_us': { label: 'Other Support', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };
        

        if (ticketConfigUS[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = ticketConfigUS[interaction.customId];
            const timestamp = Math.floor(Date.now() / 1000);

            // --- LİMİT KONTROLÜ (US) ---
            const existingTicket = await Ticket.findOne({ ownerID: interaction.user.id });
            if (existingTicket && interaction.guild.channels.cache.has(existingTicket.channelID)) {
                return interaction.reply({ content: '❌ You already have an open ticket!', ephemeral: true });
            }
            if (existingTicket) await Ticket.deleteOne({ ownerID: interaction.user.id }); // Kanal yok ama veri varsa temizle
            // --- LİMİT KONTROLÜ BİTTİ ---

            await interaction.deferReply({ ephemeral: true });

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CAT_US,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_US, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await Ticket.create({ channelID: channel.id, ownerID: interaction.user.id });

            const ticketEmbed = new EmbedBuilder()
                .setDescription(`**Thank you for opening a ticket ${interaction.user}. Our staff will be here shortly. Press <:zyphera_lock:1466044664346968309> to close.\n\n\`----- Ticket Info -----\`\n<:zyphera_blurpletac:1466051421253275791> Owner --> ${interaction.user}\n<:zyphera_server:1466051437086773290> Opened At --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> Category --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> Status --> \`Unclaimed\`\n\n<:zyphera_sagok:1464095169220448455> Click <:zyphera_yesilraptiye:1466044628506771588> to claim this ticket.**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_us').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Claim').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request_us').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Close').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_US}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(`Ticket opened: ${channel}`);
        }

        if (interaction.customId.endsWith('_us')) {
            if (interaction.customId === 'claim_us') {
                if (!interaction.member.roles.cache.has(STAFF_US)) return interaction.reply({ content: 'No permission!', ephemeral: true });
                const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
                if (ticketData?.claimerID) return interaction.reply({ content: 'Already claimed!', ephemeral: true });
                await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
                await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

                const oldEmbed = interaction.message.embeds[0];
                const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace('`Unclaimed`', `Claimed ( ${interaction.user} Staff )`));
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('unclaim_us').setEmoji('📌').setLabel('Unclaim').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('close_request_us').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Close').setStyle(ButtonStyle.Secondary)
                );
                await interaction.update({ embeds: [claimedEmbed], components: [buttons] });
                const claimNotify = new EmbedBuilder().setTitle('Ticket Claimed').setDescription(`**Claimed by ${interaction.user}.**`).setColor('Green');
                const notifyMsg = await interaction.channel.send({ embeds: [claimNotify] });
                setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
            }

            if (interaction.customId === 'unclaim_us') {
                const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
                if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: 'Only claimer!', ephemeral: true });
                await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
                await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });
                const oldEmbed = interaction.message.embeds[0];
                const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/Claimed \( <@!?\d+> Staff \)/, '`Unclaimed`'));
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_us').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close_request_us').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Close').setStyle(ButtonStyle.Secondary)
                );
                await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });
                
                // --- EKLENEN US UNCLAIM BİLDİRİMİ ---
                const unclaimNotify = new EmbedBuilder().setTitle('Claim Released').setDescription(`**Ticket claim released by ${interaction.user}**`).setColor('Green');
                const notifyMsg = await interaction.channel.send({ embeds: [unclaimNotify] });
                setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
            }

            if (interaction.customId === 'close_request_us') {
                const yellowEmbed = new EmbedBuilder().setTitle('Closing Ticket').setDescription(`**${interaction.user}, want to close?**`).setColor('Yellow');
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_close_us').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_close_us').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ embeds: [yellowEmbed], components: [row] });
            }

            if (interaction.customId === 'cancel_close_us') {
                const cancelEmbed = new EmbedBuilder().setDescription(`**Cancelled by ${interaction.user}**`).setColor('Red');
                await interaction.update({ embeds: [cancelEmbed], components: [] });
                return setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
            }

            if (interaction.customId === 'confirm_close_us') {
                const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
                await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });
                const greenCloseEmbed = new EmbedBuilder().setTitle('Ticket Closed').setDescription(`**Closed by ${interaction.user}.**`).setColor('Green');
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('reopen_ticket_us').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel('Reopen').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('final_delete_us').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel('Delete').setStyle(ButtonStyle.Danger)
                );
                return interaction.update({ embeds: [greenCloseEmbed], components: [row] });
            }

            if (interaction.customId === 'reopen_ticket_us') {
                const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
                await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });
                await interaction.message.delete();
                const sentReopen = await interaction.channel.send({ content: `<@${ticketData.ownerID}>`, embeds: [new EmbedBuilder().setTitle('Reopened').setColor('Green')] });
                return setTimeout(() => sentReopen.delete().catch(() => {}), 2000);
            }

            if (interaction.customId === 'final_delete_us') {
                await interaction.update({ embeds: [new EmbedBuilder().setTitle('Deleting').setDescription('**5 seconds...**').setColor('Green')], components: [] });
                await Ticket.deleteOne({ channelID: interaction.channel.id });
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            }
            return;
        }

        // ==========================================
        //        🇹🇷 TÜRKÇE SİSTEM (TR)
        // ==========================================
        const ticketConfig = {
            'ticket_info': { label: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet': { label: 'Şikayet', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru': { label: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek': { label: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };

        if (ticketConfig[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = ticketConfig[interaction.customId];
            const timestamp = Math.floor(Date.now() / 1000);

            // --- LİMİT KONTROLÜ (TR) ---
            const existingTicket = await Ticket.findOne({ ownerID: interaction.user.id });
            if (existingTicket && interaction.guild.channels.cache.has(existingTicket.channelID)) {
                return interaction.reply({ content: '❌ Zaten açık bir ticket\'ın bulunuyor!', ephemeral: true });
            }
            if (existingTicket) await Ticket.deleteOne({ ownerID: interaction.user.id }); // Temizlik
            // --- LİMİT KONTROLÜ BİTTİ ---

            await interaction.deferReply({ ephemeral: true });

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CAT_TR,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_TR, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await Ticket.create({ channelID: channel.id, ownerID: interaction.user.id });

            const ticketEmbed = new EmbedBuilder()
                .setDescription(`**Ticket Açtığın İçin Teşekkür Ederiz ${interaction.user} Yetkililerimiz Birazdan Burada Olacaklar Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Basın\n\n\`----- Ticket Bilgileri -----\`\n<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> ${interaction.user}\n<:zyphera_server:1466051437086773290> Ticketin Açılma Zamanı --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> Ticket Durum --> \`Sahiplenilmedi\`\n\n<:zyphera_sagok:1464095169220448455> Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_TR}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(`Ticket açıldı: ${channel}`);
        }

        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(STAFF_TR)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: 'Zaten sahiplenilmiş!', ephemeral: true });
            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const oldEmbed = interaction.message.embeds[0];
            const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace('`Sahiplenilmedi`', `Sahiplendi ( ${interaction.user} Yetkili )`));
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim').setEmoji('📌').setLabel('Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });
            const claimNotify = new EmbedBuilder().setTitle('Ticket Sahiplenildi').setDescription(`**Ticket ${interaction.user} Tarafından Sahiplenildi**`).setColor('Green');
            const notifyMsg = await interaction.channel.send({ embeds: [claimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        if (interaction.customId === 'unclaim') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: 'Sadece sahiplenen bırakabilir!', ephemeral: true });
            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });
            const oldEmbed = interaction.message.embeds[0];
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/Sahiplendi \( <@!?\d+> Yetkili \)/, '`Sahiplenilmedi`'));
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });
            const unclaimNotify = new EmbedBuilder().setTitle('Ticket Sahiplenmesi Bırakıldı').setDescription(`**Ticket Sahipliği ${interaction.user} Tarafından Bırakıldı**`).setColor('Green');
            const notifyMsg = await interaction.channel.send({ embeds: [unclaimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        if (interaction.customId === 'close_request') {
            const yellowEmbed = new EmbedBuilder().setTitle('Ticket Kapatılıyor').setDescription(`**${interaction.user} Ticketi Kapatmak İstiyor Musun?**`).setColor('Yellow');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Onayla').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('İptal Et').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [yellowEmbed], components: [row] });
        }

        if (interaction.customId === 'cancel_close') {
            const cancelEmbed = new EmbedBuilder().setDescription(`**İşlem ${interaction.user} Tarafından İptal Edildi**`).setColor('Red');
            await interaction.update({ embeds: [cancelEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
        }

        if (interaction.customId === 'confirm_close') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });
            const greenCloseEmbed = new EmbedBuilder().setTitle('Ticket Kapatıldı').setDescription(`**Ticket ${interaction.user} Adlı Kişi Tarafından Kapatıldı.**`).setColor('Green');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reopen_ticket').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel('Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('final_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel('Sil').setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [greenCloseEmbed], components: [row] });
        }

        if (interaction.customId === 'reopen_ticket') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });
            await interaction.message.delete(); 
            const sentReopen = await interaction.channel.send({ content: `<@${ticketData.ownerID}>`, embeds: [new EmbedBuilder().setTitle('Ticket Geri Açıldı').setColor('Green')] });
            setTimeout(() => sentReopen.delete().catch(() => {}), 2000);
        }

        if (interaction.customId === 'final_delete') {
            const deleteEmbed = new EmbedBuilder().setTitle('Ticket Siliniyor').setDescription('**Ticket 5 Saniye İçinde Silinecek**').setColor('Green');
            await interaction.update({ embeds: [deleteEmbed], components: [] });
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};