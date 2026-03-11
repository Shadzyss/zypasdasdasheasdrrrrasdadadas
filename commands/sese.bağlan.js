const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sese-bağlan')
        .setDescription('Botu Ses Kanalına Bağlar Veya Sesten Çıkarır.'),

    async execute(interaction) {
        const { member, guild } = interaction;
        
        // --- DİL KONTROLÜ (Hata Mesajları İçin) ---
        const isEnglish = member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        // --- SAHİP KONTROLÜ ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(isEnglish ? "❌ Error" : "❌ Hata")
                .setDescription(isEnglish 
                    ? "**Only The Bot Owner Can Use This Command!**" 
                    : "**Bu Komutu Sadece Bot Sahibi Kullanabilir!**")
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const voiceChannelId = process.env.VOICE_CHANNEL_ID;
        const voiceChannel = guild.channels.cache.get(voiceChannelId);

        // --- KANAL GEÇERLİLİK KONTROLÜ ---
        if (!voiceChannel || !voiceChannel.isVoiceBased()) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(isEnglish ? "❌ Error" : "❌ Hata")
                .setDescription(isEnglish 
                    ? "**Voice channel not found or invalid! Please check the VOICE_CHANNEL_ID variable in your .env file.**" 
                    : "**Ses kanalı bulunamadı veya geçersiz! Lütfen .env dosyanızdaki VOICE_CHANNEL_ID değişkenini kontrol edin.**")
                .setColor("Red");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // --- MEVCUT BAĞLANTIYI KONTROL ET ---
        let connection = getVoiceConnection(guild.id);

        if (connection) {
            // ============================================
            // EĞER BOT ZATEN SESTEYSE -> ÇIKIŞ YAP (TOGGLE)
            // ============================================
            
            // Çıkış yaptığımızda otomatik geri girmesin diye bayrağı (flag) false yapıyoruz
            connection.autoReconnect = false; 
            connection.destroy();

            const leaveEmbed = new EmbedBuilder()
                .setTitle('Başarılı')
                .setDescription(`**<a:zyphera_cikis:1481303934365728925> Bot Başarıyla <#${voiceChannelId}> Adlı Kanaldan Çıkış Yaptı**`)
                .setColor('Green');

            return interaction.reply({ embeds: [leaveEmbed] });

        } else {
            // ============================================
            // EĞER BOT SESTE DEĞİLSE -> BAĞLAN VE KORUMA AÇ
            // ============================================

            connection = joinVoiceChannel({
                channelId: voiceChannelId,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });

            // Otomatik yeniden bağlanmayı aktif ediyoruz
            connection.autoReconnect = true; 

            // --- KORUMA (AUTO-RECONNECT) MANTIĞI ---
            // Eğer birisi botun bağlantısını keserse burası tetiklenir
            connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    // Botun kendiliğinden ağı düzelip düzelmediğini bekliyoruz (5 saniye)
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                    ]);
                } catch (error) {
                    // Eğer 5 saniye içinde kendi bağlanamadıysa ve biz "çık" demediysek, ZORLA GERİ SOK!
                    if (connection.autoReconnect) {
                        try {
                            joinVoiceChannel({
                                channelId: voiceChannelId,
                                guildId: guild.id,
                                adapterCreator: guild.voiceAdapterCreator,
                            });
                        } catch (e) {
                            console.error("Bot ses kanalına zorla yeniden sokulurken bir hata oluştu:", e);
                        }
                    } else {
                        // Eğer biz komutla çıkarttıysak bağlantıyı tamamen öldür
                        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                            connection.destroy();
                        }
                    }
                }
            });

            const joinEmbed = new EmbedBuilder()
                .setTitle('Başarılı')
                .setDescription(`**<a:zyphera_giris:1481303560586002573> Bot Başarıyla <#${voiceChannelId}> Adlı Ses Kanalına Bağlandı**`)
                .setColor('Green');

            return interaction.reply({ embeds: [joinEmbed] });
        }
    }
};