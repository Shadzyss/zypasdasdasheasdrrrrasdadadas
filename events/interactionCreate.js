const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const lang = interaction.customId.endsWith('_en') ? 'en' : 'tr';
        const isEn = lang === 'en';

        // Roller ve Kategoriler (.env'den çekiliyor)
        const STAFF_ROLE = isEn ? process.env.ROLE_ID_ENGLISH : process.env.ROLE_ID_TURKISH;
        const CATEGORY_ID = isEn ? process.env.TICKET_KATEGORI_US : process.env.TICKET_KATEGORI;

        // --- 1. TICKET AÇMA ---
        const config = {
            tr: {
                'ticket_info_tr': { label: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
                'ticket_sikayet_tr': { label: 'Şikayet', emoji: '<:zyphera_kalkan:1466034432183111761>' },
                'ticket_basvuru_tr': { label: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
                'ticket_destek_tr': { label: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' },
                welcome: "Ticket Açtığın İçin Teşekkür Ederiz",
                staffWait: "Yetkililerimiz Birazdan Burada Olacaklar",
                closeInfo: "Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Basın",
                infoTitle: "Ticket Bilgileri",
                owner: "Ticket Sahibi",
                time: "Ticketin Açılma Zamanı",
                cat: "Ticket Kategorisi",
                status: "Ticket Durum",
                unclaim: "`Sahiplenilmedi`",
                claimPrompt: "Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın",
                claimBtn: "Sahiplen",
                closeBtn: "Kapat"
            },
            en: {
                'ticket_info_en': { label: 'Information', emoji: '<:zyphera_info:1466034688903610471>' },
                'ticket_sikayet_en': { label: 'Complaint', emoji: '<:zyphera_kalkan:1466034432183111761>' },
                'ticket_basvuru_en': { label: 'Application', emoji: '<a:zyphera_parca:1464095414201352254>' },
                'ticket_destek_en': { label: 'Support', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' },
                welcome: "Thanks for opening a ticket",
                staffWait: "Our staff will be here shortly",
                closeInfo: "Press <:zyphera_lock:1466044664346968309> to close the ticket",
                infoTitle: "Ticket Information",
                owner: "Ticket Owner",
                time: "Opened at",
                cat: "Category",
                status: "Status",
                unclaim: "`Unclaimed`",
                claimPrompt: "Click <:zyphera_yesilraptiye:1466044628506771588> to claim this ticket",
                claimBtn: "Claim",
                closeBtn: "Close"
            }
        };

        const t = config[lang];
        const selected = t[interaction.customId];

        if (selected) {
            await interaction.deferReply({ ephemeral: true });
            const timestamp = Math.floor(Date.now() / 1000);

            const channel = await interaction.guild.channels.create({
                name: `${lang}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await Ticket.create({ channelID: channel.id, ownerID: interaction.user.id, lang: lang });

            const ticketEmbed = new EmbedBuilder()
                .setDescription(`**${t.welcome} ${interaction.user}\n${t.staffWait}\n${t.closeInfo}\n\n\`----- ${t.infoTitle} -----\`\n<:zyphera_blurpletac:1466051421253275791> ${t.owner} --> ${interaction.user}\n<:zyphera_server:1466051437086773290> ${t.time} --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> ${t.cat} --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> ${t.status} --> ${t.unclaim}\n\n<:zyphera_sagok:1464095169220448455> ${t.claimPrompt}**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`claim_${lang}`).setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(t.claimBtn).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`close_request_${lang}`).setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(t.closeBtn).setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_ROLE}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(isEn ? `Ticket opened: ${channel}` : `Kanal açıldı: ${channel}`);
        }

        // --- 2. SAHİPLENME (CLAIM) ---
        if (interaction.customId.startsWith('claim_')) {
            if (!interaction.member.roles.cache.has(STAFF_ROLE)) return interaction.reply({ content: isEn ? 'No permission!' : 'Yetkin yok!', ephemeral: true });
            
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: isEn ? 'Already claimed!' : 'Zaten sahiplenilmiş!', ephemeral: true });

            await Ticket.updateOne({ channelID: interaction.channel.id }, { $set: { claimerID: interaction.user.id } });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const oldEmbed = interaction.message.embeds[0];
            const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(t.unclaim, isEn ? `Claimed ( ${interaction.user} Staff )` : `Sahiplendi ( ${interaction.user} Yetkili )`));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`unclaim_${lang}`).setEmoji('📌').setLabel(isEn ? 'Unclaim' : 'Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`close_request_${lang}`).setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(t.closeBtn).setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });

            const notify = new EmbedBuilder().setTitle(isEn ? 'Ticket Claimed' : 'Ticket Sahiplenildi').setDescription(isEn ? `**Ticket claimed by ${interaction.user}**` : `**Ticket ${interaction.user} Tarafından Sahiplenildi**`).setColor('Green');
            const nm = await interaction.channel.send({ embeds: [notify] });
            setTimeout(() => nm.delete().catch(() => {}), 3000);
        }

        // --- 3. SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (interaction.customId.startsWith('unclaim_')) {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: isEn ? 'Only the claimer can unclaim!' : 'Sadece sahiplenen bırakabilir!', ephemeral: true });

            await Ticket.updateOne({ channelID: interaction.channel.id }, { $set: { claimerID: null } });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            const oldEmbed = interaction.message.embeds[0];
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/Sahiplendi \( <@!?\d+> Yetkili \)|Claimed \( <@!?\d+> Staff \)/, t.unclaim));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`claim_${lang}`).setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel(t.claimBtn).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`close_request_${lang}`).setEmoji('<:zyphera_lock:1466044664346968309>').setLabel(t.closeBtn).setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });

            const notify = new EmbedBuilder().setTitle(isEn ? 'Ticket Unclaimed' : 'Ticket Sahipliği Bırakıldı').setDescription(isEn ? `**Ticket unclaim by ${interaction.user}**` : `**Ticket Sahipliği ${interaction.user} Tarafından Bırakıldı**`).setColor('Green');
            const nm = await interaction.channel.send({ embeds: [notify] });
            setTimeout(() => nm.delete().catch(() => {}), 3000);
        }

        // --- 4. KAPATMA İSTEĞİ (SARI) ---
        if (interaction.customId.startsWith('close_request_')) {
            const yellowEmbed = new EmbedBuilder()
                .setTitle(isEn ? 'Ticket Closing' : 'Ticket Kapatılıyor')
                .setDescription(isEn ? `**${interaction.user} Wants to close. Click "Confirm" to close, "Cancel" to stop.**` : `**${interaction.user} Ticketi Kapatmak İstiyor Musun Kapatmak İçin "Onayla" Butonuna Tıklayın Ticketi Kapatmak İstemiyorsan "İptal Et" Butonuna Tıklayın**`)
                .setColor('Yellow');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`confirm_close_${lang}`).setLabel(isEn ? 'Confirm' : 'Onayla').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`cancel_close_${lang}`).setLabel(isEn ? 'Cancel' : 'İptal Et').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [yellowEmbed], components: [row] });
        }

        // --- 5. İPTAL ET (KIRMIZI + 2 SN) ---
        if (interaction.customId.startsWith('cancel_close_')) {
            const cancelEmbed = new EmbedBuilder().setDescription(isEn ? `**Action cancelled by ${interaction.user}**` : `**İşlem ${interaction.user} Tarafından İptal Edildi**`).setColor('Red');
            await interaction.update({ embeds: [cancelEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
        }

        // --- 6. ONAYLA (KAPATMA) ---
        if (interaction.customId.startsWith('confirm_close_')) {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });

            const greenCloseEmbed = new EmbedBuilder()
                .setTitle(isEn ? 'Ticket Closed' : 'Ticket Kapatıldı')
                .setDescription(isEn ? `**Ticket closed by ${interaction.user}. Click <:zyphera_unlock:1466044688908947636> to reopen or <:zyphera_cop:1466044646403870730> to delete.**` : `**Ticket ${interaction.user} Adlı Kişi Tarafından Kapatıldı Ticketi Yeniden Açmak İçin <:zyphera_unlock:1466044688908947636> Butonuna Tıklayın Ticketı Silmek İçin <:zyphera_cop:1466044646403870730> Butonuna Basın**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`reopen_ticket_${lang}`).setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel(isEn ? 'Reopen' : 'Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`final_delete_${lang}`).setEmoji('<:zyphera_cop:1466044646403870730>').setLabel(isEn ? 'Delete' : 'Sil').setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [greenCloseEmbed], components: [row] });
        }

        // --- 7. GERİ AÇ (2 SN) ---
        if (interaction.customId.startsWith('reopen_ticket_')) {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });

            const reopenEmbed = new EmbedBuilder()
                .setTitle(isEn ? 'Ticket Reopened' : 'Ticket Geri Açıldı')
                .setDescription(isEn ? `**Ticket reopened by ${interaction.user}. Go to pinned message to close.**` : `**Ticket ${interaction.user} Tarafından Geri Açıldı Ticketi Kapatmak İçin Sabitlenenlerdeki Embede Gidip <:zyphera_lock:1466044664346968309> Butonuna Tıklayın**`)
                .setColor('Green');

            await interaction.message.delete();
            const sm = await interaction.channel.send({ content: `<@${ticketData.ownerID}>`, embeds: [reopenEmbed] });
            setTimeout(() => sm.delete().catch(() => {}), 2000);
        }

        // --- 8. SİL (5 SN) ---
        if (interaction.customId.startsWith('final_delete_')) {
            const delEmbed = new EmbedBuilder().setTitle(isEn ? 'Deleting Ticket' : 'Ticket Siliniyor').setDescription(isEn ? '**Ticket will be deleted in 5 seconds**' : '**Ticket 5 Saniye İçinde Silinecek**').setColor('Green');
            await interaction.update({ embeds: [delEmbed], components: [] });
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};