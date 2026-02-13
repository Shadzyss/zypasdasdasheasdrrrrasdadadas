const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        
        // ===============================================
        //             BUTONA TIKLAMA (FORM AÇMA)
        // ===============================================
        if (interaction.isButton()) {
            
            // --- TÜRKÇE BUTON ---
            if (interaction.customId === 'btn_script_oneri_tr') {
                const modal = new ModalBuilder()
                    .setCustomId('mdl_script_oneri_tr')
                    .setTitle('Script Öneri Formu');

                const nameInput = new TextInputBuilder()
                    .setCustomId('input_script_name')
                    .setLabel("İstediğiniz Oyun Scripti")
                    .setPlaceholder("Örn: Blox Fruits Auto Farm")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const featuresInput = new TextInputBuilder()
                    .setCustomId('input_script_features')
                    .setLabel("Script Özellikleri")
                    .setPlaceholder("Hangi özellikler olsun? Örn:Fly,Aimbot Vb.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const row1 = new ActionRowBuilder().addComponents(nameInput);
                const row2 = new ActionRowBuilder().addComponents(featuresInput);

                modal.addComponents(row1, row2);
                await interaction.showModal(modal);
            }

            // --- İNGİLİZCE BUTON ---
            if (interaction.customId === 'btn_script_oneri_us') {
                const modal = new ModalBuilder()
                    .setCustomId('mdl_script_oneri_us')
                    .setTitle('Script Suggestion Form');

                const nameInput = new TextInputBuilder()
                    .setCustomId('input_script_name')
                    .setLabel("Desired Game Script")
                    .setPlaceholder("Ex: Blox Fruits Auto Farm")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const featuresInput = new TextInputBuilder()
                    .setCustomId('input_script_features')
                    .setLabel("Script Features")
                    .setPlaceholder("What features should it have? Ex:Fly,Aimbot etc.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const row1 = new ActionRowBuilder().addComponents(nameInput);
                const row2 = new ActionRowBuilder().addComponents(featuresInput);

                modal.addComponents(row1, row2);
                await interaction.showModal(modal);
            }
        }

        // ===============================================
        //           FORM GÖNDERME (MODAL SUBMIT)
        // ===============================================
        if (interaction.isModalSubmit()) {

            // --- TÜRKÇE FORM LOGLAMA ---
            if (interaction.customId === 'mdl_script_oneri_tr') {
                const scriptName = interaction.fields.getTextInputValue('input_script_name');
                const scriptFeatures = interaction.fields.getTextInputValue('input_script_features');
                const logChannelId = process.env.SCRIPT_ONERI_TR_KANAL;
                const timestamp = Math.floor(Date.now() / 1000);

                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                
                if (logChannel) {
                    // 1. Log kanalına giden embed (RANDOM RENK)
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Bir Öneri Geldi!')
                        .setDescription(`
**Öneriyi Yapan Kişi:**
${interaction.user} (\`${interaction.user.id}\`)

**Önerinin İstendiği Zaman**
<t:${timestamp}:F> (<t:${timestamp}:R>)

**İstenilen Oyun Scripti:**
\`${scriptName}\`

**Scriptte İstenilen Özellikler**
\`\`\`
${scriptFeatures}
\`\`\`
                        `)
                        .setColor('Random')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'Zyphera Script Öneri', iconURL: interaction.guild.iconURL() });

                    await logChannel.send({ embeds: [logEmbed] });

                    // 2. Kullanıcıya giden BAŞARILI mesajı (YEŞİL EMBED)
                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Başarılı')
                        .setDescription(`**Öneriniz başarıyla yetkililere iletildi!**`)
                        .setColor('Green');

                    await interaction.reply({ embeds: [successEmbed], ephemeral: true });

                } else {
                    // 3. Kanal bulunamazsa HATA mesajı (KIRMIZI EMBED)
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Hata')
                        .setDescription('**Log kanalı bulunamadı! Lütfen yetkiliye bildirin.**')
                        .setColor('Red');

                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }

            // --- İNGİLİZCE FORM LOGLAMA ---
            if (interaction.customId === 'mdl_script_oneri_us') {
                const scriptName = interaction.fields.getTextInputValue('input_script_name');
                const scriptFeatures = interaction.fields.getTextInputValue('input_script_features');
                const logChannelId = process.env.SCRIPT_ONERI_US_KANAL;
                const timestamp = Math.floor(Date.now() / 1000);

                const logChannel = interaction.guild.channels.cache.get(logChannelId);

                if (logChannel) {
                    // 1. Log kanalına giden embed (RANDOM RENK)
                    const logEmbed = new EmbedBuilder()
                        .setTitle('A Suggestion Arrived!')
                        .setDescription(`
**Suggester:**
${interaction.user} (\`${interaction.user.id}\`)

**Suggestion Time**
<t:${timestamp}:F> (<t:${timestamp}:R>)

**Desired Game Script Name:**
\`${scriptName}\`

**Desired Features**
\`\`\`
${scriptFeatures}
\`\`\`
                        `)
                        .setColor('Random')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'Zyphera Script Suggestion', iconURL: interaction.guild.iconURL() });

                    await logChannel.send({ embeds: [logEmbed] });

                    // 2. Kullanıcıya giden BAŞARILI mesajı (YEŞİL EMBED)
                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Success')
                        .setDescription(`**Your suggestion has been successfully sent to the staff!**`)
                        .setColor('Green');

                    await interaction.reply({ embeds: [successEmbed], ephemeral: true });

                } else {
                    // 3. Kanal bulunamazsa HATA mesajı (KIRMIZI EMBED)
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription('**Log channel not found! Please contact staff.**')
                        .setColor('Red');

                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }
    },
};