const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu-bilgi')
        .setNameLocalization('en-US', 'server-info')
        .setDescription('Sunucu hakkında detaylı bilgi verir.')
        .setDescriptionLocalization('en-US', 'Provides detailed information about the server.'),

    async execute(interaction) {
        const { guild } = interaction;
        
        // --- DİL KONTROLÜ (ENV'den Çekilen ID'ler) ---
        const ROLE_TR = process.env.ROLE_ID_TURKISH;
        const ROLE_US = process.env.ROLE_ID_ENGLISH;
        
        // Önce varsayılan dili Türkçe olarak belirliyoruz
        let lang = 'tr'; 

        // Kullanıcıda US rolü varsa dile 'en' diyoruz.
        // Eğer US rolü yoksa, zaten yukarıda 'tr' olarak tanımlandığı için direkt Türkçe devam edecek.
        if (interaction.member.roles.cache.has(ROLE_US)) {
            lang = 'en';
        } else if (interaction.member.roles.cache.has(ROLE_TR)) {
            lang = 'tr';
        }

        // --- DİL SÖZLÜĞÜ ---
        const content = {
            tr: {
                title: `${guild.name} | Sunucu Bilgileri`,
                owner: 'Sunucu Sahibi',
                members: 'Üye Sayısı',
                channels: 'Kanallar',
                extras: 'Ekstralar',
                boost: 'Takviye Durumu',
                created: 'Kuruluş Tarihi',
                stats: `**Toplam:** ${guild.memberCount}\n**İnsan:** ${guild.members.cache.filter(m => !m.user.bot).size}\n**Bot:** ${guild.members.cache.filter(m => m.user.bot).size}`,
                channelStats: `**Yazı:** ${guild.channels.cache.filter(c => c.type === 0).size}\n**Ses:** ${guild.channels.cache.filter(c => c.type === 2).size}\n**Kategori:** ${guild.channels.cache.filter(c => c.type === 4).size}`,
                extraStats: `**Emoji:** ${guild.emojis.cache.size}\n**Rol:** ${guild.roles.cache.size}\n**Sticker:** ${guild.stickers.cache.size}`,
                boostStats: `**Seviye:** ${guild.premiumTier}\n**Takviye:** ${guild.premiumSubscriptionCount || 0}`,
                footer: `${interaction.user.tag} tarafından istendi`,
                buttonLabel: 'Sunucu İkonu'
            },
            en: {
                title: `${guild.name} | Server Information`,
                owner: 'Server Owner',
                members: 'Member Count',
                channels: 'Channels',
                extras: 'Extras',
                boost: 'Boost Status',
                created: 'Created At',
                stats: `**Total:** ${guild.memberCount}\n**Humans:** ${guild.members.cache.filter(m => !m.user.bot).size}\n**Bots:** ${guild.members.cache.filter(m => m.user.bot).size}`,
                channelStats: `**Text:** ${guild.channels.cache.filter(c => c.type === 0).size}\n**Voice:** ${guild.channels.cache.filter(c => c.type === 2).size}\n**Category:** ${guild.channels.cache.filter(c => c.type === 4).size}`,
                extraStats: `**Emoji:** ${guild.emojis.cache.size}\n**Role:** ${guild.roles.cache.size}\n**Sticker:** ${guild.stickers.cache.size}`,
                boostStats: `**Level:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
                footer: `Requested by ${interaction.user.tag}`,
                buttonLabel: 'Server Icon'
            }
        };

        const t = content[lang];
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setTitle(t.title)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setImage(guild.bannerURL({ size: 1024 })) 
            .setColor('#2b2d31')
            .addFields(
                { name: `<:zyphera_blurpletac:1466051421253275791> ${t.owner}`, value: `${owner} (\`${owner.id}\`)`, inline: true },
                { name: `<:zyphera_server:1466051437086773290> ${t.created}`, value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: `<:zyphera_info:1466034688903610471> ${t.members}`, value: t.stats, inline: true },
                { name: `<:zyphera_bell:1466051402664251524> ${t.channels}`, value: t.channelStats, inline: true },
                { name: `<a:zyphera_parca:1464095414201352254> ${t.extras}`, value: t.extraStats, inline: true },
                { name: `<:zyphera_yesilraptiye:1466044628506771588> ${t.boost}`, value: t.boostStats, inline: true }
            )
            .setFooter({ text: t.footer, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(t.buttonLabel)
                .setStyle(ButtonStyle.Link)
                .setURL(guild.iconURL({ dynamic: true, size: 4096 }) || 'https://discord.com')
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};