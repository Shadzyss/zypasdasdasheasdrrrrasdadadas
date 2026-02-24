const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('abone-sistem')
        .setDescription('Abone Key butonlu sistemini kurar.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('tr')
                .setDescription('Türkçe abone sistemini kurar.')
                .addChannelOption(option => 
                    option.setName('kanal')
                        .setDescription('Mesajın gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('us')
                .setDescription('Sets up the English subscriber system.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send the message')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),

    async execute(interaction) {
        // --- SADECE BOT SAHİBİ KONTROLÜ ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ Bu komutu sadece bot sahibi kullanabilir!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('kanal') || interaction.options.getChannel('channel');

        if (subcommand === 'tr') {
            const embedTR = new EmbedBuilder()
                .setTitle("💎 Zyphera Abone Key Sistemi")
                .setDescription("**Abone rolüne sahipseniz aşağıdaki butona tıklayarak sınırsız Abone Key'inizi oluşturabilirsiniz.**\n\n⚠️ **Unutmayın:** Her abone sadece **1 adet** key oluşturabilir!")
                .setColor("Gold")
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            const rowTR = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abone_key_tr')
                    .setEmoji('🔑')
                    .setLabel('Abone Key Oluştur')
                    .setStyle(ButtonStyle.Success)
            );

            await targetChannel.send({ embeds: [embedTR], components: [rowTR] });
            return interaction.reply({ content: `✅ Türkçe abone sistemi ${targetChannel} kanalına kuruldu.`, ephemeral: true });
        }

        if (subcommand === 'us') {
            const embedUS = new EmbedBuilder()
                .setTitle("💎 Zyphera Subscriber Key System")
                .setDescription("**If you have the Subscriber role, you can generate your unlimited Subscriber Key by clicking the button below.**\n\n⚠️ **Remember:** Each subscriber can only generate **1 key**!")
                .setColor("Gold")
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            const rowUS = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abone_key_us')
                    .setEmoji('🔑')
                    .setLabel('Generate Subscriber Key')
                    .setStyle(ButtonStyle.Success)
            );

            await targetChannel.send({ embeds: [embedUS], components: [rowUS] });
            return interaction.reply({ content: `✅ English subscriber system setup in ${targetChannel}.`, ephemeral: true });
        }
    }
};