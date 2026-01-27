const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema'); // Şema yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı-sil')
        .setDescription('Bir kullanıcının uyarısını/uyarılarını silsin.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarısı silinecek kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Uyarının silinme sebebi').setRequired(true))
        .addIntegerOption(option => option.setName('miktar').setDescription('Silinecek uyarı sayısı').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');
        const amount = interaction.options.getInteger('miktar') || 1; // Miktar girilmezse 1 kabul et
        const { guild, member } = interaction;

        // --- AYARLAR ---
        const REQUIRED_ROLE_ID = "1465687261881569343";
        const LOG_CHANNEL_ID = "1465664178923503718";
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

        // --- SİLME MANTIĞI ---
        // Eğer girilen miktar mevcut uyarısından fazlaysa, hepsini sil
        const silinecekMiktar = amount > data.warnCount ? data.warnCount : amount;

        data.warnCount -= silinecekMiktar;
        
        // Logs dizisinden sondan başlayarak silinecek miktar kadar kaydı çıkar
        for (let i = 0; i < silinecekMiktar; i++) {
            data.logs.pop();
        }

        await data.save();

        const currentWarns = data.warnCount;
        const timestamp = Math.floor(Date.now() / 1000);

        // --- KANAL YANITI ---
        const successEmbed = new EmbedBuilder()
            .setTitle(executorIsEN ? "✅ Success" : "✅ Başarılı")
            .setDescription(executorIsEN
                ? `**${member} successfully deleted \`${silinecekMiktar}\` warning(s) for ${target} for \`${reason}\`. Total warning count --> \`${currentWarns}\`**`
                : `**${member} Başarıyla ${target} Adlı Kişi \`${reason}\` Sebebiyle \`${silinecekMiktar}\` Adet Uyarısı Silindi Kişinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`)
            .setColor("Green");

        await interaction.reply({ embeds: [successEmbed] });

        // --- DM MESAJI ---
        const dmEmbed = new EmbedBuilder()
            .setTitle(targetIsEN ? "Warning Removed" : "Uyarınız Silindi")
            .setDescription(targetIsEN
                ? `**⚒️ Moderator --> ${member}\n🧾 Reason for Removal --> \`${reason}\`\n🔢 Removed Amount --> \`${silinecekMiktar}\`\n⏱️ Time --> <t:${timestamp}:F>\n🔢 Your Total Warnings --> \`${currentWarns}\`**`
                : `**⚒️ Uyarıyı Silen Yetkili --> ${member}\n🧾 Uyarının Silinme Sebebi --> \`${reason}\`\n🔢 Silinen Uyarı Miktarı --> \`${silinecekMiktar}\`\n⏱️ Uyarının Silindiği Zaman --> <t:${timestamp}:F>\n🔢 Toplam Uyarı Sayınız --> \`${currentWarns}\`**`)
            .setColor("Random");

        await target.send({ embeds: [dmEmbed] }).catch(() => {});

        // --- LOG MESAJI ---
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("Bir Yetkilinin Uyarısı Silindi")
                .setDescription(`**⚒️ Uyarıyı Silen Yetkili --> ${member}\n👑 Uyarısı Silinen Yetkili --> ${target}\n🧾 Uyarının Silinme Sebebi --> \`${reason}\`\n🔢 Silinen Uyarı Miktarı --> \`${silinecekMiktar}\`\n⏱️ Uyarının Silindiği Zaman --> <t:${timestamp}:F>\n🔢 Uyarısı Silinen Yetkilinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`)
                .setColor("Random");
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};