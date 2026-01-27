const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema'); // Şema yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı-sil')
        .setDescription('Bir kullanıcının uyarısını siler.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarısı silinecek kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Uyarının silinme sebebi').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');
        const { guild, member } = interaction;

        // --- AYARLAR ---
        const REQUIRED_ROLE_ID = process.env.YETKILI_SORUMLUSU_ROL_ID;
        const LOG_CHANNEL_ID = process.env.WARN_LOG_ID;
        const US_ROLE = process.env.ROLE_ID_ENGLISH;

        // --- DİL KONTROLLERİ ---
        const executorIsEN = member.roles.cache.has(US_ROLE);
        const targetIsEN = target.roles.cache.has(US_ROLE);

        // --- YETKİ KONTROLÜ ---
        if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "❌ No Permission" : "❌ Yetkin Yok")
                .setDescription(executorIsEN 
                    ? `**You must have the <@&${REQUIRED_ROLE_ID}> role to use this command**`
                    : `**Bu Komutu Kullanabilmek İçin <@&${REQUIRED_ROLE_ID}> Adlı Rolüne Sahip Olmalısın**`)
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- VERİTABANI İŞLEMİ ---
        let data = await warnModel.findOne({ guildId: guild.id, userId: target.id });

        if (!data || data.warnCount === 0) {
            const noWarn = new EmbedBuilder()
                .setTitle(executorIsEN ? "Error" : "Hata")
                .setDescription(executorIsEN ? "This user has no warnings to delete." : "Bu kullanıcının zaten silinecek bir uyarısı yok.")
                .setColor("Red");
            return interaction.reply({ embeds: [noWarn], ephemeral: true });
        }

        // Uyarısını 1 azalt ve son log kaydını sil
        data.warnCount -= 1;
        data.logs.pop(); // En son eklenen uyarı kaydını listeden çıkarır
        await data.save();

        const currentWarns = data.warnCount;
        const timestamp = Math.floor(Date.now() / 1000);

        // --- KANAL YANITI (BAŞARILI) ---
        const successEmbed = new EmbedBuilder()
            .setTitle(executorIsEN ? "✅ Success" : "✅ Başarılı")
            .setDescription(executorIsEN
                ? `**${member} successfully deleted a warning for ${target} for \`${reason}\`. Total warning count --> \`${currentWarns}\`**`
                : `**${member} Başarıyla ${target} Adlı Kişi \`${reason}\` Sebebiyle Uyarısı Silindi Kişinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`)
            .setColor("Green");

        await interaction.reply({ embeds: [successEmbed] });

        // --- DM MESAJI ---
        const dmEmbed = new EmbedBuilder()
            .setTitle(targetIsEN ? "Warning Removed" : "Uyarınız Silindi")
            .setDescription(targetIsEN
                ? `**⚒️ Moderator --> ${member}\n🧾 Reason for Removal --> \`${reason}\`\n⏱️ Time --> <t:${timestamp}:F>\n🔢 Your Total Warnings --> \`${currentWarns}\`**`
                : `**⚒️ Uyarıyı Silen Yetkili --> ${member}\n🧾 Uyarının Silinme Sebebi --> \`${reason}\`\n⏱️ Uyarının Silindiği Zaman --> <t:${timestamp}:F>\n🔢 Toplam Uyarı Sayınız --> \`${currentWarns}\`**`)
            .setColor("Random");

        await target.send({ embeds: [dmEmbed] }).catch(() => {});

        // --- LOG MESAJI (SADECE TÜRKÇE) ---
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("Bir Yetkilinin Uyarısı Silindi")
                .setDescription(`**⚒️ Uyarıyı Silen Yetkili --> ${member}\n👑 Uyarısı Silinen Yetkili --> ${target}\n🧾 Uyarının Silinme Sebebi --> \`${reason}\`\n⏱️ Uyarının Silindiği Zaman --> <t:${timestamp}:F>\n🔢 Uyarısı Silinen Yetkilinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`)
                .setColor("Random");
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};