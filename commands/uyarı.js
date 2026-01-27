const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const warnModel = require('../models/warnSchema'); // Şemanın yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı')
        .setDescription('Bir Kullanıcıya Uyarı Verir.')
        .addUserOption(option => option.setName('Kullanıcı').setDescription('Uyarılanacak Kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('Sebep').setDescription('Uyarı Sebebi').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');
        const { guild, member } = interaction;

        // --- ROL VE KANAL IDLERI ---
        const STAFF_ROLE = process.env.YETKILI_SORUMLUSU_ROL_ID;
        const TR_ROLE = process.env.ROLE_ID_TURKISH;
        const US_ROLE = process.env.ROLE_ID_ENGLISH;
        const LOG_CHANNEL_ID = process.env.WARN_LOG_ID;
        const WARN_ROLES = {
            1: process.env.UYARI_1X, // 1x
            2: process.env.UYARI_2X, // 2x
            3: process.env.UYARI_3X  // 3x
        };

        // --- DİL KONTROLLERİ (Yeni Mantık: US Rolü Yoksa Her Zaman Türkçe) ---
        const executorIsEN = member.roles.cache.has(US_ROLE);
        const targetIsEN = target.roles.cache.has(US_ROLE);

        // --- YETKİ KONTROLÜ ---
        if (!member.roles.cache.has(STAFF_ROLE)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(executorIsEN ? "❌ No Permission" : "❌ Yetkin Yok")
                .setDescription(executorIsEN 
                    ? `**You Must Have The <@&${STAFF_ROLE}> Role To Use This Command**`
                    : `**Bu Komutu Kullanabilmek İçin <@&${STAFF_ROLE}> Adlı Rolüne Sahip Olmalısın**`)
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- VERİTABANI İŞLEMİ ---
        let data = await warnModel.findOne({ guildId: guild.id, userId: target.id });
        if (!data) {
            data = new warnModel({ guildId: guild.id, userId: target.id, warnCount: 0, logs: [] });
        }

        data.warnCount += 1;
        data.logs.push({
            moderatorId: member.id,
            reason: reason,
            timestamp: new Date()
        });

        const currentWarns = data.warnCount;
        const timestamp = Math.floor(Date.now() / 1000);

        // --- ROL YÖNETİMİ ---
        if (currentWarns === 1) {
            await target.roles.add(WARN_ROLES[1]);
        } else if (currentWarns === 2) {
            await target.roles.remove(WARN_ROLES[1]).catch(() => {});
            await target.roles.add(WARN_ROLES[2]);
        } else if (currentWarns === 3) {
            await target.roles.remove(WARN_ROLES[2]).catch(() => {});
            await target.roles.add(WARN_ROLES[3]);
        } else if (currentWarns >= 4) {
            await target.roles.remove(WARN_ROLES[3]).catch(() => {});
            data.warnCount = 0; // Uyarı sayısını sıfırla
            data.logs = [];     // LOGLARI (GEÇMİŞİ) SIFIRLAYAN SATIR
        }

        await data.save();

        // --- KANAL YANITI (EXECUTOR DİLİNE GÖRE) ---
        const successEmbed = new EmbedBuilder()
            .setTitle(executorIsEN ? "✅ Success" : "✅ Başarılı")
            .setColor("Green");

        if (data.warnCount === 0) { // Yani 4. uyarıyı almışsa
            successEmbed.setDescription(executorIsEN 
                ? `**${member} Successfully Warned ${target} For \`${reason}\`.\n⚠️ Total Warnings Reached \`4\`, So Warn Count Has Been Reset.**`
                : `**${member} Başarıyla ${target} Adlı Kişi \`${reason}\` Sebebiyle Uyarı Verildi.\n⚠️ Kişinin Toplam Uyarı Sayısı \`4\` Olduğu İçin Uyarıları Sıfırlandı**`);
        } else {
            successEmbed.setDescription(executorIsEN
                ? `**${member} Successfully Warned ${target} For \`${reason}\`. Total Warning Count --> \`${currentWarns}\`**`
                : `**${member} Başarıyla ${target} Adlı Kişi \`${reason}\` Sebebiyle Uyarı Verildi Kişinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`);
        }
        await interaction.reply({ embeds: [successEmbed] });

        // --- DM MESAJI (TARGET DİLİNE GÖRE) ---
        const dmEmbed = new EmbedBuilder()
            .setTitle(targetIsEN ? "You Received a Warning" : "Uyarı Aldınız")
            .setDescription(targetIsEN 
                ? `**⚒️ Moderator --> ${member}\n🧾 Reason --> \`${reason}\`\n⏱️ Time --> <t:${timestamp}:F>\n🔢 Total Warnings --> \`${currentWarns}\`**`
                : `**⚒️ Uyarıyı Veren Yetkili --> ${member}\n🧾 Uyarı Sebebi --> \`${reason}\`\n⏱️ Uyarının Verildiği Zaman --> <t:${timestamp}:F>\n🔢 Toplam Uyarı Sayınız --> \`${currentWarns}\`**`)
            .setColor("Random");

        await target.send({ embeds: [dmEmbed] }).catch(() => console.log("Kullanıcının DM'si kapalı."));

        // --- LOG MESAJI (SADECE TÜRKÇE) ---
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("Bir Yetkili Uyarı Aldı")
                .setDescription(`**⚒️ Uyarıyı Veren Yetkili --> ${member}\n👑 Uyarı Alan Yetkili --> ${target}\n🧾 Uyarı Sebebi --> \`${reason}\`\n⏱️ Uyarının Verildiği Zaman --> <t:${timestamp}:F>\n🔢 Uyarı Alan Yetkilinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`)
                .setColor("Random");
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};