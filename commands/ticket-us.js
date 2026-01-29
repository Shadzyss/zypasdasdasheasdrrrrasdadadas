const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-us')
        .setDescription('Ticket Panel Kur'),
    async execute(interaction) {
        
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only The Bot Owner Can Use This Command!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Zyphera Support System')
            .setDescription('You can create a request by selecting the topic you need help with from the buttons below.')
            .addFields(
                { name: '<:zyphera_info:1466034688903610471> For Information', value: 'Click On The <:zyphera_info:1466034688903610471> Button For Information', inline: true },
                { name: '<:zyphera_kalkan:1466034432183111761> For Complaint', value: 'Click On The <:zyphera_kalkan:1466034432183111761> Button To Report a Complaint', inline: true },
                { name: '<a:zyphera_parca:1464095414201352254> Staff Application', value: 'Click On The <a:zyphera_parca:1464095414201352254> Button To Apply For Staff', inline: true },
                { name: '<a:zyphera_yukleniyor:1464095331863101514> Other Support', value: 'Click On The <a:zyphera_yukleniyor:1464095331863101514> Button For Other Support', inline: true }
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

        await interaction.reply({ content: '✅ Ticket Panel Is Being Set Up...', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [buttons] });
    },
};