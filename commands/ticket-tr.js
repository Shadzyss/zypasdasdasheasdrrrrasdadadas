const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-tr')
        .setDescription('Ticket Paneli Kurar'),
    async execute(interaction) {
        
        // --- SAHİP KONTROLÜ ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Bu Komutu Sadece Bot Sahibi Kullanabilir!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Zyphera Destek Sistemi')
            .setDescription('Yardıma ihtiyacın olan konuyu aşağıdaki butonlardan seçerek bir talep oluşturabilirsin.')
            .addFields(
                { name: '<:zyphera_info:1466034688903610471> Bilgi Almak İçin', value: 'Herhangi Bir Konu Hakkında Bilgi Almak İçin <:zyphera_info:1466034688903610471> Butonuna Tıklayın', inline: true },
                { name: '<:zyphera_kalkan:1466034432183111761> Şikayet İçin', value: 'Herhangi Bir Şeyden Ya Da Bir Kişiden Şikayetçi Olmak İçin <:zyphera_kalkan:1466034432183111761> Butonuna Tıklayın', inline: true },
                { name: '<a:zyphera_parca:1464095414201352254> Yetkili Başvurusu', value: 'Yetkili Başvurusu İçin <a:zyphera_parca:1464095414201352254> Butonuna Tıklayın', inline: true },
                { name: '<a:zyphera_yukleniyor:1464095331863101514> Diğer Destek', value: 'Diğer Konular İçin Hakkında Bilgi Almak Destek Almak İçin <a:zyphera_yukleniyor:1464095331863101514> Butonuna Tıklayın', inline: true }
            )
            .setColor('Blurple')
            .setFooter({ text: 'Zyphera Ticket Sistemi' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_info')
                .setEmoji('<:zyphera_info:1466034688903610471>')
                .setLabel('Bilgi Al')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_sikayet')
                .setEmoji('<:zyphera_kalkan:1466034432183111761>')
                .setLabel('Şikayet')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_basvuru')
                .setEmoji('<a:zyphera_parca:1464095414201352254>')
                .setLabel('Başvuru')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_destek')
                .setEmoji('<a:zyphera_yukleniyor:1464095331863101514>')
                .setLabel('Destek')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ content: '✅ Ticket paneli kuruluyor...', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [buttons] });
    },
};