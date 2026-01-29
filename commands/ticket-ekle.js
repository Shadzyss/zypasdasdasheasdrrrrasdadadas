const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Staff } = require('../models/ticketSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-ekle')
        .setDescription('Yetkiliye ticket puanı ekler / Adds staff ticket points.')
        .addUserOption(opt => opt.setName('kullanıcı').setDescription('Yetkili / Staff').setRequired(true))
        .addIntegerOption(opt => opt.setName('sayı').setDescription('Miktar / Amount').setRequired(true)),
    async execute(interaction) {
        const isUs = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);
        
        const sendError = (msg) => {
            const errEmbed = new EmbedBuilder().setColor('Red').setDescription(`**${msg}**`);
            return interaction.reply({ embeds: [errEmbed], ephemeral: true });
        };

        if (!interaction.member.roles.cache.has(process.env.YETKILI_SORUMLUSU_ROL_ID)) {
            return sendError(isUs ? '❌ No permission!' : '❌ Bu komutu kullanmak için yetkin yok!');
        }

        const user = interaction.options.getUser('kullanıcı');
        const count = interaction.options.getInteger('sayı');

        if (user.bot) {
            return sendError(isUs ? '❌ You cannot add points to bots!' : '❌ Botlara puan ekleyemezsin!');
        }

        await Staff.findOneAndUpdate({ userID: user.id }, { $inc: { claimCount: count } }, { upsert: true });

        if (isUs) {
            const usEmbed = new EmbedBuilder()
                .setTitle('Ticket Claim Count Added')
                .setDescription(`**${interaction.user} Successfully added \`${count}\` points to ${user}**`)
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