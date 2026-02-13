const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('script-öneri')
        .setDescription('Script öneri sistemini kurar.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('tr')
                .setDescription('Türkçe öneri sistemini kurar.')
                .addChannelOption(option => 
                    option.setName('kanal')
                        .setDescription('Mesajın gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('us')
                .setDescription('Sets up the English suggestion system.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send the message')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),

    async execute(interaction) {
        // --- SAHİP KONTROLÜ ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ Bu komutu sadece bot sahibi kullanabilir!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('kanal') || interaction.options.getChannel('channel');

        // --- GIF URL (Senin attığın link) ---
        // Not: Discord linkleri bir süre sonra kırılabilir, kalıcı bir link kullanmanı öneririm.
        const gifUrl = "https://cdn.discordapp.com/attachments/1446511397793173504/1463858413137035295/YL6hODV.gif?ex=69905ce2&is=698f0b62&hm=fd08d52b1fef6cdc1448a4fa29e23529d95957bd09409333d3ddf2da80524ff6&";

        // --- TÜRKÇE SİSTEM KURULUMU ---
        if (subcommand === 'tr') {
            const embedTR = new EmbedBuilder()
                .setTitle("Zyphera Script Öneri Sistemi")
                .setDescription("**Merhaba Değerli Kullanıcılarımız, Script Önerisinde Bulunmak İçin <a:zyphera_yukleniyor:1464095331863101514> Butonuna Tıklayın**")
                .setColor("Blue")
                .setImage(gifUrl);

            const rowTR = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_script_oneri_tr')
                    .setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
                    .setLabel('Öneri Yap')
                    .setStyle(ButtonStyle.Primary) // Mavi buton
            );

            await targetChannel.send({ embeds: [embedTR], components: [rowTR] });
            return interaction.reply({ content: `✅ Türkçe öneri sistemi ${targetChannel} kanalına kuruldu.`, ephemeral: true });
        }

        // --- İNGİLİZCE (US) SİSTEM KURULUMU ---
        if (subcommand === 'us') {
            const embedUS = new EmbedBuilder()
                .setTitle("Zyphera Script Suggestion System")
                .setDescription("**Hello Valuable Users, Click the <a:zyphera_yukleniyor:1464095331863101514> Button to Suggest a Script**")
                .setColor("Blue")
                .setImage(gifUrl);

            const rowUS = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_script_oneri_us')
                    .setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
                    .setLabel('Suggest')
                    .setStyle(ButtonStyle.Primary)
            );

            await targetChannel.send({ embeds: [embedUS], components: [rowUS] });
            return interaction.reply({ content: `✅ English suggestion system setup in ${targetChannel}.`, ephemeral: true });
        }
    }
};