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
            
            const isEnglish = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

            // --- ID GEÇERLİLİK KONTROLÜ ---
            // Sadece sayıdan oluşup oluşmadığına bakıyoruz
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
                .setTitle(gameName.toUpperCase())
                .setDescription(`
**- Script Link:
\`\`\`js
${scriptLink}
\`\`\`
- Menü Özellikleri / Menu Features
${scriptFeatures}

- Scripti Yapan Kişi
<@${creatorId}>

------------------------------
🇹🇷 : Bütün Sorumluluk Size Aittir Zyphera Olarak Hiç Bir __Sorumluluk Kabul Etmiyoruz__
🇺🇸 : All Responsibility Belongs to You. As Zyphera, We Accept No __Liability__**
                `)
                .setColor('Random')
                .setTimestamp();

            // Mesajı kanala gönder
            await interaction.channel.send({ embeds: [shareEmbed] });

            // Kullanıcıya gizli onay mesajı
            await interaction.reply({ 
                content: isEnglish ? "✅ Script shared successfully!" : "✅ Script başarıyla paylaşıldı!", 
                ephemeral: true 
            });
        }
    },
};