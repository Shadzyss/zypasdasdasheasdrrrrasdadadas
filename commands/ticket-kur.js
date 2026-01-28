const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    // Slash command tanımlaması (Hatanın çözümü burası)
    data: new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('Ticket panelini kurar (Sadece Bot Sahibi).'),

    async execute(interaction) {
        
        // --- KONTROL ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ 
                content: 'Bu komutu sadece bot sahibi kullanabilir! ❌', 
                ephemeral: true 
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_info').setLabel('Bilgi Almak').setEmoji('<:zyphera_info:1466034688903610471>').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('create_complaint').setLabel('Şikayet').setEmoji('<:zyphera_kalkan:1466034432183111761>').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('create_apply').setLabel('Yetkili Başvuru').setEmoji('<a:zyphera_parca:1464095414201352254>').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('create_other').setLabel('Diğer Destek').setEmoji('<a:zyphera_yukleniyor:1464095331863101514>').setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
            .setTitle('Destek Talebi Oluştur')
            .setDescription('Aşağıdaki butonlara tıklayarak ilgili kategoride destek talebi oluşturabilirsiniz.')
            .setColor('#2b2d31')
            .setFooter({ text: 'Zyphera Destek Sistemi' });

        // Slash command olduğu için reply kullanıyoruz
        await interaction.reply({ 
            content: 'Panel başarıyla kuruluyor...', 
            ephemeral: true 
        });
        
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};