const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema'); // Şema yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı-sorgula')
        .setDescription('Bir kullanıcının uyarı geçmişini gösterir.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarılarına bakılacak kullanıcı').setRequired(false)),

    async execute(interaction) {
        // Eğer kullanıcı seçilmediyse komutu kullanan kişiyi hedef al
        const target = interaction.options.getMember('kullanıcı') || interaction.member;
        const { guild, member } = interaction;

        // --- ID'LER VE DİL KONTROLÜ ---
        const US_ROLE = process.env.ROLE_ID_ENGLISH;
        const executorIsEN = member.roles.cache.has(US_ROLE);

        // --- VERİTABANINDAN VERİ ÇEKME ---
        const data = await warnModel.findOne({ guildId: guild.id, userId: target.id });

        // Eğer hiç uyarısı yoksa
        if (!data || data.logs.length === 0) {
            const noWarnEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "No Warnings" : "Uyarı Bulunamadı")
                .setDescription(executorIsEN 
                    ? `**${target} has no warnings in the system.**` 
                    : `**${target} adlı kullanıcının sistemde hiç uyarısı bulunmuyor.**`)
                .setColor("Yellow");
            return interaction.reply({ embeds: [noWarnEmbed] });
        }

        // --- EMBED OLUŞTURMA ---
        const totalWarns = data.warnCount;
        const embed = new EmbedBuilder()
            .setTitle(executorIsEN 
                ? `${target.user.username}'s Total Warnings (${totalWarns}/3)` 
                : `${target.user.username} Adlı Kişinin Toplam Uyarıları (${totalWarns}/3)`)
            .setColor("Random");

        // Son 10 uyarıyı listele (Embed sınırı için)
        const logEntries = data.logs.slice(-10).reverse(); // En yeni uyarılardan başla
        
        let descriptionText = "";

        logEntries.forEach((log, index) => {
            const timestamp = Math.floor(new Date(log.timestamp).getTime() / 1000);
            
            if (executorIsEN) {
                descriptionText += `**${index + 1}. Warning**\n⚒️ Moderator: <@${log.moderatorId}>\n🧾 Reason: \`${log.reason}\`\n⏱️ Time: <t:${timestamp}:F>\n\n`;
            } else {
                descriptionText += `**${index + 1}. Uyarı**\n⚒️ Uyarıyı Veren Yetkili: <@${log.moderatorId}>\n🧾 Uyarı Sebebi: \`${log.reason}\`\n⏱️ Uyarının Verildiği Zaman: <t:${timestamp}:F>\n\n`;
            }
        });

        // Alt kısma toplam uyarıyı ekle
        const footerText = executorIsEN 
            ? `🔢 Total Warning Count --> ${totalWarns}` 
            : `🔢 Kişinin Toplam Uyarı Sayısı --> ${totalWarns}`;
        
        embed.setDescription(descriptionText + `**${footerText}**`);

        await interaction.reply({ embeds: [embed] });
    }
};