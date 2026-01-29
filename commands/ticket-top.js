const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Staff } = require('../models/ticketSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-top')
        .setDescription('Shows the staff leaderboard for claimed tickets.'),
    async execute(interaction) {
        // Rolleri .env'den çekiyoruz
        const ROLE_TR = process.env.ROLE_ID_TURKISH;
        const ROLE_EN = process.env.ROLE_ID_ENGLISH;

        // Dil belirleme
        let language = 'TR'; // Varsayılan dil
        if (interaction.member.roles.cache.has(ROLE_EN)) {
            language = 'EN';
        } else if (interaction.member.roles.cache.has(ROLE_TR)) {
            language = 'TR';
        }

        // Veritabanından en çok sahiplenenden başlayarak ilk 10 yetkiliyi çek
        const topStaff = await Staff.find().sort({ claimCount: -1 }).limit(10);

        // Çeviriler
        const translations = {
            TR: {
                title: 'En Çok Ticket Sahiplenen Yetkililer',
                noData: 'Henüz hiç ticket sahiplenilmemiş.',
                footer: 'Zyphera İstatistik Sistemi'
            },
            EN: {
                title: 'Staff Leaderboard (Claimed Tickets)',
                noData: 'No tickets have been claimed yet.',
                footer: 'Zyphera Statistics System'
            }
        };

        const t = translations[language];

        const embed = new EmbedBuilder()
            .setTitle(t.title)
            .setColor('Random')
            .setTimestamp()
            .setFooter({ text: t.footer });

        if (topStaff.length === 0) {
            embed.setDescription(t.noData);
        } else {
            const leaderboard = topStaff.map((staff, index) => {
                // Her bir yetkiliyi listele (1-) @yetkili --> 5)
                return `**${index + 1}-) <@${staff.userID}> --> \`${staff.claimCount}\`**`;
            }).join('\n');

            embed.setDescription(leaderboard);
        }

        await interaction.reply({ embeds: [embed] });
    },
};