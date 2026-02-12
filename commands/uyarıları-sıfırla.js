const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarıları-sıfırla')
        .setDescription('Sunucudaki Tüm Yetkililerin Uyarılarını ve Rollerini Temizler.'),

    async execute(interaction) {
        const { guild, member } = interaction;

        // --- AYARLAR ---
        const REQUIRED_ROLE_ID = process.env.YETKILI_SORUMLUSU_ROL_ID;
        const LOG_CHANNEL_ID = process.env.WARN_LOG_ID;
        const US_ROLE = process.env.ROLE_ID_ENGLISH;

        // !!! BURAYI DOLDURMAN GEREKİYOR !!!
        // Kullanıcılardan silinmesini istediğin uyarı rollerinin ID'lerini buraya yaz.
        // Örnek: [process.env.WARN_ROLE_1, process.env.WARN_ROLE_2] veya ["ID1", "ID2"]
        const WARN_ROLE_IDS = [
            process.env.WARN_ROLE_1, // 1. Uyarı Rolü ID'si (env dosyasındaysa)
            process.env.WARN_ROLE_2, // 2. Uyarı Rolü ID'si
            process.env.WARN_ROLE_3  // 3. Uyarı Rolü ID'si
        ]; 

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

        // --- İŞLEM BAŞLIYOR (Bekletme Mesajı) ---
        // Toplu rol alma işlemi uzun sürebileceği için deferReply kullanıyoruz.
        await interaction.deferReply();

        try {
            // 1. ADIM: Veritabanını Sıfırla
            await warnModel.updateMany({ guildId: guild.id }, { $set: { warnCount: 0, logs: [] } });

            // 2. ADIM: Sunucudaki Uyarı Rollerini Temizle
            // Sunucudaki tüm üyeleri çekiyoruz (cache eksik olabilir diye fetch yapıyoruz)
            const allMembers = await guild.members.fetch();

            // Sadece uyarı rolü olan üyeleri filtrele (İşlem yükünü azaltmak için)
            // hasAny: Belirttiğimiz rollerden HERHANGİ BİRİNE sahipse true döner
            const membersWithWarns = allMembers.filter(m => m.roles.cache.hasAny(...WARN_ROLE_IDS));

            // Döngüye sokup rolleri alıyoruz
            for (const [id, targetMember] of membersWithWarns) {
                // remove fonksiyonu dizi kabul eder, tüm uyarı rollerini tek seferde sileriz
                await targetMember.roles.remove(WARN_ROLE_IDS).catch(err => {
                    console.log(`Rol alınamadı (${targetMember.user.tag}):`, err);
                });
            }

            // --- KANAL YANITI ---
            const successEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "✅ Success" : "✅ Başarılı")
                .setDescription(executorIsEN
                    ? `**${member} Has Successfully Reset All Staff members' Warnings and Roles.**`
                    : `**${member} Tarafından Bütün Yetkililerin Veritabanı Uyarıları ve Fiziksel Rolleri Sıfırlandı.**`)
                .setColor("Green");

            // deferReply kullandığımız için editReply ile yanıtlıyoruz
            await interaction.editReply({ embeds: [successEmbed] });

            // --- LOG MESAJI (SADECE TÜRKÇE) ---
            const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("Bütün Yetkililerin Uyarıları Sıfırlandı")
                    .setDescription(`**${member} Tarafından Bütün Yetkililerin Uyarıları ve Rolleri Sıfırlandı**`)
                    .setColor("Random")
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "Bir hata oluştu.", ephemeral: true });
        }
    }
};