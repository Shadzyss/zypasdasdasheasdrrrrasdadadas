const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const StaffStats = require('../models/StaffStats'); // Model yolunun doğru olduğundan emin ol

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Buton veya Slash Command değilse çık
        if (!interaction.isButton() && !interaction.isChatInputCommand()) return;

        try {
            const staffRole = process.env.STAFF_TR_ROLE_ID;
            const categoryId = process.env.TICKET_KATEGORI;

            // --- /ticket-tr KOMUTU ---
            if (interaction.commandName === 'ticket-tr') {
                if (interaction.user.id !== process.env.OWNER_ID) {
                    return interaction.reply({ content: 'Bu komutu sadece bot sahibi kullanabilir.', ephemeral: true });
                }

                const channel = interaction.options.getChannel('kanal');
                const setupEmbed = new EmbedBuilder()
                    .setTitle('🎟️ Ticket 🎟️')
                    .setDescription(`**Herhangi Bir Konu Hakkında Bilgi Almak İçin <:zyphera_info:1466034688903610471> Butonuna Tıklayın\nŞikayet İçin <:zyphera_yonetici:1464095317526839296> Butonuna Tıklayın\nYetkili Başvurusu İçin <a:zyphera_parca:1464095414201352254> Butonuna Tıklayın\nYukarıdaki Konulardan Hariç Ticket Açmak İçin <a:zyphera_yukleniyor:1464095331863101514> Butonuna Tıklayın**`)
                    .setColor('Random');

                const setupRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('t_info').setEmoji('1466034688903610471').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('t_sikayet').setEmoji('1464095317526839296').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('t_basvuru').setEmoji('1464095414201352254').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('t_diger').setEmoji('1464095331863101514').setStyle(ButtonStyle.Secondary)
                );

                await channel.send({ embeds: [setupEmbed], components: [setupRow] });
                return interaction.reply({ content: 'Panel başarıyla kuruldu.', ephemeral: true });
            }

            // --- BUTON İŞLEMLERİ ---
            if (interaction.isButton()) {
                const { customId, guild, user, channel } = interaction;

                // 1. TICKET OLUŞTURMA
                if (['t_info', 't_sikayet', 't_basvuru', 't_diger'].includes(customId)) {
                    await interaction.deferReply({ ephemeral: true }); // Zaman aşımını önlemek için

                    let label = "Destek";
                    let emoji = "🎟️";
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
                    return interaction.editReply({ content: `Ticketin oluşturuldu: ${ticketChannel}` });
                }

                // 2. TICKET SAHİPLENME (CLAIM)
                if (customId === 't_claim') {
                    if (!interaction.member.roles.cache.has(staffRole)) {
                        return interaction.reply({ content: 'Bunu sadece yetkililer yapabilir!', ephemeral: true });
                    }

                    await interaction.deferUpdate(); // "Etkileşim başarısız" hatasını önler

                    await StaffStats.findOneAndUpdate({ userId: user.id }, { $inc: { claimedTickets: 1 } }, { upsert: true });

                    const mainEmbed = interaction.message.embeds[0];
                    const updatedEmbed = EmbedBuilder.from(mainEmbed).setDescription(mainEmbed.description.replace('`Ticket Sahiplenilmedi`', `<@${user.id}>`));
                    await interaction.message.edit({ embeds: [updatedEmbed] });

                    const claimEmbed = new EmbedBuilder()
                        .setDescription(`**Ticket <@${user.id}> Tarafından Sahiplenildi Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın**`)
                        .setColor('Green');

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`unclaim_${user.id}`).setEmoji('📌').setStyle(ButtonStyle.Secondary)
                    );

                    const claimMsg = await interaction.followUp({ embeds: [claimEmbed], components: [row], fetchReply: true });
                    await claimMsg.pin();
                }

                // 3. SAHİPLİĞİ BIRAKMA (UNCLAIM)
                if (customId.startsWith('unclaim_')) {
                    const claimerId = customId.split('_')[1];
                    if (user.id !== claimerId) return interaction.reply({ content: 'Sadece sahiplenen yetkili bırakabilir!', ephemeral: true });

                    await interaction.deferUpdate();
                    await StaffStats.findOneAndUpdate({ userId: user.id }, { $inc: { claimedTickets: -1 } });

                    await interaction.message.unpin().catch(() => {});
                    
                    const unclaimEmbed = new EmbedBuilder()
                        .setDescription(`**<@${user.id}> Adlı Yetkili Ticketi Sahiplenmeyi Bıraktı Ticketi Sahiplenmek İsteyen Yetkili <:zyphera_yesilraptiye:1466044628506771588> Butonuna Tıklayın**`)
                        .setColor('Red');

                    // Ana mesajı bul ve eski haline çevir
                    const pins = await channel.messages.fetchPinned();
                    const mainMsg = pins.last(); 
                    if(mainMsg) {
                        const resetEmbed = EmbedBuilder.from(mainMsg.embeds[0]).setDescription(mainMsg.embeds[0].description.replace(`<@${user.id}>`, '`Ticket Sahiplenilmedi`'));
                        await mainMsg.edit({ embeds: [resetEmbed] });
                    }

                    return interaction.editReply({ embeds: [unclaimEmbed], components: [] });
                }

                // 4. KAPATMA / SİLME / ONAY
                if (customId === 't_lock') {
                    const lockEmbed = new EmbedBuilder()
                        .setTitle('Ticket Kapatılıyor')
                        .setDescription(`**<@${user.id}> Ticketi Kapatmak İstiyor Musunuz?**`)
                        .setColor('Yellow');
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('t_confirm_lock').setLabel('Onayla').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('t_cancel_lock').setLabel('İptal Et').setStyle(ButtonStyle.Danger)
                    );
                    return interaction.reply({ embeds: [lockEmbed], components: [row] });
                }

                if (customId === 't_confirm_lock') {
                    await interaction.deferUpdate();
                    const closedEmbed = new EmbedBuilder()
                        .setTitle('Ticket Kapatıldı')
                        .setDescription(`Ticket Kapatıldı\n<:zyphera_unlock:1466044688908947636> Aç | <:zyphera_cop:1466044646403870730> Sil`)
                        .setColor('Green');
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('t_unlock').setEmoji('1466044688908947636').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('t_delete').setEmoji('1466044646403870730').setStyle(ButtonStyle.Secondary)
                    );
                    return interaction.editReply({ embeds: [closedEmbed], components: [row] });
                }

                if (customId === 't_delete') {
                    await interaction.reply({ content: 'Ticket siliniyor...' });
                    setTimeout(() => channel.delete().catch(() => {}), 3000);
                }
            }
        } catch (error) {
            console.error("BİR HATA OLUŞTU:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Bir hata oluştu, konsolu kontrol et!', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'İşlem sırasında bir hata meydana geldi.' });
            }
        }
    },
};