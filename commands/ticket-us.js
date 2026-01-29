const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-us')
        .setDescription('Only the bot owner can setup the English ticket panel.'),
    async execute(interaction) {
        
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the bot owner can use this command!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Zyphera Support System')
            .setDescription('You can create a request by selecting the topic you need help with from the buttons below.')
            .addFields(
                { name: 'ℹ️ For Information', value: 'Open a ticket to get information.', inline: true },
                { name: '🛡️ For Complaint', value: 'Create a complaint request.', inline: true },
                { name: '🧩 Staff Application', value: 'Apply to join our team.', inline: true },
                { name: '⏳ Other Support', value: 'Support request for general topics.', inline: true }
            )
            .setColor('Blurple')
            .setFooter({ text: 'Zyphera Ticket System' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_info_us')
                .setEmoji('<:zyphera_info:1466034688903610471>')
                .setLabel('Get Info')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_sikayet_us')
                .setEmoji('<:zyphera_kalkan:1466034432183111761>')
                .setLabel('Complaint')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_basvuru_us')
                .setEmoji('<a:zyphera_parca:1464095414201352254>')
                .setLabel('Application')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_destek_us')
                .setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
                .setLabel('Support')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ content: '✅ Ticket panel is being set up...', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [buttons] });
    },
};