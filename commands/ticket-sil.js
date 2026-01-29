const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Staff } = require('../models/ticketSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-sil')
        .setDescription('Yetkiliden Ticket Sahiplenme Sayısını Siler')
        .addUserOption(opt => opt.setName('kullanıcı').setDescription('Yetkili / Staff').setRequired(true))
        .addIntegerOption(opt => opt.setName('sayı').setDescription('Miktar / Amount').setRequired(true)),
    async execute(interaction) {
        const isUs = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);
        
        // Hata Embed Fonksiyonu (Kod kalabalığı yapmasın diye)
        const sendError = (msg) => {
            const errEmbed = new EmbedBuilder().setColor('Red').setDescription(`**${msg}**`);
            return interaction.reply({ embeds: [errEmbed], ephemeral: true });
        };

        // Yetki Kontrolü
        if (!interaction.member.roles.cache.has(process.env.YETKILI_SORUMLUSU_ROL_ID)) {
            return sendError(isUs ? '❌ No Permission!' : '❌ Bu Komutu Kullanmak İçin Yetkin Yok!');
        }

        const user = interaction.options.getUser('kullanıcı');
        const count = interaction.options.getInteger('sayı');

        // Bot Kontrolü
        if (user.bot) {
            return sendError(isUs ? '❌ You Cannot Perform This Action On Bots!' : '❌ Botlar Üzerinde Bu İşlemi Yapamazsın!');
        }

        const staffData = await Staff.findOne({ userID: user.id });
        const currentPoints = staffData ? staffData.claimCount : 0;

        // 0 Puan Kontrolü
        if (currentPoints <= 0) {
            return sendError(isUs ? `❌ ${user.username} Already Has 0 Points!` : `❌ ${user.username} Adlı Kişinin Puanı Zaten 0!`);
        }

        const finalCount = count > currentPoints ? currentPoints : count;
        await Staff.findOneAndUpdate({ userID: user.id }, { $inc: { claimCount: -finalCount } }, { upsert: true });

        // Başarı Mesajları
        if (isUs) {
            const usEmbed = new EmbedBuilder()
                .setTitle('Ticket Claim Count Deleted')
                .setDescription(`**${interaction.user} Successfully Deleted \`${finalCount}\` Points From ${user}**`)
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