const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const Yetkili = require('../models/Yetkili');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try { await command.execute(interaction); } catch (e) { console.error(e); }
        }

        if (!interaction.isButton()) return;

        const { customId, guild, user, channel, member, message } = interaction;
        const staffRole = process.env.STAFF_TR_ROLE_ID;
        const category = process.env.TICKET_KATEGORI;

        // --- TICKET AÇMA ---
        if (customId.startsWith('tr_')) {
            const types = {
                'tr_info': { name: 'Bilgi', emoji: 'ℹ️' },
                'tr_sikayet': { name: 'Şikayet', emoji: '⚠️' },
                'tr_basvuru': { name: 'Başvuru', emoji: '📝' },
                'tr_diger': { name: 'Diğer', emoji: '❓' }
            };
            const s = types[customId];

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

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setDescription(`**Ticket Açıldı!**\n\n**----- Ticket Bilgileri -----**\n👤 Ticket Sahibi --> <@${user.id}>\n⏰ Zaman --> <t:${Math.floor(Date.now()/1000)}:R>\n📂 Kategori --> ${s.emoji} ${s.name}\n📌 Ticketi Sahiplenen Yetkili --> \`Ticket Sahiplenilmedi\``);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_tr').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('lock_tr').setEmoji('1466044664346968309').setStyle(ButtonStyle.Secondary)
            );

            const m = await ticketChannel.send({ content: `<@${user.id}> - <@&${staffRole}>`, embeds: [embed], components: [row] });
            await m.pin();
            return interaction.reply({ content: `Kanal: ${ticketChannel}`, ephemeral: true });
        }

        // --- SAHİPLENME (CLAIM) ---
        if (customId === 'claim_tr') {
            if (!member.roles.cache.has(staffRole)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });

            const pins = await channel.messages.fetchPinned();
            const mainMsg = pins.find(m => m.embeds[0]?.description.includes('Ticket Bilgileri'));
            if (!mainMsg) return interaction.reply({ content: 'Ana mesaj bulunamadı!', ephemeral: true });

            if (mainMsg.embeds[0].description.includes('Ticketi Sahiplenen Yetkili --> <@')) {
                return interaction.reply({ content: 'Zaten sahiplenilmiş!', ephemeral: true });
            }

            await Yetkili.findOneAndUpdate({ yetkiliId: user.id }, { $inc: { toplamTicketSahiplenme: 1 } }, { upsert: true });

            // BALYOZ YÖNTEMİ: Embed'i satır satır bölüyoruz
            let lines = mainMsg.embeds[0].description.split('\n');
            // Son satırı (Yetkili kısmını) hedef alıp değiştiriyoruz
            lines = lines.map(line => line.includes('Ticketi Sahiplenen Yetkili -->') ? `📌 Ticketi Sahiplenen Yetkili --> <@${user.id}>` : line);

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_tr').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId('lock_tr').setEmoji('1466044664346968309').setStyle(ButtonStyle.Secondary)
            );

            await mainMsg.edit({ embeds: [EmbedBuilder.from(mainMsg.embeds[0]).setDescription(lines.join('\n'))], components: [disabledRow] });

            const claimRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim_tr').setEmoji('📌').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('Green').setDescription(`**Ticket <@${user.id}> tarafından sahiplenildi.**`)], 
                components: [claimRow] 
            });
        }

        // --- BIRAKMA (UNCLAIM) ---
        if (customId === 'unclaim_tr') {
            if (!member.roles.cache.has(staffRole)) return;

            await Yetkili.findOneAndUpdate({ yetkiliId: user.id }, { $inc: { toplamTicketSahiplenme: -1 } });

            const pins = await channel.messages.fetchPinned();
            const mainMsg = pins.find(m => m.embeds[0]?.description.includes('Ticket Bilgileri'));

            let lines = mainMsg.embeds[0].description.split('\n');
            lines = lines.map(line => line.includes('Ticketi Sahiplenen Yetkili -->') ? `📌 Ticketi Sahiplenen Yetkili --> \`Ticket Sahiplenilmedi\`` : line);

            const enabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_tr').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success).setDisabled(false),
                new ButtonBuilder().setCustomId('lock_tr').setEmoji('1466044664346968309').setStyle(ButtonStyle.Secondary)
            );

            await mainMsg.edit({ embeds: [EmbedBuilder.from(mainMsg.embeds[0]).setDescription(lines.join('\n'))], components: [enabledRow] });
            
            // Kırmızı embed ve altında YENİ SAHİPLENME BUTONU (Senin istediğin)
            const reClaimRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_tr').setEmoji('1466044628506771588').setStyle(ButtonStyle.Success)
            );

            return interaction.update({ 
                embeds: [new EmbedBuilder().setColor('Red').setDescription(`**<@${user.id}> sahipliği bıraktı. Sahiplenmek için butona bas!**`)], 
                components: [reClaimRow] 
            });
        }
        
        // --- DİĞER BUTONLAR (LOCK/DELETE) ---
        if (customId === 'lock_tr') {
            return interaction.reply({ 
                content: 'Emin misin?', 
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_lock').setLabel('Evet').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel').setLabel('Hayır').setStyle(ButtonStyle.Secondary)
                )] 
            });
        }
        if (customId === 'confirm_lock') return interaction.channel.delete();
    }
};