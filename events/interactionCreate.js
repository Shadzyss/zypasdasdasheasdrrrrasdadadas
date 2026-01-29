const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // Dil kontrolü: Buton ID'si '_en' ile bitiyorsa İngilizce, bitmiyorsa Türkçe
        const lang = interaction.customId.endsWith('_en') ? 'en' : 'tr';
        const isEn = lang === 'en';

        // Rol ve Kategori Ayarları
        const STAFF_ROLE = isEn ? process.env.ROLE_ID_ENGLISH : process.env.ROLE_ID_TURKISH;
        const CATEGORY_ID = isEn ? process.env.TICKET_KATEGORI_US : process.env.TICKET_KATEGORI;

        // --- 1. TICKET AÇMA ---
        const ticketConfig = {
            // Türkçe ID'ler
            'ticket_info': { label: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet': { label: 'Şikayet', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru': { label: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek': { label: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' },
            // İngilizce ID'ler
            'ticket_info_en': { label: 'Information', emoji: '<:zyphera_info:1466034688903610471>' },
            'ticket_sikayet_en': { label: 'Complaint', emoji: '<:zyphera_kalkan:1466034432183111761>' },
            'ticket_basvuru_en': { label: 'Application', emoji: '<a:zyphera_parca:1464095414201352254>' },
            'ticket_destek_en': { label: 'Support', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
        };

        if (ticketConfig[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = ticketConfig[interaction.customId];
            const timestamp = Math.floor(Date.now() / 1000);

            // ÖZEL KANAL OLUŞTURMA
            const channel = await interaction.guild.channels.create({
                name: `${isEn ? 'ticket' : 'talep'}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Herkese Gizle
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await Ticket.create({ channelID: channel.id, ownerID: interaction.user.id });

            const ticketEmbed = new EmbedBuilder()
                .setDescription(isEn 
                    ? `**Thanks for opening a ticket ${interaction.user}. Staff will be with you shortly. Press <:zyphera_lock:1466044664346968309> to close.\n\n\`----- Ticket Info -----\`\nOwner --> ${interaction.user}\nOpened --> <t:${timestamp}:R>\nCategory --> ${selected.emoji} ${selected.label}\nStatus --> \`Unclaimed\`\n\nClick <:zyphera_yesilraptiye:1466044628506771588> to claim this ticket.**`
                    : `**Ticket Açtığın İçin Teşekkür Ederiz ${interaction.user} Yetkililerimiz Birazdan Burada Olacaklar Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Basın\n\n\`----- Ticket Bilgileri -----\`\n<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> ${interaction.user}\n<:zyphera_server:1466051437086773290> Ticketin Açılma Zamanı --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> Ticket Durum --> \`Sahiplenilmedi\`\n\n<:zyphera_sagok:1464095169220448455> Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor('Green');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isEn ? 'claim_en' : 'claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(isEn ? 'Claim' : 'Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(isEn ? 'close_request_en' : 'close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(isEn ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_ROLE}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(isEn ? `Ticket opened: ${channel}` : `Ticket açıldı: ${channel}`);
        }

        // --- 2. SAHİPLENME (CLAIM) ---
        if (interaction.customId === 'claim' || interaction.customId === 'claim_en') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE)) return interaction.reply({ content: isEn ? 'No permission!' : 'Yetkin yok!', ephemeral: true });
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: isEn ? 'Already claimed!' : 'Zaten sahiplenilmiş!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const oldEmbed = interaction.message.embeds[0];
            const claimedText = isEn ? `Claimed ( ${interaction.user} )` : `Sahiplendi ( ${interaction.user} Yetkili )`;
            const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(isEn ? '`Unclaimed`' : '`Sahiplenilmedi`', claimedText));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isEn ? 'unclaim_en' : 'unclaim').setEmoji('📌').setLabel(isEn ? 'Unclaim' : 'Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(isEn ? 'close_request_en' : 'close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(isEn ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });

            const claimNotify = new EmbedBuilder()
                .setTitle(isEn ? 'Ticket Claimed' : 'Ticket Sahiplenildi')
                .setDescription(isEn ? `**Ticket claimed by ${interaction.user}**` : `**Ticket ${interaction.user} Tarafından Sahiplenildi Sahipliği Bırakmak 📌 Butonuna Tıklayın**`)
                .setColor('Green');
            
            const notifyMsg = await interaction.channel.send({ embeds: [claimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        // --- 3. SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (interaction.customId === 'unclaim' || interaction.customId === 'unclaim_en') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: isEn ? 'Only the claimer can do this!' : 'Sadece sahiplenen bırakabilir!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            const oldEmbed = interaction.message.embeds[0];
            const unclaimText = isEn ? '`Unclaimed`' : '`Sahiplenilmedi`';
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/Sahiplendi \( <@!?\d+> Yetkili \)|Claimed \( <@!?\d+> \)/, unclaimText));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isEn ? 'claim_en' : 'claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(isEn ? 'Claim' : 'Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(isEn ? 'close_request_en' : 'close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(isEn ? 'Close' : 'Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });

            const unclaimNotify = new EmbedBuilder()
                .setTitle(isEn ? 'Claim Released' : 'Ticket Sahiplenmesi Bırakıldı')
                .setDescription(isEn ? `**Ticket claim released by ${interaction.user}**` : `**Ticket Sahipliği ${interaction.user} Tarafından Bırakıldı**`)
                .setColor('Green');

            const notifyMsg = await interaction.channel.send({ embeds: [unclaimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        // --- 4. KAPATMA ONAYI (SARI) ---
        if (interaction.customId === 'close_request' || interaction.customId === 'close_request_en') {
            const yellowEmbed = new EmbedBuilder()
                .setTitle(isEn ? 'Closing Ticket' : 'Ticket Kapatılıyor')
                .setDescription(isEn ? `**${interaction.user}, do you want to close this ticket?**` : `**${interaction.user} Ticketi Kapatmak İstiyor Musun?**`)
                .setColor('Yellow');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isEn ? 'confirm_close_en' : 'confirm_close').setLabel(isEn ? 'Confirm' : 'Onayla').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(isEn ? 'cancel_close_en' : 'cancel_close').setLabel(isEn ? 'Cancel' : 'İptal Et').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [yellowEmbed], components: [row] });
        }

        // --- 5. İPTAL ET BUTONU ---
        if (interaction.customId === 'cancel_close' || interaction.customId === 'cancel_close_en') {
            const cancelEmbed = new EmbedBuilder().setDescription(isEn ? `**Cancelled by ${interaction.user}**` : `**İşlem ${interaction.user} Tarafından İptal Edildi**`).setColor('Red');
            await interaction.update({ embeds: [cancelEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
        }

        // --- 6. ONAYLA (KAPAT) ---
        if (interaction.customId === 'confirm_close' || interaction.customId === 'confirm_close_en') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });

            const greenCloseEmbed = new EmbedBuilder()
                .setTitle(isEn ? 'Ticket Closed' : 'Ticket Kapatıldı')
                .setDescription(isEn ? `**Ticket closed by ${interaction.user}.**` : `**Ticket ${interaction.user} Tarafından Kapatıldı.**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isEn ? 'reopen_ticket_en' : 'reopen_ticket').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel(isEn ? 'Reopen' : 'Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(isEn ? 'final_delete_en' : 'final_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel(isEn ? 'Delete' : 'Sil').setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [greenCloseEmbed], components: [row] });
        }

        // --- 7. GERİ AÇ BUTONU ---
        if (interaction.customId === 'reopen_ticket' || interaction.customId === 'reopen_ticket_en') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });
            await interaction.message.delete(); 
            const sentReopen = await interaction.channel.send({ content: `<@${ticketData.ownerID}>`, embeds: [new EmbedBuilder().setTitle(isEn ? 'Ticket Reopened' : 'Ticket Geri Açıldı').setColor('Green')] });
            setTimeout(() => sentReopen.delete().catch(() => {}), 2000);
        }

        // --- 8. FİNAL SİLME ---
        if (interaction.customId === 'final_delete' || interaction.customId === 'final_delete_en') {
            await interaction.update({ embeds: [new EmbedBuilder().setDescription(isEn ? 'Deleting in 5s...' : '5 saniye içinde siliniyor...').setColor('Green')], components: [] });
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};