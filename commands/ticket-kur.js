const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    // Discord v14 Slash Command Yapısı (data zorunludur)
    data: new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('Ticket sisteminin panelini kanala kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sadece Yönetici yetkisi olanlar görebilir

    async execute(interaction) {
        // İsimlendirmeyi 'interaction' olarak alıyoruz
        const client = interaction.client;

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

        // Mesajı gönder
        await interaction.reply({ content: 'Ticket paneli başarıyla oluşturuldu!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};