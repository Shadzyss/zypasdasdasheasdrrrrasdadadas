const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Admin = require('../models/adminModel'); // Yetkili kontrolü için

module.exports = {
    data: new SlashCommandBuilder()
        .setName('script-paylaş')
        .setDescription('Yeni bir script paylaşım embedi oluşturur.'),

    async execute(interaction) {
        const { member, user } = interaction;
        
        // --- DİL KONTROLÜ ---
        const isEnglish = member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        // --- YETKİ KONTROLÜ (Admin Model) ---
        const isAdmin = await Admin.findOne({ userId: user.id });
        if (!isAdmin) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(isEnglish ? "❌ No Permission" : "❌ Yetkin Yok")
                .setDescription(isEnglish 
                    ? "**You Must be a Bot Official to use this command!**" 
                    : "**Bu Komutu Kullanmak İçin Bot Yetkilisi Olmalısınız!**")
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- MODAL (FORM) OLUŞTURMA ---
        const modal = new ModalBuilder()
            .setCustomId('modal_script_paylas')
            .setTitle(isEnglish ? 'Script Sharing Form' : 'Script Paylaşım Formu');

        const gameName = new TextInputBuilder()
            .setCustomId('input_game_name')
            .setLabel(isEnglish ? "Game Name" : "Scriptin Yapıldığı Oyun Adı")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const scriptLink = new TextInputBuilder()
            .setCustomId('input_script_link')
            .setLabel("Script Link")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const scriptFeatures = new TextInputBuilder()
            .setCustomId('input_script_features')
            .setLabel(isEnglish ? "Script Features" : "Script Özellikleri")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const creatorId = new TextInputBuilder()
            .setCustomId('input_creator_id')
            .setLabel(isEnglish ? "Creator Discord ID" : "Scripti Yapan Kişinin ID'si")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(gameName),
            new ActionRowBuilder().addComponents(scriptLink),
            new ActionRowBuilder().addComponents(scriptFeatures),
            new ActionRowBuilder().addComponents(creatorId)
        );

        await interaction.showModal(modal);
    },
};