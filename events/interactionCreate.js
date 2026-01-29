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

        // --- 2. KAPATMA İSTEĞİ (SARI EMBED) ---
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

        // --- 3. ONAYLA BUTONU (YEŞİL EMBED - KAPATILDI) ---
        if (interaction.customId === 'confirm_close') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            
            // Kullanıcının yazma yetkisini alalım
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { SendMessages: false });

            const greenEmbed = new EmbedBuilder()
                .setTitle('Ticket Kapatıldı')
                .setDescription(`**Ticket ${interaction.user} Adlı Kişi Tarafından Kapatıldı Ticketi Yeniden Açmak İçin <:zyphera_unlock:1466044688908947636> Butonuna Tıklayın Ticketı Silmek İçin <:zyphera_cop:1466044646403870730> Butonuna Basın**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reopen_ticket').setEmoji('<:zyphera_unlock:1466044688908947636>').setLabel('Geri Aç').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('final_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setLabel('Sil').setStyle(ButtonStyle.Danger)
            );

            await interaction.update({ embeds: [greenEmbed], components: [row] });
        }

        // --- 4. GERİ AÇ BUTONU ---
        if (interaction.customId === 'reopen_ticket') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            await interaction.channel.permissionOverwrites.edit(ticketData.ownerID, { SendMessages: true });
            
            await interaction.message.delete();
            await interaction.channel.send({ content: 'Ticket tekrar açıldı!' }).then(m => setTimeout(() => m.delete(), 3000));
        }

        // --- 5. SİL BUTONU ---
        if (interaction.customId === 'final_delete') {
            await interaction.reply('Kanal 5 saniye içinde siliniyor...');
            await Ticket.deleteOne({ channelID: interaction.channel.id });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        // --- 6. İPTAL ET ---
        if (interaction.customId === 'cancel_close') {
            await interaction.message.delete();
        }

        // --- 7. SAHİPLENME (CLAIM) ---
        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (ticketData?.claimerID) return interaction.reply({ content: 'Zaten sahiplenilmiş!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: interaction.user.id });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: 1 } }, { upsert: true });

            const oldEmbed = interaction.message.embeds[0];
            const claimedEmbed = EmbedBuilder.from(oldEmbed)
                .setDescription(oldEmbed.description.replace('`Sahiplenilmedi`', `Sahiplendi ( ${interaction.user} Yetkili )`));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim').setEmoji('📌').setLabel('Geri Bırak').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [claimedEmbed], components: [buttons] });
        }

        // --- 8. SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (interaction.customId === 'unclaim') {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (interaction.user.id !== ticketData?.claimerID) return interaction.reply({ content: 'Sen sahiplenmemişsin!', ephemeral: true });

            await Ticket.findOneAndUpdate({ channelID: interaction.channel.id }, { claimerID: null });
            await Staff.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { claimCount: -1 } });

            const oldEmbed = interaction.message.embeds[0];
            const unclaimedEmbed = EmbedBuilder.from(oldEmbed)
                .setDescription(oldEmbed.description.replace(/Sahiplendi \( <@!?\d+> Yetkili \)/, '`Sahiplenilmedi`'));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setEmoji('<:zyphera_yesilraptiye:1466044628506771588>').setLabel('Sahiplen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close_request').setEmoji('<:zyphera_lock:1466044664346968309>').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [unclaimedEmbed], components: [buttons] });
        }
    }
};