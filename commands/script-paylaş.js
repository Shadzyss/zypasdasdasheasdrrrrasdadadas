const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Admin = require('../models/adminModel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('script-paylaş')
        .setDescription('Yeni bir script paylaşım embedi oluşturur.'),

    async execute(interaction) {
        const { member, user } = interaction;
        const isEnglish = member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        // --- YETKİ KONTROLÜ ---
        const isAdmin = await Admin.findOne({ userId: user.id });
        if (!isAdmin) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(isEnglish ? "❌ No Permission" : "❌ Yetkin Yok")
                .setDescription(isEnglish 
                    ? "**You must be a Bot Official to use this command!**" 
                    : "**Bu Komutu Kullanmak İçin Bot Yetkilisi Olmalısınız!**")
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- MODAL (FORM) OLUŞTURMA ---
        const modal = new ModalBuilder()
            .setCustomId('modal_script_paylas')
            .setTitle(isEnglish ? 'Script Sharing Form' : 'Script Paylaşım Formu');

        // Alan 1: Oyun Adı
        const gameName = new TextInputBuilder()
            .setCustomId('input_game_name')
            .setLabel(isEnglish ? "Game Name" : "Scriptin Yapıldığı Oyun Adı")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Alan 2: Script Link
        const scriptLink = new TextInputBuilder()
            .setCustomId('input_script_link')
            .setLabel("Script Link")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Alan 3: Özellikler
        const scriptFeatures = new TextInputBuilder()
            .setCustomId('input_script_features')
            .setLabel(isEnglish ? "Script Features" : "Script Özellikleri")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // Alan 4: Yapımcı ID
        const creatorId = new TextInputBuilder()
            .setCustomId('input_creator_id')
            .setLabel(isEnglish ? "Creator Discord ID" : "Scripti Yapan Kişinin ID'si")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Alan 5: Görsel Linki (YENİ)
        const scriptImage = new TextInputBuilder()
            .setCustomId('input_script_image')
            .setLabel(isEnglish ? "Script Image Link" : "Script Görseli (Link)")
            .setPlaceholder("https://i.imgur.com/example.png")
            .setStyle(TextInputStyle.Short)
            .setRequired(false); // İsteğe bağlı yapabilirsin

        modal.addComponents(
            new ActionRowBuilder().addComponents(gameName),
            new ActionRowBuilder().addComponents(scriptLink),
            new ActionRowBuilder().addComponents(scriptFeatures),
            new ActionRowBuilder().addComponents(creatorId),
            new ActionRowBuilder().addComponents(scriptImage)
        );

        await interaction.showModal(modal);
    },
};