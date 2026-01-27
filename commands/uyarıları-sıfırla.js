const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema'); // Şema yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarıları-sıfırla')
        .setDescription('Sunucudaki Yüm Yetkililerin Uyarılarını Temizler.'),

    async execute(interaction) {
        const { guild, member } = interaction;

        // --- AYARLAR ---
        const REQUIRED_ROLE_ID = process.env.YETKILI_SORUMLUSU_ROL_ID;
        const LOG_CHANNEL_ID = process.env.WARN_LOG_ID;
        const US_ROLE = process.env.ROLE_ID_ENGLISH;

        // --- DİL KONTROLLERİ ---
        const executorIsEN = member.roles.cache.has(US_ROLE);

        // --- YETKİ KONTROLÜ ---
        if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "❌ Failed" : "❌ Başarısız")
                .setDescription(executorIsEN 
                    ? `**You Must Have The <@&${REQUIRED_ROLE_ID}> Role To Use This Command**`
                    : `**Bu Komutu Kullanmak İçin <@&${REQUIRED_ROLE_ID}> Rolüne Sahip Olmalısınız**`)
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- VERİTABANI TOPLU SIFIRLAMA ---
        // updateMany ile tüm dökümanların warnCount'unu 0, logs dizisini boş yapıyoruz
        await warnModel.updateMany({ guildId: guild.id }, { $set: { warnCount: 0, logs: [] } });

        // --- KANAL YANITI ---
        const successEmbed = new EmbedBuilder()
            .setTitle(executorIsEN ? "✅ Success" : "✅ Başarılı")
            .setDescription(executorIsEN
                ? `**${member} Has Successfully Reset All Staff members' Warnings.**`
                : `**${member} Başarıyla Bütün Yetkililerin Uyarıları Sıfırlandı**`)
            .setColor("Green");

        await interaction.reply({ embeds: [successEmbed] });

        // --- LOG MESAJI (SADECE TÜRKÇE) ---
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("Bütün Yetkililerin Uyarıları Sıfırlandı")
                .setDescription(`**${member} Tarafından Bütün Yetkililerin Uyarıları Sıfırlandı**`)
                .setColor("Random");
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};