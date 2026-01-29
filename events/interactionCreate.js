const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { Ticket, Staff } = require('../models/ticketSchema');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const STAFF_ROLE = process.env.STAFF_TR_ROLE_ID;
        const CATEGORY_ID = process.env.TICKET_KATEGORI;

        if (!interaction.isButton()) return;

        // --- 1. TICKET AÇMA ---
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

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
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
                .setDescription(`**Ticket Açtığın İçin Teşekkür Ederiz ${interaction.user} Yetkililerimiz Birazdan Burada Olacaklar Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Basın\n\n\`----- Ticket Bilgileri -----\`\n<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> ${interaction.user}\n<:zyphera_server:1466051437086773290> Ticketin Açılma Zamanı --> <t:${timestamp}:R>\n<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${selected.emoji} ${selected.label}\n<:zyphera_yesilraptiye:1466044628506771588> Ticket Durum --> \`Sahiplenilmedi\`\n\n<:zyphera_sagok:1464095169220448455> Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor('Random');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );

            const msg = await channel.send({ content: `${interaction.user} - <@&${STAFF_ROLE}>`, embeds: [ticketEmbed], components: [buttons] });
            await msg.pin();
            return interaction.editReply(`Ticket açıldı: ${channel}`);
        }

        // --- 2. SAHİPLENME (CLAIM) ---
        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: 'Zaten sahiplenilmiş!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            // Sabitlenmiş mesajı güncelle
            const oldEmbed = interaction.message.embeds[0];
            const claimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace('`Sahiplenilmedi`', `Sahiplendi ( ${interaction.user} Yetkili )`));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim').setEmoji('📌').setLabel('Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });

            // Sahiplenildi Bildirim Embedi
            const claimNotify = new EmbedBuilder()
                .setTitle('Ticket Sahiplenildi')
                .setDescription(`**Ticket ${interaction.user} Tarafından Sahiplenildi Sahipliği Bırakmak 📌 Butonuna Tıklayın**`)
                .setColor('Green');
            
            const notifyMsg = await interaction.channel.send({ embeds: [claimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        // --- 3. SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (interaction.customId === 'unclaim') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: 'Sadece sahiplenen bırakabilir!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            // Sabitlenmiş mesajı resetle
            const oldEmbed = interaction.message.embeds[0];
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace(/Sahiplendi \( <@!?\d+> Yetkili \)/, '`Sahiplenilmedi`'));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });

            // Bırakıldı Bildirim Embedi
            const unclaimNotify = new EmbedBuilder()
                .setTitle('Ticket Sahiplenmesi Bırakıldı')
                .setDescription(`**Ticket Sahipliği ${interaction.user} Tarafından Bırakıldı Ticketı Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor('Green');

            const notifyMsg = await interaction.channel.send({ embeds: [unclaimNotify] });
            setTimeout(() => notifyMsg.delete().catch(() => {}), 3000);
        }

        // --- 4. KAPATMA ONAYI (SARI) ---
        if (interaction.customId === 'close_request') {
            const yellowEmbed = new EmbedBuilder()
                .setTitle('Ticket Kapatılıyor')
                .setDescription(`**${interaction.user} Ticketi Kapatmak İstiyor Musun Kapatmak İçin "Onayla" Butonuna Tıklayın Ticketi Kapatmak İstemiyorsan "İptal Et" Butonuna Tıklayın**`)
                .setColor('Yellow');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Onayla').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('İptal Et').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [yellowEmbed], components: [row] });
        }

        // --- 5. İPTAL ET BUTONU (KIRMIZI + 2 SN) ---
        if (interaction.customId === 'cancel_close') {
            const cancelEmbed = new EmbedBuilder()
                .setDescription(`**İşlem ${interaction.user} Tarafından İptal Edildi**`)
                .setColor('Red');
            await interaction.update({ embeds: [cancelEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
        }

        // --- 6. ONAYLA (KAPAT) ---
        if (interaction.customId === 'confirm_close') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: false });

            const greenCloseEmbed = new EmbedBuilder()
                .setTitle('Ticket Kapatıldı')
                .setDescription(`**Ticket ${interaction.user} Adlı Kişi Tarafından Kapatıldı Ticketi Yeniden Açmak İçin <:zyphera_unlock:1466044688908947636> Butonuna Tıklayın Ticketı Silmek İçin <:zyphera_cop:1466044646403870730> Butonuna Basın**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reopen_ticket').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel('Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('final_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel('Sil').setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [greenCloseEmbed], components: [row] });
        }

        // --- 7. GERİ AÇ BUTONU (2 SN) ---
        if (interaction.customId === 'reopen_ticket') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { ViewChannel: true, SendMessages: true });

            const reopenEmbed = new EmbedBuilder()
                .setTitle('Ticket Geri Açıldı')
                .setDescription(`**Ticket ${interaction.user} Tarafından Geri Açıldı Ticketi Kapatmak İçin Sabitlenenlerdeki Embede Gidip <:zyphera_lock:1466044664346968309> Butonuna Tıklayın**`)
                .setColor('Green');

            await interaction.message.delete(); 
            const sentReopen = await interaction.channel.send({ content: `<@${ticketData.ownerID}>`, embeds: [reopenEmbed] });
            setTimeout(() => sentReopen.delete().catch(() => {}), 2000);
        }

        // --- 8. FİNAL SİLME (5 SN) ---
        if (interaction.customId === 'final_delete') {
            const deleteEmbed = new EmbedBuilder()
                .setTitle('Ticket Siliniyor')
                .setDescription('**Ticket 5 Saniye İçinde Silinecek**')
                .setColor('Green');
            await interaction.update({ embeds: [deleteEmbed], components: [] });
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};