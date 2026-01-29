const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Staff } = require('../models/ticketSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-sil')
        .setDescription('Yetkiliden ticket puanı siler / Deletes staff ticket points.')
        .addUserOption(opt => opt.setName('kullanıcı').setDescription('Yetkili / Staff').setRequired(true))
        .addIntegerOption(opt => opt.setName('sayı').setDescription('Miktar / Amount').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(process.env.YETKILI_SORUMLUSU_ROL_ID)) return interaction.reply({ content: '❌ No permission!', ephemeral: true });

        const user = interaction.options.getUser('kullanıcı');
        const count = interaction.options.getInteger('sayı');
        const isUs = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        // --- 1. BOT KONTROLÜ ---
        if (user.bot) {
            return interaction.reply({ 
                content: isUs ? '❌ You cannot perform this action on bots!' : '❌ Botlar üzerinde bu işlemi yapamazsın!', 
                ephemeral: true 
            });
        }

        // --- 2. 0 PUAN KONTROLÜ ---
        const staffData = await Staff.findOne({ userID: user.id });
        const currentPoints = staffData ? staffData.claimCount : 0;

        if (currentPoints <= 0) {
            return interaction.reply({ 
                content: isUs ? `❌ ${user.username} already has 0 points, cannot decrease further!` : `❌ ${user.username} adlı kişinin puanı zaten 0, daha fazla düşüremezsin!`, 
                ephemeral: true 
            });
        }

        // Puan silme (Puanın 0'ın altına düşmemesini garantiye alıyoruz)
        const finalCount = count > currentPoints ? currentPoints : count;
        await Staff.findOneAndUpdate({ userID: user.id }, { $inc: { claimCount: -finalCount } }, { upsert: true });

        if (isUs) {
            const usEmbed = new EmbedBuilder()
                .setTitle('Ticket Claim Count Deleted')
                .setDescription(`**${interaction.user} Successfully deleted \`${finalCount}\` points from ${user}**`)
                .setColor('Green');
            return interaction.reply({ embeds: [usEmbed] });
        } 

        const trEmbed = new EmbedBuilder()
            .setTitle('Ticket Sahiplenme Sayısı Silindi')
            .setDescription(`**${interaction.user} Başarıyla ${user} Adlı Kişiden \`${finalCount}\` Kadar Ticket Sahiplenme Sayısı Silindi**`)
            .setColor('Green');
        return interaction.reply({ embeds: [trEmbed] });
    },
};