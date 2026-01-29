const { 
    Events, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField 
} = require('discord.js');
const TicketStats = require('../models/TicketStats');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, member } = interaction;
        const staffRoleId = process.env.STAFF_TR_ROLE_ID;
        const categoryId = process.env.TICKET_KATEGORI;

        // --- 1. TICKET OLUŞTURMA İŞLEMLERİ ---
        const ticketTypes = ['create_info', 'create_sikayet', 'create_basvuru', 'create_diger'];
        
        if (ticketTypes.includes(customId)) {
            await interaction.deferReply({ ephemeral: true });

            const channelName = `ticket-${user.username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}-${Math.floor(Math.random() * 1000)}`;

            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: staffRoleId,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`Yeni Destek Talebi: ${user.username}`)
                .setDescription(`Hoş geldin <@${user.id}>! Yetkili ekibi birazdan seninle ilgilenecektir.\n\n**Durum:** Sahipsiz\n**Kategori:** ${customId.replace('create_', '').toUpperCase()}`)
                .addFields({ name: 'Sahiplenen Yetkili', value: 'Bulunmuyor (Bekleniyor...)' })
                .setColor('#00ffaa')
                .setTimestamp();

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Sahiplen')
                    .setEmoji('<:zyphera_yesilraptiye:1466044628506771588>')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setEmoji('<:zyphera_lock:1466044664346968309>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_delete')
                    .setEmoji('<:zyphera_cop:1466044646403870730>')
                    .setStyle(ButtonStyle.Danger)
            );

            // Mesajı gönder ve değişkene ata
            const welcomeMessage = await channel.send({ 
                content: `<@${user.id}> | <@&${staffRoleId}>`, 
                embeds: [welcomeEmbed], 
                components: [controlRow] 
            });

            // İSTEK: Ticket ilk açıldığında mesajı sabitle
            await welcomeMessage.pin();

            await interaction.editReply({ content: `Ticketin oluşturuldu: ${channel}` });
        }

        // --- 2. TICKET SAHİPLENME (CLAIM) ---
        if (customId === 'ticket_claim') {
            if (!member.roles.cache.has(staffRoleId)) {
                return interaction.reply({ content: 'Bu işlemi sadece yetkili ekibi yapabilir!', ephemeral: true });
            }

            const currentEmbed = interaction.message.embeds[0];
            const isClaimed = currentEmbed.fields.find(f => f.name === 'Sahiplenen Yetkili').value !== 'Bulunmuyor (Bekleniyor...)';

            if (isClaimed) {
                return interaction.reply({ content: 'Bu ticket zaten biri tarafından sahiplenilmiş!', ephemeral: true });
            }

            // DB: +1 Ekle
            try {
                await TicketStats.findOneAndUpdate(
                    { userID: user.id },
                    { $inc: { ticketCount: 1 } },
                    { upsert: true, new: true }
                );
            } catch (err) {
                console.error(err);
            }

            // İSTEK: Sahiplenildiğinde Description ve Renk değişimi
            const newEmbed = new EmbedBuilder(currentEmbed.data)
                .setDescription(`**Ticket <@${user.id}> Tarafından Sahiplenildi**\n- Ticket Sahipliğini Bırakmak İçin 📌 Butonuna Tıklayın`)
                .setFields({ name: 'Sahiplenen Yetkili', value: `<@${user.id}>` })
                .setColor('Random'); // İSTEK: Random renk

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_unclaim') 
                    .setLabel('Sahipliği Bırak') // İsteğe bağlı, sadece emoji istenirse label silinebilir
                    .setEmoji('📌') // İSTEK: Raptiye butonu
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setEmoji('<:zyphera_lock:1466044664346968309>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_delete')
                    .setEmoji('<:zyphera_cop:1466044646403870730>')
                    .setStyle(ButtonStyle.Danger)
            );

            // İSTEK: Mesajın sabitlendiğinden emin ol (Zaten açılışta sabitledik ama garanti olsun)
            if (!interaction.message.pinned) await interaction.message.pin();

            await interaction.channel.send({ content: `> <:zyphera_yesilraptiye:1466044628506771588> **Ticket <@${user.id}> tarafından sahiplenildi!**` });
            await interaction.update({ embeds: [newEmbed], components: [newRow] });
        }

        // --- 3. TICKET SAHİPLİĞİ BIRAKMA (UNCLAIM) ---
        if (customId === 'ticket_unclaim') {
            if (!member.roles.cache.has(staffRoleId)) return;

            const currentEmbed = interaction.message.embeds[0];
            const claimerField = currentEmbed.fields.find(f => f.name === 'Sahiplenen Yetkili').value;
            
            if (!claimerField.includes(user.id)) {
                return interaction.reply({ content: 'Bu ticketi sen sahiplenmediğin için bırakamazsın!', ephemeral: true });
            }

            // DB: -1 Çıkar
            try {
                await TicketStats.findOneAndUpdate(
                    { userID: user.id },
                    { $inc: { ticketCount: -1 } }
                );
            } catch (err) {
                console.error(err);
            }

            // Eski haline geri döndür
            const newEmbed = new EmbedBuilder(currentEmbed.data)
                .setDescription('**Durum:** Sahipsiz (Boşa Çıkarıldı)')
                .setFields({ name: 'Sahiplenen Yetkili', value: 'Bulunmuyor (Bekleniyor...)' })
                .setColor('#00ffaa'); // Standart renge dönüş

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Sahiplen')
                    .setEmoji('<:zyphera_yesilraptiye:1466044628506771588>')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setEmoji('<:zyphera_lock:1466044664346968309>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_delete')
                    .setEmoji('<:zyphera_cop:1466044646403870730>')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.channel.send({ content: `> 📌 **<@${user.id}> ticket sahipliğini bıraktı!**` });
            await interaction.update({ embeds: [newEmbed], components: [newRow] });
        }

        // --- 4. TICKET KAPATMA/AÇMA/SİLME İŞLEMLERİ ---
        if (customId === 'ticket_close') {
            if (!member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Yetkin yok.', ephemeral: true });

            await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false }); // User ID düzeltmesi
            await interaction.channel.setName(`closed-${interaction.channel.name.split('-')[1]}`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_unlock').setEmoji('<:zyphera_unlock:1466044688908947636>').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_delete').setEmoji('<:zyphera_cop:1466044646403870730>').setStyle(ButtonStyle.Danger)
            );
            
            await interaction.reply({ content: 'Ticket kapatıldı.', components: [row] });
        }

        if (customId === 'ticket_unlock') {
             await interaction.channel.setName(interaction.channel.name.replace('closed', 'ticket'));
             await interaction.message.delete();
             await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true }); // Kullanıcıyı tekrar ekle
             await interaction.reply({ content: 'Ticket tekrar açıldı.', ephemeral: true });
        }

        if (customId === 'ticket_delete') {
            if (!member.roles.cache.has(staffRoleId)) return interaction.reply({ content: 'Yetkin yok.', ephemeral: true });
            
            await interaction.reply('Kanal 5 saniye içinde siliniyor...');
            setTimeout(() => interaction.channel.delete(), 5000);
        }
    }
};