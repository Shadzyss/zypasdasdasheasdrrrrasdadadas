const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'ticket-kur', // Slash command veya prefix komutu olarak ayarlayabilirsin
    run: async (client, interaction) => {
        // Sadece yöneticiler kullanabilsin
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('Destek Merkezi')
            .setDescription('Aşağıdaki butonları kullanarak ilgili kategoride destek talebi oluşturabilirsiniz.')
            .setColor('#2b2d31')
            .setThumbnail(interaction.guild.iconURL());

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_info')
                .setLabel('Bilgi Almak')
                .setEmoji('<:zyphera_info:1466034688903610471>')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('create_sikayet')
                .setLabel('Şikayet')
                .setEmoji('<:zyphera_kalkan:1466034432183111761>')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('create_basvuru')
                .setLabel('Yetkili Başvurusu')
                .setEmoji('<a:zyphera_parca:1464095414201352254>')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('create_diger')
                .setLabel('Diğer')
                .setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ content: 'Ticket paneli oluşturuldu!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};