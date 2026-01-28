const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');
const Yetkili = require('./models/Yetkili'); // Model yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-tr')
        .setDescription('Ticket sistemini kurar.')
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Ticket mesajının atılacağı kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        // Bot Sahibi Kontrolü
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: 'Bu komutu sadece bot sahibi kullanabilir.', ephemeral: true });
        }

        const kanal = interaction.options.getChannel('kanal');

        const setupEmbed = new EmbedBuilder()
            .setTitle('🎟️ Ticket 🎟️')
            .setDescription(`
**Herhangi Bir Konu Hakkında Bilgi Almak İçin <:zyphera_info:1466034688903610471> Butonuna Tıklayın
Şikayet İçin <:zyphera_yonetici:1464095317526839296> Butonuna Tıklayın
Yetkili Başvurusu İçin <a:zyphera_parca:1464095414201352254> Butonuna Tıklayın
Yukarıdaki Konulardan Hariç Ticket Açmak İçin <a:zyphera_yukleniyor:1464095331863101514> Butonuna Tıklayın**`)
            .setColor('Random');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_bilgi').setEmoji('1466034688903610471').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_sikayet').setEmoji('1464095317526839296').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_basvuru').setEmoji('1464095414201352254').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_diger').setEmoji('1464095331863101514').setStyle(ButtonStyle.Secondary),
        );

        await kanal.send({ embeds: [setupEmbed], components: [row] });
        await interaction.reply({ content: 'Ticket sistemi başarıyla kuruldu!', ephemeral: true });
    }
};