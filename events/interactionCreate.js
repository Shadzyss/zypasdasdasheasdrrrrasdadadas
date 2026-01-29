const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // .env'den ID'leri çekiyoruz
        const ROLE_EN = process.env.ROLE_ID_ENGLISH;
        const ROLE_TR = process.env.ROLE_ID_TURKISH;
        const CAT_TR = process.env.TICKET_KATEGORI;
        const CAT_EN = process.env.TICKET_KATEGORI_US;

        // DİL KONTROLÜ: Buton ID'si _en ile bitiyorsa veya kullanıcıda EN rolü varsa İngilizce, yoksa Türkçe.
        let isEn = false;
        if (interaction.customId.endsWith('_en') || (ROLE_EN && interaction.member.roles.cache.has(ROLE_EN))) {
            isEn = true;
        }

        const STAFF_ROLE = isEn ? ROLE_EN : ROLE_TR;
        const CATEGORY_ID = isEn ? CAT_EN : CAT_TR;

        // --- 1. TICKET AÇMA ---
        const ticketConfig = {
            'ticket_info': { label: isEn ? 'Information' : 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet': { label: isEn ? 'Complaint' : 'Şikayet', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru': { label: isEn ? 'Staff Application' : 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek': { label: isEn ? 'Other' : 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };

        const cleanId = interaction.customId.replace('_en', '');

        if (ticketConfig[cleanId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = ticketConfig[cleanId];
            const timestamp = Math.floor(Date.now() / 1000);

            const channel = await interaction.guild.channels.create({
                name: `${isEn ? 'ticket' : 'talep'}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await Ticket.create({ channelID: channel.id, ownerID: interaction.user.id });

            const ticketEmbed = new EmbedBuilder()
                .setDescription(isEn 
                    ? `**Thanks for opening a ticket ${interaction.user}. Staff will be here shortly. Press <:zyphera_lock:1466044664346968309> to close.\n\n\`----- Ticket Info -----\`\n<:zyphera_blurpletac:1466051421253275791> Owner --> ${interaction.user}\n<:zyphera_server:1466051437086773290> Opened At --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> Category --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> Status --> \`Unclaimed\`\n\n<:zyphera_sagok:1464095169220448455> Click <:zyphera_yesilraptiye:1466044628506771588> to claim this ticket.**`
                    : `**Ticket Açtığın İçin Teşekkür Ederiz ${interaction.user} Yetkililerimiz Birazdan Burada Olacaklar Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Basın\n\n\`----- Ticket Bilgileri -----\`\n<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> ${interaction.user}\n<:zyphera_server:1466051437086773290> Ticketin Açılma Zamanı --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> Ticket Durum --> \`Sahiplenilmedi\`\n\n<:zyphera_sagok:1464095169220448455> Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(isEn ? 'Claim' : 'Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(isEn ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_ROLE}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(isEn ? `Ticket opened: ${channel}` : `Ticket açıldı: ${channel}`);
        }

        // --- 2. SAHİPLENME (CLAIM) ---
        if (interaction.customId === 'claim') {
            const channelIsEn = interaction.channel.parentId === CAT_EN;
            if (!interaction.member.roles.cache.has(STAFF_ROLE)) return interaction.reply({ content: channelIsEn ? 'No permission!' : 'Yetkin yok!', ephemeral: true });
            
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: channelIsEn ? 'Already claimed!' : 'Zaten sahiplenilmiş!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const oldEmbed = interaction.message.embeds[0];
            const claimText = channelIsEn ? `Claimed ( ${interaction.user} )` : `Sahiplendi ( ${interaction.user} Yetkili )`;
            const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/`Sahiplenilmedi`|`Unclaimed`/, claimText));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim').setEmoji('📌').setLabel(channelIsEn ? 'Unclaim' : 'Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(channelIsEn ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });

            const claimNotify = new EmbedBuilder()
                .setTitle(channelIsEn ? 'Ticket Claimed' : 'Ticket Sahiplenildi')
                .setDescription(channelIsEn ? `**Claimed by ${interaction.user}**` : `**Ticket ${interaction.user} Tarafından Sahiplenildi**`)
                .setColor('Green');
            
            const notifyMsg = await interaction.channel.send({ embeds: [claimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        // --- 3. SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (interaction.customId === 'unclaim') {
            const channelIsEn = interaction.channel.parentId === CAT_EN;
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: channelIsEn ? 'Only the claimer can release!' : 'Sadece sahiplenen bırakabilir!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            const oldEmbed = interaction.message.embeds[0];
            const unclaimText = channelIsEn ? '`Unclaimed`' : '`Sahiplenilmedi`';
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/Sahiplendi \( <@!?\d+> Yetkili \)|Claimed \( <@!?\d+> \)/, unclaimText));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(channelIsEn ? 'Claim' : 'Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(channelIsEn ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });
        }

        // --- 4. KAPATMA ONAYI (SARI) ---
        if (interaction.customId === 'close_request') {
            const channelIsEn = interaction.channel.parentId === CAT_EN;
            const yellowEmbed = new EmbedBuilder()
                .setTitle(channelIsEn ? 'Closing Ticket' : 'Ticket Kapatılıyor')
                .setDescription(channelIsEn ? `**${interaction.user}, do you want to close this ticket?**` : `**${interaction.user} Ticketi Kapatmak İstiyor Musun?**`)
                .setColor('Yellow');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel(channelIsEn ? 'Confirm' : 'Onayla').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel(channelIsEn ? 'Cancel' : 'İptal Et').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [yellowEmbed], components: [row] });
        }

        // --- 5. İPTAL ET ---
        if (interaction.customId === 'cancel_close') {
            await interaction.message.delete().catch(() => {});
        }

        // --- 6. ONAYLA (KAPAT) ---
        if (interaction.customId === 'confirm_close') {
            const channelIsEn = interaction.channel.parentId === CAT_EN;
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData) await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });

            const greenCloseEmbed = new EmbedBuilder()
                .setTitle(channelIsEn ? 'Ticket Closed' : 'Ticket Kapatıldı')
                .setDescription(channelIsEn ? `**Closed by ${interaction.user}.**` : `**Ticket ${interaction.user} Tarafından Kapatıldı.**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reopen_ticket').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel(channelIsEn ? 'Reopen' : 'Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('final_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel(channelIsEn ? 'Delete' : 'Sil').setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [greenCloseEmbed], components: [row] });
        }

        // --- 7. GERİ AÇ ---
        if (interaction.customId === 'reopen_ticket') {
            const channelIsEn = interaction.channel.parentId === CAT_EN;
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });
            
            await interaction.message.delete();
            const sentReopen = await interaction.channel.send({ content: `<@${ticketData.ownerID}>`, embeds: [new EmbedBuilder().setTitle(channelIsEn ? 'Ticket Reopened' : 'Ticket Geri Açıldı').setColor('Green')] });
            setTimeout(() => sentReopen.delete().catch(() => {}), 2000);
        }

        // --- 8. FİNAL SİLME ---
        if (interaction.customId === 'final_delete') {
            const channelIsEn = interaction.channel.parentId === CAT_EN;
            await interaction.update({ embeds: [new EmbedBuilder().setDescription(channelIsEn ? 'Deleting...' : 'Siliniyor...').setColor('Green')], components: [] });
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};