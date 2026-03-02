const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        
        // --- 1. FORM GÖNDERME KISMI ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_script_paylas') {
            const gameName = interaction.fields.getTextInputValue('input_game_name');
            const scriptLink = interaction.fields.getTextInputValue('input_script_link');
            const scriptFeatures = interaction.fields.getTextInputValue('input_script_features');
            const creatorId = interaction.fields.getTextInputValue('input_creator_id');
            const scriptImage = interaction.fields.getTextInputValue('input_script_image');
            
            const isEnglish = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

            if (!/^\d+$/.test(creatorId)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle(isEnglish ? "❌ Invalid ID" : "❌ Geçersiz ID")
                    .setDescription(isEnglish ? "**Please provide a valid Discord User ID!**" : "**Lütfen geçerli bir Discord Kullanıcı ID'si girin!**")
                    .setColor("Red");
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const shareEmbed = new EmbedBuilder()
                .setTitle(`🚀 ${gameName.toUpperCase()}`)
                .setColor('Random')
                .setTimestamp()
                .addFields(
                    { name: '🔗 Script Link', value: `\`\`\`js\n${scriptLink}\n\`\`\``, inline: false },
                    { name: '📜 Menü Özellikleri / Menu Features', value: `\`\`\`yaml\n${scriptFeatures}\n\`\`\``, inline: false },
                    { name: '👤 Scripti Yapan Kişi / Scripts Owner', value: `<@${creatorId}> (\`${creatorId}\`)`, inline: true },
                    {
                        name: '⚠️ Önemli / Important',
                        value: `**🇹🇷 : Bütün Sorumluluk Size Aittir Zyphera Olarak Hiç Bir __Sorumluluk Kabul Etmiyoruz__\n🇺🇸 : All Responsibility Belongs to You. As Zyphera, We Accept No __Liability__**`,
                        inline: false
                    }
                )
                .setFooter({ text: 'Zyphera Script Sharing System', iconURL: interaction.guild.iconURL() });

            if (scriptImage && scriptImage.startsWith('http')) {
                shareEmbed.setImage(scriptImage);
            }

            // --- KOPYALAMA BUTONU ---
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_copy_script_text')
                    .setLabel(isEnglish ? 'Copy Script' : 'Script Link')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.channel.send({ embeds: [shareEmbed], components: [row] });

            const successEmbed = new EmbedBuilder()
                .setTitle(isEnglish ? "✅ Success" : "✅ Başarılı")
                .setDescription(isEnglish ? "**Script shared successfully!**" : "**Script başarıyla paylaşıldı!**")
                .setColor("Green");

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }

        // --- 2. BUTONA TIKLAMA KISMI ---
        if (interaction.isButton() && interaction.customId === 'btn_copy_script_text') {
            const isEnglish = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);
            
            // Embed içindeki script linkini çekiyoruz
            const embed = interaction.message.embeds[0];
            const scriptField = embed.fields.find(f => f.name.includes('Script Link'));
            
            // Kod bloğundaki temiz scripti ayıklıyoruz
            const rawScript = scriptField.value.replace(/```js\n|```/g, '');

            // Kullanıcıya kopyalayabileceği şekilde gönderiyoruz
            await interaction.reply({
                content: isEnglish ? `**\`\`\`js\n${rawScript}\n\`\`\`**` : `**\`\`\`js\n${rawScript}\n\`\`\`**`,
                ephemeral: true
            });
        }
    },
};