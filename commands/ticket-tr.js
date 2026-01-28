const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-tr')
        .setDescription('Ticket sistemini kurar')
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Panelin gönderileceği kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
        // Sahip Kontrolü
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: 'Bu komutu sadece bot sahibi kullanabilir.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kanal');

        const embed = new EmbedBuilder()
            .setTitle('🎟️ Ticket 🎟️')
            .setDescription(`**Herhangi Bir Konu Hakkında Bilgi Almak İçin <:zyphera_info:1466034688903610471> Butonuna Tıklayın\nŞikayet İçin <:zyphera_yonetici:1464095317526839296> Butonuna Tıklayın\nYetkili Başvurusu İçin <a:zyphera_parca:1464095414201352254> Butonuna Tıklayın\nYukarıdaki Konulardan Hariç Ticket Açmak İçin <a:zyphera_yukleniyor:1464095331863101514> Butonuna Tıklayın**`)
            .setColor('Random');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('t_info').setEmoji('1466034688903610471').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('t_sikayet').setEmoji('1464095317526839296').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('t_basvuru').setEmoji('1464095414201352254').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('t_diger').setEmoji('1464095331863101514').setStyle(ButtonStyle.Secondary)
            );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Ticket paneli başarıyla kuruldu!', ephemeral: true });
    },
};