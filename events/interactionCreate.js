const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // --- DEĞİŞKENLER (ENV) ---
        const STAFF_TR = process.env.STAFF_TR_ROLE_ID;
        const CAT_TR = process.env.TICKET_KATEGORI;
        const STAFF_US = process.env.STAFF_US_ROLE_ID; 
        const CAT_US = process.env.TICKET_KATEGORI_US;
        
        // --- CONFIGLER ---
        const ticketConfigUS = {
            'ticket_info_us': { label: 'Information', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet_us': { label: 'Complaint', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru_us': { label: 'Staff Application', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek_us': { label: 'Other Support', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };

        const ticketConfigTR = {
            'ticket_info': { label: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet': { label: 'Şikayet', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru': { label: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek': { label: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };

        // ==========================================
        //         🇺🇸 ENGLISH SYSTEM (US) OPEN
        // ==========================================
        if (ticketConfigUS[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = ticketConfigUS[interaction.customId];
            const timestamp = Math.floor(Date.now() / 1000);

            const existingTicket = await Ticket.findOne({ ownerID: interaction.user.id });
            if (existingTicket && interaction.guild.channels.cache.has(existingTicket.channelID)) {
                return interaction.editReply({ content: '❌ You already have an open ticket!' });
            }
            if (existingTicket) await Ticket.deleteOne({ ownerID: interaction.user.id });

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
                .setDescription(`**Thank you for opening a ticket ${interaction.user}. Our staff will be here shortly. Press <:zyphera_lock:1466044664346968309> to close.\n\n\`----- Ticket Info -----\`\nOwner --> ${interaction.user}\nOpened At --> <t:${timestamp}:R>\nCategory --> ${selected.emoji} ${selected.label}\nStatus --> \`Unclaimed\`\n\nClick <:zyphera_yesilraptiye:1466044628506771588> to claim.**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_us').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Claim').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request_us').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Close').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_US}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(`Ticket opened: ${channel}`);
        }

        // ==========================================
        //         🇹🇷 TÜRKÇE SİSTEM (TR) OPEN
        // ==========================================
        if (ticketConfigTR[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = ticketConfigTR[interaction.customId];
            const timestamp = Math.floor(Date.now() / 1000);

            const existingTicket = await Ticket.findOne({ ownerID: interaction.user.id });
            if (existingTicket && interaction.guild.channels.cache.has(existingTicket.channelID)) {
                return interaction.editReply({ content: '❌ Zaten açık bir ticket\'ın bulunuyor!' });
            }
            if (existingTicket) await Ticket.deleteOne({ ownerID: interaction.user.id });

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
                .setDescription(`**Ticket Açtığın İçin Teşekkür Ederiz ${interaction.user}. Yetkililerimiz Birazdan Burada Olacaklar. Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Basın\n\n\`----- Ticket Bilgileri -----\`\nSahibi --> ${interaction.user}\nAçılma Zamanı --> <t:${timestamp}:R>\nKategori --> ${selected.emoji} ${selected.label}\nDurum --> \`Sahiplenilmedi\`\n\nSahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın.**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_TR}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(`Ticket açıldı: ${channel}`);
        }

        // ==========================================
        //         BUTON KONTROLLERİ
        // ==========================================

        // --- CLAIM ---
        if (interaction.customId === 'claim' || interaction.customId === 'claim_us') {
            const isUS = interaction.customId.endsWith('_us'); // Buton ID'sine göre dil kontrolü
            const staffRole = isUS ? STAFF_US : STAFF_TR;
            
            // Yetki kontrolü
            if (!interaction.member.roles.cache.has(staffRole)) return interaction.reply({ content: isUS ? 'No permission!' : 'Yetkin yok!', ephemeral: true });

            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: isUS ? 'Already claimed!' : 'Zaten sahiplenilmiş!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const oldEmbed = interaction.message.embeds[0];
            const targetText = isUS ? '`Unclaimed`' : '`Sahiplenilmedi`';
            const newText = isUS ? `Claimed ( ${interaction.user} Staff )` : `Sahiplendi ( ${interaction.user} Yetkili )`;
            const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(targetText, newText));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isUS ? 'unclaim_us' : 'unclaim').setEmoji('📌').setLabel(isUS ? 'Unclaim' : 'Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(isUS ? 'close_request_us' : 'close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(isUS ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });

            // --- SAHİPLENİLDİ MESAJI ---
            // ARTIK KİŞİNİN ROLÜNE DEĞİL, BUTONUN DİLİNE (isUS) BAKIYORUZ
            const claimNotifyEmbed = new EmbedBuilder()
                .setTitle(isUS ? "Ticket Claimed" : "Ticket Sahiplenildi")
                .setDescription(isUS
                    ? `**Ticket claimed by ${interaction.user}. Click 📌 to unclaim.**`
                    : `**Ticket ${interaction.user} Tarafından Sahiplenildi. Bırakmak İçin 📌 Butonuna Tıklayın**`)
                .setColor("Green");

            interaction.channel.send({ embeds: [claimNotifyEmbed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 3000);
            });
        }

        // --- UNCLAIM ---
        if (interaction.customId === 'unclaim' || interaction.customId === 'unclaim_us') {
            const isUS = interaction.customId.endsWith('_us'); // Buton ID'sine göre dil kontrolü
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: isUS ? 'Only claimer!' : 'Sadece sahiplenen bırakabilir!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            const oldEmbed = interaction.message.embeds[0];
            const regex = isUS ? /Claimed \( <@!?\d+> Staff \)/ : /Sahiplendi \( <@!?\d+> Yetkili \)/;
            const replacement = isUS ? '`Unclaimed`' : '`Sahiplenilmedi`';
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(regex, replacement));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isUS ? 'claim_us' : 'claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(isUS ? 'Claim' : 'Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(isUS ? 'close_request_us' : 'close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(isUS ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });

            // --- BIRAKILDI MESAJI ---
            // ARTIK KİŞİNİN ROLÜNE DEĞİL, BUTONUN DİLİNE (isUS) BAKIYORUZ
            const unclaimNotifyEmbed = new EmbedBuilder()
                .setTitle(isUS ? "Ticket Unclaimed" : "Ticket Bırakıldı")
                .setDescription(isUS
                    ? `**Ticket unclaimed by ${interaction.user}. Click <:zyphera_yesilraptiye:1466044628506771588> to claim again.**`
                    : `**Ticket ${interaction.user} Tarafından Bırakıldı. Geri Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor("Red");

            interaction.channel.send({ embeds: [unclaimNotifyEmbed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 3000);
            });
        }

        // --- CLOSE REQUEST & CANCEL ---
        if (interaction.customId === 'close_request' || interaction.customId === 'close_request_us') {
            const isUS = interaction.customId.endsWith('_us');
            const yellowEmbed = new EmbedBuilder()
                .setTitle(isUS ? 'Closing Ticket' : 'Ticket Kapatılıyor')
                .setDescription(`**${interaction.user}, ${isUS ? 'want to close?' : 'Kapatmak istiyor musun?'}**`)
                .setColor('Yellow');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isUS ? 'confirm_close_us' : 'confirm_close').setLabel(isUS ? 'Confirm' : 'Onayla').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(isUS ? 'cancel_close_us' : 'cancel_close').setLabel(isUS ? 'Cancel' : 'İptal Et').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ embeds: [yellowEmbed], components: [row] });
        }

        if (interaction.customId === 'cancel_close' || interaction.customId === 'cancel_close_us') {
            const isUS = interaction.customId.endsWith('_us');
            const cancelEmbed = new EmbedBuilder().setDescription(`**${isUS ? 'Cancelled by' : 'İptal edildi:'} ${interaction.user}**`).setColor('Red');
            await interaction.update({ embeds: [cancelEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
        }

        // --- CONFIRM CLOSE ---
        if (interaction.customId === 'confirm_close' || interaction.customId === 'confirm_close_us') {
            const isUS = interaction.customId.endsWith('_us');
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            
            // --- BUG FIX: Kullanıcı sunucudan çıktıysa hata vermesin ---
            if (ticketData && ticketData.ownerID) {
                try {
                    await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });
                } catch (error) {
                    // Kullanıcı yoksa işlem devam eder
                }
            }
            // ------------------------------------------------------------

            const greenCloseEmbed = new EmbedBuilder()
                .setTitle(isUS ? 'Ticket Closed' : 'Ticket Kapatıldı')
                .setDescription(`**${isUS ? 'Closed by' : 'Kapatan:'} ${interaction.user}.**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isUS ? 'reopen_ticket_us' : 'reopen_ticket').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel(isUS ? 'Reopen' : 'Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(isUS ? 'final_delete_us' : 'final_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel(isUS ? 'Delete' : 'Sil').setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ embeds: [greenCloseEmbed], components: [row] });
        }

        // --- REOPEN ---
        if (interaction.customId === 'reopen_ticket' || interaction.customId === 'reopen_ticket_us') {
            const isUS = interaction.customId.endsWith('_us');
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });

            // --- BUG FIX: Kullanıcı sunucudan çıktıysa hata vermesin ---
            if (ticketData && ticketData.ownerID) {
                try {
                    await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });
                } catch (error) {
                    // Kullanıcı yoksa sadece devam et
                }
            }
            // ------------------------------------------------------------

            await interaction.message.delete();
            const sentReopen = await interaction.channel.send({ 
                content: ticketData ? `<@${ticketData.ownerID}>` : '', 
                embeds: [new EmbedBuilder().setTitle(isUS ? 'Reopened' : 'Ticket Geri Açıldı').setColor('Green')] 
            });
            setTimeout(() => sentReopen.delete().catch(() => {}), 2000);
        }

        // --- FINAL DELETE ---
        if (interaction.customId === 'final_delete' || interaction.customId === 'final_delete_us') {
            const isUS = interaction.customId.endsWith('_us');
            await interaction.update({ embeds: [new EmbedBuilder().setTitle(isUS ? 'Deleting' : 'Siliniyor').setDescription('**5 seconds...**').setColor('Green')], components: [] });
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};