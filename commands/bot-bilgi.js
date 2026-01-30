const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-info')
        .setNameLocalization('tr', 'bot-bilgi')
        .setDescription('Shows information about the bot.')
        .setDescriptionLocalization('tr', 'Botun Bilgilerini Gösterir.'),

    async execute(interaction) {
        // --- DİL KONTROLÜ ---
        const ROLE_TR = process.env.ROLE_ID_TURKISH;
        const ROLE_US = process.env.ROLE_ID_ENGLISH;
        
        let lang = 'tr'; 
        if (interaction.member.roles.cache.has(ROLE_US)) lang = 'en';
        else if (interaction.member.roles.cache.has(ROLE_TR)) lang = 'tr';

        // --- TEKNİK VERİLER ---
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);

        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const nodeVersion = process.version;
        const botPing = interaction.client.ws.ping;

        const content = {
            tr: {
                title: `🤖 Bot İstatistikleri`,
                owner: 'Geliştirici',
                uptime: 'Çalışma Süresi',
                uptimeVal: `${days} Gün, ${hours} Saat, ${minutes} Dakika`,
                stats: 'Genel Bilgiler',
                statsVal: `**Sunucu:** ${interaction.client.guilds.cache.size}\n**Kullanıcı:** ${interaction.client.users.cache.size}\n**Ping:** ${botPing}ms`,
                system: 'Sistem Verileri',
                systemVal: `**RAM:** ${memoryUsage} MB\n**Node.js:** ${nodeVersion}\n**D.js:** v${version}`,
                footer: `${interaction.user.tag} tarafından istendi`,
                buttons: { support: 'Destek Sunucusu', invite: 'Botu Davet Et' }
            },
            en: {
                title: `🤖 Bot Statistics`,
                owner: 'Developer',
                uptime: 'Uptime',
                uptimeVal: `${days} Days, ${hours} Hours, ${minutes} Minutes`,
                stats: 'General Stats',
                statsVal: `**Guilds:** ${interaction.client.guilds.cache.size}\n**Users:** ${interaction.client.users.cache.size}\n**Ping:** ${botPing}ms`,
                system: 'System Data',
                systemVal: `**RAM:** ${memoryUsage} MB\n**Node.js:** ${nodeVersion}\n**D.js:** v${version}`,
                footer: `Requested by ${interaction.user.tag}`,
                buttons: { support: 'Support Server', invite: 'Invite Bot' }
            }
        };

        const t = content[lang];

        const embed = new EmbedBuilder()
            .setTitle(t.title)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setColor('#5865F2')
            .addFields(
                { name: `<a:zyphera_owner:1464097165570736255> ${t.owner}`, value: `<@1423971386950549626>`, inline: true },
                { name: `<:zyphera_server:1466051437086773290> ${t.uptime}`, value: `\`${t.uptimeVal}\``, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: `<:zyphera_info:1466034688903610471> ${t.stats}`, value: t.statsVal, inline: true },
                { name: `<a:zyphera_parca:1464095414201352254> ${t.system}`, value: t.systemVal, inline: true },
                { name: `<:zyphera_yesilraptiye:1466044628506771588> Latency`, value: `\`Websocket: ${botPing}ms\``, inline: true }
            )
            .setFooter({ text: t.footer, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(t.buttons.support)
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/Rzx3ZB47'),
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};