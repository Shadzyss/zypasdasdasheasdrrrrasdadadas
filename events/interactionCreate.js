const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const Yetkili = require('../models/Yetkili');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // --- 1. SLASH KOMUTLARINI ÇALIŞTIRMA ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true });
            }
        }

        // --- 2. TICKET BUTONLARI MANTIĞI ---
        if (interaction.isButton()) {
            const { customId, guild, user, channel, member, message } = interaction;
            const staffRole = process.env.STAFF_TR_ROLE_ID;
            const category = process.env.TICKET_KATEGORI;

            // Ticket Açma
            if (customId.startsWith('tr_')) {
                const types = {
                    'tr_info': { name: 'Bilgi', emoji: '<:zyphera_info:1466034688903610471>' },
                    'tr_sikayet': { name: 'Şikayet', emoji: '<:zyphera_yonetici:1464095317526839296>' },
                    'tr_basvuru': { name: 'Yetkili Başvurusu', emoji: '<a:zyphera_parca:1464095414201352254>' },
                    'tr_diger': { name: 'Diğer', emoji: '<a:zyphera_yukleniyor:1464095331863101514>' }
                };
                const selected = types[customId];

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: category,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor('Random')
                    .setDescription(`**<@${user.id}> Ticket Açtığın İçin Teşekkür Ederiz Lütfen Sorununuzu Belirtin Yetkililerimiz Birazdan Geri Dönüş Sağlayacaklar Sabrınız İçin Teşekkür Ederiz
- Ticketi Kapatmak İçin <:zyphera_lock:1466044664346968309> Butonuna Tıklayın
- Ticketi Sahiplenmek İçin <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın

\`----- Ticket Bilgileri -----\`
<:zyphera_blurpletac:1466051421253275791> Ticket Sahibi --> <@${user.id}>
<:zyphera_server:1466051437086773290> Ticketin Oluşturulma Zamanı --> <t:${Math.floor(Date.now() / 1000)}:F>
<:zyphera_bell:1466051402664251524> Ticket Kategorisi --> ${selected.emoji} ${selected.name}
<:zyphera_yesilraptiye:1466044628506771588> Ticketi Sahiplenen Yetkili --> \`Ticket Sahiplenilmedi\`**`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_tr').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('lock_tr').setEmoji('1466044664346968309').setStyle(ButtonStyle.Secondary)
                );

                const msg = await ticketChannel.send({ content: `<@${user.id}> - <@&${staffRole}>`, embeds: [ticketEmbed], components: [row] });
                await msg.pin();
                await interaction.reply({ content: `✅ Ticketin açıldı: ${ticketChannel}`, ephemeral: true });
            }

            // Sahiplenme (Claim)
            if (customId === 'claim_tr') {
                if (!member.roles.cache.has(staffRole)) return interaction.reply({ content: 'Sadece yetkililer sahiplenebilir.', ephemeral: true });

                const pins = await channel.messages.fetchPinned();
                const mainMsg = pins.find(m => m.embeds[0]?.description.includes('Ticket Bilgileri'));

                if (mainMsg.embeds[0].description.includes('Ticketi Sahiplenen Yetkili --> <@')) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('**Bu ticket zaten bir yetkili tarafından sahiplenilmiş!**')], ephemeral: true });
                }

                await Yetkili.findOneAndUpdate({ yetkiliId: user.id }, { $inc: { toplamTicketSahiplenme: 1 } }, { upsert: true });

                const editedDesc = mainMsg.embeds[0].description.replace('`Ticket Sahiplenilmedi`', `<@${user.id}>`);
                await mainMsg.edit({ embeds: [EmbedBuilder.from(mainMsg.embeds[0]).setDescription(editedDesc)] });

                if (message.editable && message.id !== mainMsg.id) await message.edit({ components: [] });

                const claimMsg = await interaction.reply({ 
                    embeds: [new EmbedBuilder().setColor('Green').setDescription(`**Ticket <@${user.id}> Tarafından Sahiplenildi Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`)], 
                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('unclaim_tr').setEmoji('📌').setStyle(ButtonStyle.Danger))],
                    fetchReply: true 
                });
                await claimMsg.pin();
            }

            // Bırakma (Unclaim)
            if (customId === 'unclaim_tr') {
                if (!member.roles.cache.has(staffRole)) return;
                await Yetkili.findOneAndUpdate({ yetkiliId: user.id }, { $inc: { toplamTicketSahiplenme: -1 } });

                const pins = await channel.messages.fetchPinned();
                const mainMsg = pins.find(m => m.embeds[0]?.description.includes('Ticket Bilgileri'));
                const resetDesc = mainMsg.embeds[0].description.replace(`<@${user.id}>`, '`Ticket Sahiplenilmedi`');
                await mainMsg.edit({ embeds: [EmbedBuilder.from(mainMsg.embeds[0]).setDescription(resetDesc)] });

                await message.unpin();
                await interaction.update({ components: [] });
                await channel.send({ 
                    embeds: [new EmbedBuilder().setColor('Red').setDescription(`**<@${user.id}> Adlı Yetkili Ticketi Sahiplenmeyi Bıraktı Ticketi Sahiplenmek İsteyen Yetkili <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)],
                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('claim_tr').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success))]
                });
            }

            // Kilitleme (Lock)
            if (customId === 'lock_tr') {
                await interaction.reply({ 
                    embeds: [new EmbedBuilder().setTitle('Ticket Kapatılıyor').setDescription(`**<@${user.id}> Ticketi Kapatmak İstiyor Musunuz?**`).setColor('Yellow')],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('confirm_lock_tr').setLabel('Onayla').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('cancel_lock_tr').setLabel('İptal Et').setStyle(ButtonStyle.Danger)
                    )]
                });
            }

            if (customId === 'confirm_lock_tr') {
                await interaction.update({ 
                    embeds: [new EmbedBuilder().setTitle('Ticket Kapatıldı').setDescription(`**Ticket Kapatıldı. Geri açmak için <:zyphera_unlock:1466044688908947636> Silmek için <:zyphera_cop:1466044646403870730>**`).setColor('Green')],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('unlock_tr').setEmoji('1466044688908947636').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('delete_tr').setEmoji('1466044646403870730').setStyle(ButtonStyle.Secondary)
                    )]
                });
            }

            if (customId === 'delete_tr') {
                await interaction.reply({ embeds: [new EmbedBuilder().setDescription('**Ticket Saniyeler İçinde Silinecek**').setColor('Green')] });
                setTimeout(() => channel.delete().catch(() => {}), 5000);
            }
        }
    },
};