const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const StaffStats = require('../models/StaffStats'); // Model yolu

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, channel } = interaction;
        const staffRole = process.env.STAFF_TR_ROLE_ID;
        const categoryId = process.env.TICKET_KATEGORI;

        // --- TICKET OLUŞTURMA ---
        if (['t_info', 't_sikayet', 't_basvuru', 't_diger'].includes(customId)) {
            let label = "";
            let emoji = "";
            if(customId === 't_info') { label = "Bilgi"; emoji = "<:zyphera_info:1466034688903610471>"; }
            if(customId === 't_sikayet') { label = "Şikayet"; emoji = "<:zyphera_yonetici:1464095317526839296>"; }
            if(customId === 't_basvuru') { label = "Yetkili Başvurusu"; emoji = "<a:zyphera_parca:1464095414201352254>"; }
            if(customId === 't_diger') { label = "Diğer"; emoji = "<a:zyphera_yukleniyor:1464095331863101514>"; }

            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setDescription(`<@${user.id}> Ticket Açtığın İçin Teşekkür Ederiz Lütfen Sorununuzu Belirtin Yetkililerimiz Birazdan Geri Dönüş Sağlayacaklar Sabrınız İçin Teşekkür Ederiz\n- Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Tıklayın\n- Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın\n\n\`----- Ticket Bilgileri -----\`\n<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> <@${user.id}>\n<:zyphera_server:1466051437086773290> Ticketin Oluşturulma Zamanı --> <t:${Math.floor(Date.now() / 1000)}:R>\n<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${emoji} ${label}\n<:zyphera_yesilraptiye:1466044628506771588> Ticketi Sahiplenen Yetkili --> \`Ticket Sahiplenilmedi\``)
                .setColor('Random');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('t_lock').setEmoji('1466044664346968309').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('t_claim').setEmoji('1466044628506771588').setStyle(ButtonStyle.Secondary)
            );

            const msg = await ticketChannel.send({ content: `<@${user.id}> - <@&${staffRole}>`, embeds: [welcomeEmbed], components: [row] });
            await msg.pin();
            return interaction.reply({ content: `Ticketin oluşturuldu: ${ticketChannel}`, ephemeral: true });
        }

        // --- TICKET SAHİPLENME (CLAIM) ---
        if (customId === 't_claim') {
            if (!interaction.member.roles.cache.has(staffRole)) return interaction.reply({ content: 'Bunu sadece yetkililer yapabilir!', ephemeral: true });

            // MongoDB Güncelleme
            await StaffStats.findOneAndUpdate({ userId: user.id }, { $inc: { claimedTickets: 1 } }, { upsert: true });

            const mainEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(mainEmbed).setDescription(mainEmbed.description.replace('`Ticket Sahiplenilmedi`', `<@${user.id}>`));
            
            await interaction.message.edit({ embeds: [updatedEmbed] });

            const claimEmbed = new EmbedBuilder()
                .setDescription(`**Ticket <@${user.id}> Tarafından Sahiplenildi Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`t_unclaim_${user.id}`).setEmoji('📌').setStyle(ButtonStyle.Secondary)
            );

            const claimMsg = await interaction.reply({ embeds: [claimEmbed], components: [row], fetchReply: true });
            await claimMsg.pin();
        }

        // --- SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (customId.startsWith('t_unclaim_')) {
            const claimerId = customId.split('_')[2];
            if (user.id !== claimerId) return interaction.reply({ content: 'Bu sahipliği sadece sahiplenen yetkili bırakabilir!', ephemeral: true });

            await StaffStats.findOneAndUpdate({ userId: user.id }, { $inc: { claimedTickets: -1 } });

            // Sabitlenen claim mesajını bul ve kaldır (basit yöntem: son mesajı kontrol et)
            await interaction.message.unpin();

            const unclaimEmbed = new EmbedBuilder()
                .setDescription(`**<@${user.id}> Adlı Yetkili Ticketi Sahiplenmeyi Bıraktı Ticketi Sahiplenmek İsteyen Yetkili <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                .setColor('Red');

            // İlk mesajı güncelle (Tekrar Sahiplenilmedi yap)
            const pinnedMessages = await channel.messages.fetchPinned();
            const firstMsg = pinnedMessages.last();
            if(firstMsg) {
                const resetEmbed = EmbedBuilder.from(firstMsg.embeds[0]).setDescription(firstMsg.embeds[0].description.replace(`<@${user.id}>`, '`Ticket Sahiplenilmedi`'));
                await firstMsg.edit({ embeds: [resetEmbed] });
            }

            return interaction.update({ embeds: [unclaimEmbed], components: [], content: "" });
        }

        // --- KAPATMA (LOCK) ---
        if (customId === 't_lock') {
            const lockEmbed = new EmbedBuilder()
                .setTitle('Ticket Kapatılıyor')
                .setDescription(`**<@${user.id}> Ticketi Kapatmak İstiyor Musunuz? Kapatmak İçin "Onayla" Butonuna Tıklayın İşlemi İptal Etmek İçin "İptal Et" Butonuna Tıklayın**`)
                .setColor('Yellow');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('t_lock_confirm').setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('t_lock_cancel').setLabel('İptal Et').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ embeds: [lockEmbed], components: [row] });
        }

        // --- ONAYLA ---
        if (customId === 't_lock_confirm') {
            const closedEmbed = new EmbedBuilder()
                .setTitle('Ticket Kapatıldı')
                .setDescription(`Ticket Kapatıldı Ticketi Geri Açmak İçin <:zyphera_unlock:1466044688908947636> Butonuna Tıklayın Ticketi Silmek İçin <:zyphera_cop:1466044646403870730> Butonuna Tıklayın`)
                .setColor('Green');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('t_unlock').setEmoji('1466044688908947636').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('t_delete').setEmoji('1466044646403870730').setStyle(ButtonStyle.Secondary)
            );

            // Üyenin yazmasını engelle
            await channel.permissionOverwrites.edit(channel.name.split('-')[1], { SendMessages: false });
            
            return interaction.update({ embeds: [closedEmbed], components: [row] });
        }

        // --- İPTAL ET ---
        if (customId === 't_lock_cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setDescription(`**İşlem İptal Edildi Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Tıklayın\n- Ticketi Sahiplenen Yetkili --> <@${user.id}>\n<:zyphera_sagok:1464095169220448455> Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`)
                .setColor('Red');

            const msg = await interaction.update({ embeds: [cancelEmbed], components: [], fetchReply: true });
            await msg.pin();
        }

        // --- YENİDEN AÇ (UNLOCK) ---
        if (customId === 't_unlock') {
            const openEmbed = new EmbedBuilder()
                .setTitle('Ticket Yeniden Açıldı')
                .setDescription(`**<@${user.id}> Tarafından Ticket Yeniden Açıldı Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Tıklayın\n- Ticketi Sahiplenen Yetkili --> <@${user.id}>\n<:zyphera_sagok:1464095169220448455> Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`)
                .setColor('Green');

            // Mesajları temizle/sabitle yönetimi
            const pins = await channel.messages.fetchPinned();
            pins.first()?.unpin();

            const msg = await interaction.update({ embeds: [openEmbed], components: [], fetchReply: true });
            await msg.pin();
        }

        // --- SİL (DELETE) ---
        if (customId === 't_delete') {
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription('**Ticket Saniyeler İçinde Silinecek**').setColor('Green')] });
            setTimeout(() => channel.delete(), 5000);
        }
    }
};