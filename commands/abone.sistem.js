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

        // --- GIF URL ---
        const gifUrl = "https://cdn.discordapp.com/attachments/1446511397793173504/1463858413137035295/YL6hODV.gif?ex=69905ce2&is=698f0b62&hm=fd08d52b1fef6cdc1448a4fa29e23529d95957bd09409333d3ddf2da80524ff6&";

        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('kanal') || interaction.options.getChannel('channel');

        if (subcommand === 'tr') {
            const embedTR = new EmbedBuilder()
                .setTitle("<a:zyphera_owner:1464097165570736255> Zyphera Abone Key Sistemi <a:zyphera_owner:1464097165570736255>")
                .setDescription("**<@&process.env.ROLE_ID_ABONE> Rolüne Sahipseniz Aşağıdaki Butona Tıklayarak Sınırsız Abone Key'inizi Oluşturabilirsiniz.**\n\n⚠️ **__Unutmayın:__ Her Abone Sadece \`1 Adet\` Key Oluşturabilir!**\n\n\n**⚠️EĞER DM'İNİZ KAPALI İSE BOT SİZE KEY BİLGİLERİNİ GÖNDEREMEZ EĞER DM KUTUNUZ KAPALI İSE AÇIN**")
                .setColor("Gold")
                .setImage(gifUrl)
                .setFooter({ text: 'Zyphera Abone Key Sistemi'})
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            const rowTR = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abone_key_tr')
                    .setEmoji('🔑')
                    .setLabel('Abone Key Oluştur')
                    .setStyle(ButtonStyle.Secondary)
            );

            await targetChannel.send({ embeds: [embedTR], components: [rowTR] });
            return interaction.reply({ content: `✅ Türkçe abone sistemi ${targetChannel} kanalına kuruldu.`, ephemeral: true });
        }

        if (subcommand === 'us') {
            const embedUS = new EmbedBuilder()
                .setTitle("<a:zyphera_owner:1464097165570736255> Zyphera Subscriber Key System <a:zyphera_owner:1464097165570736255>")
                .setDescription("**If You Have The <@&process.env.ROLE_ID_ABONE> Role, You Can Generate Your Unlimited Subscriber Key By Clicking The Button Below.**\n\n⚠️ **__Remember:__ Each Subscriber Can Only Generate \`1 Key\`**\n\n\n**⚠️ IF YOUR DM IS CLOSED, THE BOT CANNOT SEND YOU KEY INFO. IF CLOSED, PLEASE OPEN IT**")
                .setColor("Gold")
                .setImage(gifUrl)
                .setFooter({ text: 'Zyphera Subscriber Key System'})
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            const rowUS = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abone_key_us')
                    .setEmoji('🔑')
                    .setLabel('Generate Subscriber Key')
                    .setStyle(ButtonStyle.Secondary)
            );

            await targetChannel.send({ embeds: [embedUS], components: [rowUS] });
            return interaction.reply({ content: `✅ English subscriber system setup in ${targetChannel}.`, ephemeral: true });
        }
    }
};