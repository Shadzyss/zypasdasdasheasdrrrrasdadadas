const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Staff } = require('../models/ticketSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-ekle')
        .setDescription('Yetkiliye ticket puanı ekler / Adds staff ticket points.')
        .addUserOption(opt => opt.setName('kullanıcı').setDescription('Yetkili / Staff').setRequired(true))
        .addIntegerOption(opt => opt.setName('sayı').setDescription('Miktar / Amount').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(process.env.YETKILI_SORUMLUSU_ROL_ID)) return interaction.reply({ content: '❌ Yetkin yok! / No permission!', ephemeral: true });

        const user = interaction.options.getUser('kullanıcı');
        const count = interaction.options.getInteger('sayı');
        await Staff.findOneAndUpdate({ userID: user.id }, { $inc: { claimCount: count } }, { upsert: true });

        if (interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH)) {
            const usEmbed = new EmbedBuilder()
                .setTitle('Ticket Claim Count Added')
                .setDescription(`**${interaction.user} Successfully added \`${count}\` Ticket Claim Count to ${user}**`)
                .setColor('Green');
            return interaction.reply({ embeds: [usEmbed] });
        }

        const trEmbed = new EmbedBuilder()
            .setTitle('Ticket Sahiplenme Sayısı Eklendi')
            .setDescription(`**${interaction.user} Başarıyla ${user} Adlı Kişiden \`${count}\` Kadar Ticket Sahiplenme Sayısı Eklendi**`)
            .setColor('Green');
        return interaction.reply({ embeds: [trEmbed] });
    },
};