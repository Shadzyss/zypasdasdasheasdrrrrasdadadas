const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-tr')
        .setDescription('Türkçe Ticket sistemini kurar.')
        .addChannelOption(option => option.setName('kanal').setDescription('Ticket mesajının atılacağı kanal').setRequired(true)),

    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: 'Bu komutu sadece bot sahibi kullanabilir.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kanal');

        const embed = new EmbedBuilder()
            .setTitle('🎟️ Ticket 🎟️')
            .setDescription(`**Merhaba Değerli Üyelerimiz Lütfen Ticket Oluştururken Alttaki Kategorilerden Birisini Seçin\n\nBilgi Almak İçin <a:zyphera_raptiye:1464095171921842290> Butonuna Tıklayın\nŞikayet İçin <:zyphera_staff:1464097154820997236> Butonuna Tıklayın\nYetkili Başvurusu İçin <a:zyphera_parca:1464095414201352254> Butonuna Tıklayın\nYukarıdaki Kategorilerden Hariç Ticket Oluşturmak İçin <a:zyphera_yukleniyor:1464095331863101514> Butonuna Basın**`)
            .setColor('Random');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tkt_bilgi').setEmoji('1464095171921842290').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tkt_sikayet').setEmoji('1464097154820997236').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tkt_basvuru').setEmoji('1464095414201352254').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tkt_diger').setEmoji('1464095331863101514').setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Ticket sistemi başarıyla kuruldu!', ephemeral: true });
    }
};