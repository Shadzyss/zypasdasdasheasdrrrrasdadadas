const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Ticket panelini kurar.')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Panel dili / Panel language')
                .setRequired(true)
                .addChoices(
                    { name: 'Turkish (TR)', value: 'tr' },
                    { name: 'English (EN)', value: 'en' }
                )),
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return interaction.reply({ content: '❌ Owner only!', ephemeral: true });

        const lang = interaction.options.getString('language');
        const isEn = lang === 'en';

        const embed = new EmbedBuilder()
            .setTitle(isEn ? 'Zyphera Support System' : 'Zyphera Destek Sistemi')
            .setDescription(isEn ? 'Select a topic to open a ticket.' : 'Bir talep oluşturmak için konu seçiniz.')
            .setColor('Blurple');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ticket_info_${lang}`).setLabel(isEn ? 'Information' : 'Bilgi Al').setStyle(ButtonStyle.Primary).setEmoji('<:zyphera_info:1466034688903610471>'),
            new ButtonBuilder().setCustomId(`ticket_sikayet_${lang}`).setLabel(isEn ? 'Complaint' : 'Şikayet').setStyle(ButtonStyle.Danger).setEmoji('<:zyphera_kalkan:1466034432183111761>'),
            new ButtonBuilder().setCustomId(`ticket_basvuru_${lang}`).setLabel(isEn ? 'Application' : 'Başvuru').setStyle(ButtonStyle.Success).setEmoji('<a:zyphera_parca:1464095414201352254>'),
            new ButtonBuilder().setCustomId(`ticket_destek_${lang}`).setLabel(isEn ? 'Support' : 'Destek').setStyle(ButtonStyle.Secondary).setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
        );

        await interaction.reply({ content: `✅ ${lang.toUpperCase()} panel created.`, ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [buttons] });
    },
};