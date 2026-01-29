const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Staff } = require('../models/ticketSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-sıfırla')
        .setDescription('Puanları sıfırlar / Resets all points.'),
    async execute(interaction) {
        const isUs = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        if (!interaction.member.roles.cache.has(process.env.YETKILI_SORUMLUSU_ROL_ID)) {
            const errEmbed = new EmbedBuilder().setColor('Red').setDescription(isUs ? '**❌ No permission!**' : '**❌ Bu komutu kullanmak için yetkin yok!**');
            return interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }

        const confirmEmbed = new EmbedBuilder()
            .setTitle(isUs ? 'Reset Confirmation' : 'Sıfırlama Onayı')
            .setDescription(isUs ? '**Are you sure you want to reset all points?**' : '**Bütün yetkililerin ticket puanlarını sıfırlamak istediğine emin misin?**')
            .setColor('Yellow');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reset_confirm').setLabel(isUs ? 'Confirm' : 'Onayla').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('reset_cancel').setLabel(isUs ? 'Cancel' : 'İptal Et').setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.reply({ embeds: [confirmEmbed], components: [row] });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const conf = await response.awaitMessageComponent({ filter, time: 20000 });

            if (conf.customId === 'reset_confirm') {
                await Staff.updateMany({}, { claimCount: 0 });
                const success = new EmbedBuilder()
                    .setTitle('Ticket Sahiplenme Sayısı Sıfırlandı')
                    .setDescription(isUs 
                        ? `**${interaction.user} Successfully reset all staff ticket claim counts**`
                        : `**${interaction.user} Başarıyla Bütün Yetkililerin Ticket Sahiplenme Sayısı Sıfırlandı**`)
                    .setColor('Green');
                await conf.update({ embeds: [success], components: [] });
            } else {
                const cancelEmbed = new EmbedBuilder().setColor('Red').setDescription(isUs ? '**❌ Cancelled.**' : '**❌ İşlem iptal edildi.**');
                await conf.update({ embeds: [cancelEmbed], components: [] });
            }
        } catch (e) {
            await interaction.editReply({ content: 'Timeout.', components: [] });
        }
    },
};