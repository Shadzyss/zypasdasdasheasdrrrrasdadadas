const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warnModel = require('../models/warnSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı-sil')
        .setDescription('Bir Kullanıcının Uyarısını/Uyarılarını Silin.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarısı Silinecek Kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Uyarının Silinme Sebebi').setRequired(true))
        .addIntegerOption(option => option.setName('miktar').setDescription('Silinecek Uyarı Sayısı').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');
        let amount = interaction.options.getInteger('miktar') || 1; 
        const { guild, member } = interaction;

        // --- AYARLAR ---
        const REQUIRED_ROLE_ID = process.env.YETKILI_SORUMLUSU_ROL_ID;
        const LOG_CHANNEL_ID = process.env.WARN_LOG_ID;
        const US_ROLE = process.env.ROLE_ID_ENGLISH;

        // !!! BURAYI DOLDURMAN ÇOK ÖNEMLİ !!!
        // Hangi sayıya hangi rolün geleceğini buraya yazıyoruz.
        // process.env kullanıyorsan oradaki isimleri, yoksa direkt "ID" olarak yaz.
        const WARN_ROLES = {
            1: process.env.UYARI_1X, // 1. Uyarı Rolü ID
            2: process.env.UYARI_2X, // 2. Uyarı Rolü ID
            3: process.env.UYARI_3X  // 3. Uyarı Rolü ID
        };
        
        // Hepsini bir dizide toplayalım ki silerken kolay olsun
        const ALL_WARN_ROLE_IDS = Object.values(WARN_ROLES);

        // --- DİL KONTROLLERİ ---
        const executorIsEN = member.roles.cache.has(US_ROLE);
        const targetIsEN = target.roles.cache.has(US_ROLE);

        // --- YETKİ KONTROLÜ ---
        if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "❌ No Permission" : "❌ Yetkin Yok")
                .setDescription(executorIsEN 
                    ? `**You Must Have The <@&${REQUIRED_ROLE_ID}> Role To Use This Command**`
                    : `**Bu Komutu Kullanabilmek İçin <@&${REQUIRED_ROLE_ID}> Adlı Rolüne Sahip Olmalısın**`)
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- VERİTABANI İŞLEMİ ---
        let data = await warnModel.findOne({ guildId: guild.id, userId: target.id });

        if (!data || data.warnCount === 0) {
            const noWarn = new EmbedBuilder()
                .setTitle(executorIsEN ? "Error" : "Hata")
                .setDescription(executorIsEN ? "This User Has No Warnings To Delete." : "Bu Kullanıcının Zaten Silinecek Bir Uyarısı Yok.")
                .setColor("Red");
            return interaction.reply({ embeds: [noWarn], ephemeral: true });
        }

        // --- SİLME MANTIĞI ---
        // Eğer girilen miktar mevcut uyarısından fazlaysa, hepsini sil
        if (amount > data.warnCount) amount = data.warnCount;

        data.warnCount -= amount;
        
        // Logs dizisinden sondan başlayarak silinecek miktar kadar kaydı çıkar
        // (data.logs.pop() işlemi array boşsa hata vermez, undefined döner, güvenlidir)
        for (let i = 0; i < amount; i++) {
            if (data.logs.length > 0) data.logs.pop();
        }

        await data.save();

        const currentWarns = data.warnCount;

        // --- ROL GÜNCELLEME SİSTEMİ (YENİ EKLENDİ) ---
        try {
            // 1. Önce kullanıcının üzerindeki TÜM uyarı rollerini siliyoruz (Temizlik)
            // Böylece hem 3x hem 2x kalma gibi buglar olmaz.
            await target.roles.remove(ALL_WARN_ROLE_IDS);

            // 2. Kalan uyarı sayısına denk gelen rolü veriyoruz (Varsa)
            // Eğer uyarı sayısı 0 ise zaten yukarıda sildik, bir şey eklememize gerek yok.
            if (currentWarns > 0 && WARN_ROLES[currentWarns]) {
                await target.roles.add(WARN_ROLES[currentWarns]);
            }
        } catch (error) {
            console.error(`Rol güncellenirken hata oluştu: ${error}`);
            // Hata olsa bile kullanıcıya işlem başarılı mesajı gitmesi için burayı loglayıp devam ediyoruz.
        }

        const timestamp = Math.floor(Date.now() / 1000);

        // --- KANAL YANITI ---
        const successEmbed = new EmbedBuilder()
            .setTitle(executorIsEN ? "✅ Success" : "✅ Başarılı")
            .setDescription(executorIsEN
                ? `**${member} Successfully Deleted \`${amount}\` Warning(s) For ${target} For \`${reason}\`. Total Warning Count --> \`${currentWarns}\`**`
                : `**${member} Başarıyla ${target} Adlı Kişiden \`${reason}\` Sebebiyle \`${amount}\` Adet Uyarı Sildi. Kişinin Yeni Uyarı Sayısı --> \`${currentWarns}\`**`)
            .setColor("Green");

        await interaction.reply({ embeds: [successEmbed] });

        // --- DM MESAJI ---
        const dmEmbed = new EmbedBuilder()
            .setTitle(targetIsEN ? "Warning Removed" : "Uyarınız Silindi")
            .setDescription(targetIsEN
                ? `**⚒️ Moderator --> ${member}\n🧾 Reason for Removal --> \`${reason}\`\n🔢 Removed Amount --> \`${amount}\`\n⏱️ Time --> <t:${timestamp}:F>\n🔢 Your Total Warnings --> \`${currentWarns}\`**`
                : `**⚒️ Uyarıyı Silen Yetkili --> ${member}\n🧾 Uyarının Silinme Sebebi --> \`${reason}\`\n🔢 Silinen Uyarı Miktarı --> \`${amount}\`\n⏱️ Uyarının Silindiği Zaman --> <t:${timestamp}:F>\n🔢 Toplam Uyarı Sayınız --> \`${currentWarns}\`**`)
            .setColor("Random");

        await target.send({ embeds: [dmEmbed] }).catch(() => {});

        // --- LOG MESAJI ---
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("Bir Yetkilinin Uyarısı Silindi")
                .setDescription(`**⚒️ Uyarıyı Silen Yetkili --> ${member}\n👑 Uyarısı Silinen Yetkili --> ${target}\n🧾 Uyarının Silinme Sebebi --> \`${reason}\`\n🔢 Silinen Uyarı Miktarı --> \`${amount}\`\n⏱️ Uyarının Silindiği Zaman --> <t:${timestamp}:F>\n🔢 Uyarısı Silinen Yetkilinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`)
                .setColor("Random");
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};