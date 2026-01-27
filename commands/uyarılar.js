const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema'); // Şema yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarılar')
        .setDescription('Uyarı Almış Tüm Yetkilileri Listeler.'),

    async execute(interaction) {
        const { guild, member } = interaction;

        // --- DİL KONTROLÜ ---
        const US_ROLE = process.env.ROLE_ID_ENGLISH;
        const executorIsEN = member.roles.cache.has(US_ROLE);

        // --- VERİTABANINDAN TÜM UYARILARI ÇEKME ---
        // Sadece uyarısı 0'dan büyük olanları getirir
        const allWarns = await warnModel.find({ guildId: guild.id, warnCount: { $gt: 0 } });

        if (!allWarns || allWarns.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "No Warned Staff" : "Uyarı Alan Yetkili Yok")
                .setDescription(executorIsEN 
                    ? "**There Are No Staff Members With Active Warnings.**" 
                    : "**Şu Anda Aktif Bir Uyarısı Olan Yetkili Bulunmuyor.")
                .setColor("Yellow");
            return interaction.reply({ embeds: [emptyEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(executorIsEN ? "Warned Staff Members" : "Uyarı Alan Yetkililer")
            .setColor("Random")
            .setFooter({ 
                text: executorIsEN 
                    ? "To See Details, Use /uyarı-sorgula <user>" 
                    : "Uyarıları Detaylı Görmek İçin /uyarı-sorgula <kullanıcı>" 
            });

        let descriptionText = "";

        allWarns.forEach(data => {
            if (executorIsEN) {
                descriptionText += `**👑 Staff Member --> <@${data.userId}>\n🔢 Total Warnings --> \`${data.warnCount}\`**\n\n`;
            } else {
                descriptionText += `**👑 Uyarı Alan Yetkili --> <@${data.userId}>\n🔢 Toplam Uyarı Sayısı --> \`${data.warnCount}\`**\n\n`;
            }
        });

        embed.setDescription(descriptionText);

        await interaction.reply({ embeds: [embed] });
    }
};