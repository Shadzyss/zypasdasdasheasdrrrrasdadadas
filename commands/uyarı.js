const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const warnModel = require('../models/warnSchema');; // Şemanın yolunu kontrol et

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı')
        .setDescription('Bir kullanıcıya uyarı verir.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarılanacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

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

        // --- YETKİ KONTROLÜ ---
        if (!member.roles.cache.has(STAFF_ROLE)) {
            const isTR = member.roles.cache.has(TR_ROLE);
            const errorEmbed = new EmbedBuilder()
                .setTitle(isTR ? "❌ Yetkin Yok" : "❌ No Permission")
                .setDescription(isTR 
                    ? `**Bu Komutu Kullanabilmek İçin <@&${STAFF_ROLE}> Adlı Rolüne Sahip Olmalısın**`
                    : `**You must have the <@&${STAFF_ROLE}> role to use this command**`)
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
            data.warnCount = 0; // Uyarıyı sıfırla
        }

        await data.save();

        // --- DİL KONTROLLERİ ---
        const executorIsTR = member.roles.cache.has(TR_ROLE);
        const targetIsTR = target.roles.cache.has(TR_ROLE);

        // --- KANAL YANITI (EXECUTOR DİLİNE GÖRE) ---
        const successEmbed = new EmbedBuilder()
            .setTitle("✅ Başarılı")
            .setColor("Green");

        if (data.warnCount === 0) { // Yani 4. uyarıyı almışsa
            successEmbed.setDescription(executorIsTR 
                ? `**${member} Başarıyla ${target} Adlı Kişi \`${reason}\` Sebebiyle Uyarı Verildi.\n⚠️ Kişinin Toplam Uyarı Sayısı \`4\` Olduğu İçin Uyarıları Sıfırlandı**`
                : `**${member} successfully warned ${target} for \`${reason}\`.\n⚠️ Total warnings reached \`4\`, so warn count has been reset.**`);
        } else {
            successEmbed.setDescription(executorIsTR
                ? `**${member} Başarıyla ${target} Adlı Kişi \`${reason}\` Sebebiyle Uyarı Verildi Kişinin Toplam Uyarı Sayısı --> \`${currentWarns}\`**`
                : `**${member} successfully warned ${target} for \`${reason}\`. Total warning count --> \`${currentWarns}\`**`);
        }
        await interaction.reply({ embeds: [successEmbed] });

        // --- DM MESAJI (TARGET DİLİNE GÖRE) ---
        const dmEmbed = new EmbedBuilder()
            .setTitle(targetIsTR ? "Uyarı Aldınız" : "You Received a Warning")
            .setDescription(targetIsTR 
                ? `**⚒️ Uyarıyı Veren Yetkili --> ${member}\n🧾 Uyarı Sebebi --> \`${reason}\`\n⏱️ Uyarının Verildiği Zaman --> <t:${timestamp}:F>\n🔢 Toplam Uyarı Sayınız --> \`${currentWarns}\`**`
                : `**⚒️ Moderator --> ${member}\n🧾 Reason --> \`${reason}\`\n⏱️ Time --> <t:${timestamp}:F>\n🔢 Total Warnings --> \`${currentWarns}\`**`)
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