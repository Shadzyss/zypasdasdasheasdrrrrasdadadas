const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'modal_script_paylas') {
            const gameName = interaction.fields.getTextInputValue('input_game_name');
            const scriptLink = interaction.fields.getTextInputValue('input_script_link');
            const scriptFeatures = interaction.fields.getTextInputValue('input_script_features');
            const creatorId = interaction.fields.getTextInputValue('input_creator_id');
            const scriptImage = interaction.fields.getTextInputValue('input_script_image');
            
            const isEnglish = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

            // --- ID KONTROLÜ ---
            if (!/^\d+$/.test(creatorId)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle(isEnglish ? "❌ Invalid ID" : "❌ Geçersiz ID")
                    .setDescription(isEnglish 
                        ? "**Please provide a valid Discord User ID!**" 
                        : "**Lütfen geçerli bir Discord Kullanıcı ID'si girin!**")
                    .setColor("Red");
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // --- PAYLAŞILACAK EMBED ---
            const shareEmbed = new EmbedBuilder()
                .setTitle(`🚀 ${gameName.toUpperCase()}`)
                .setDescription(`
**------------------------------**
**🇹🇷 : Bütün Sorumluluk Size Aittir Zyphera Olarak Hiç Bir __Sorumluluk Kabul Etmiyoruz__**
**🇺🇸 : All Responsibility Belongs to You. As Zyphera, We Accept No __Liability__**
**------------------------------**
                `)
                .addFields(
                    { 
                        name: '🔗 Script Link', 
                        value: `\`\`\`js\n${scriptLink}\n\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: '📜 Menü Özellikleri / Menu Features', 
                        value: `\`\`\`yaml\n${scriptFeatures}\n\`\`\``, // Kod bloğu içinde daha güzel durur
                        inline: false 
                    },
                    { 
                        name: '👤 Scripti Yapan Kişi', 
                        value: `<@${creatorId}> (\`${creatorId}\`)`, 
                        inline: true 
                    }
                )
                .setColor('Random')
                .setTimestamp()
                .setFooter({ text: 'Zyphera Script Sharing', iconURL: interaction.guild.iconURL() });

            // Eğer bir resim linki girildiyse embed'e ekle
            if (scriptImage && scriptImage.startsWith('http')) {
                shareEmbed.setImage(scriptImage);
            }

            // Mesajı kanala gönder
            await interaction.channel.send({ embeds: [shareEmbed] });

            // Başarılı Mesajı
            const successEmbed = new EmbedBuilder()
                .setTitle(isEnglish ? "✅ Success" : "✅ Başarılı")
                .setDescription(isEnglish ? "**Script shared successfully!**" : "**Script başarıyla paylaşıldı!**")
                .setColor("Green");

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }
    },
};