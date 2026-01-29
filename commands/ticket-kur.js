const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('Ticket panelini kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sadece adminler kurabilir
    async execute(interaction) {
        
        const embed = new EmbedBuilder()
            .setTitle('Zyphera Destek Sistemi')
            .setDescription('Yardıma ihtiyacın olan konuyu aşağıdaki butonlardan seçerek bir talep oluşturabilirsin.')
            .addFields(
                { name: 'ℹ️ Bilgi Almak İçin', value: 'Bilgi almak için ticket açar.', inline: true },
                { name: '🛡️ Şikayet İçin', value: 'Şikayet talebi oluşturur.', inline: true },
                { name: '🧩 Yetkili Başvurusu', value: 'Ekibimize katılmak için başvuru açar.', inline: true },
                { name: '⏳ Diğer Destek', value: 'Genel konular için destek talebi.', inline: true }
            )
            .setColor('Blurple')
            .setFooter({ text: 'Zyphera Ticket Sistemi' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_info')
                .setEmoji('<:zyphera_info:1466034688903610471>')
                .setLabel('Bilgi Al')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_sikayet')
                .setEmoji('<:zyphera_kalkan:1466034432183111761>')
                .setLabel('Şikayet')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_basvuru')
                .setEmoji('<a:zyphera_parca:1464095414201352254>')
                .setLabel('Başvuru')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_destek')
                .setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
                .setLabel('Destek')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ content: 'Ticket paneli başarıyla kuruldu!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [buttons] });
    },
};