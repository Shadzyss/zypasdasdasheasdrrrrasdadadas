const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Botun Yardım Menüsünü Görüntülersiniz'),

    async execute(interaction) {
        // --- 1. DİL KONTROLÜ (.env'den çekiyoruz) ---
        // Varsayılan dili Türkçe yapıyoruz. Hiçbir rolü yoksa burası geçerli kalır.
        let lang = 'tr'; 
        const member = interaction.member;

        // .env dosyanın fotoğrafındaki değişken isimlerini kullanıyoruz
        const trRoleId = process.env.ROLE_ID_TURKISH;
        const enRoleId = process.env.ROLE_ID_ENGLISH;

        // SADECE İngilizce rolü varsa ve Türkçe rolü YOKSA dili İngilizce yap.
        // Eğer hiç rolü yoksa bu if bloğuna girmez ve dil 'tr' kalır.
        if (member.roles.cache.has(enRoleId) && !member.roles.cache.has(trRoleId)) {
            lang = 'en';
        }

        // --- 2. İÇERİKLER ---
        const texts = {
            tr: {
                mainTitle: "Zyphera Yardım Menüsü",
                mainDesc: `**Kullanıcı Komutlarını Görmek İçin 📗 Butonuna Tıklayın
Abone Yetkilisinin Komutlarını Görmek İçin 📕 Butonuna Tıklayın
Bot Yetkilisinin Komutlarını Görmek İçin 📘 Butonuna Tıklayın
Bot Sahibinin Komutlarını Görmek İçin 📙 Butonuna Tıklayın
Yetkili Sorumlusunun Komutlarını Görmek İçin 📚 Butonuna Tıklayın 
Sunucu Sahibinin Komutlarını Görmek İçin 👑 Butonuna Tıklayın**`,
                
                greenTitle: "Kullanıcı Komutları",
                greenDesc: `**📗 \`/ping\` --> Botun Gecikmesini Görürsünüz
📗 \`/help\` --> Botun Yardım Menüsünü Görürsünüz
📗 \`/abone-key-oluştur\` --> Abone Rolüne Sahipseniz Abone Scriptlerini Kullanmanız İçin Özel Key Oluşturur
📗 \`/profil <kullanıcı>\` --> Etiketlediğiniz Kişinin Veya Kendinizin Profilini Görürsünüz
📗 \`/keylerim\` --> Sahip Olduğunuz Keyleri Gösterir
📗 \`/yetkililer\` --> Bot Yetkililerini Gösterir
📗 \`/abone-top\` --> Abone Sıralamasını Gösterir
📗 \`/uyarılar\` --> Uyarı Alan Yetkileri Listeler
📗 \`uyarı-sorgula <kullanıcı>\` --> Etiketlenen Kişinin Uyarısını Sorgularsınız**`,

                redTitle: "Abone Yetkilisinin Komutları",
                redDesc: `**📕 \`/abone <kullanıcı>\` --> Etiketlenen Kişiye Abone Rolü Verir/Alır
📕 \`/abone-sayım\` --> Toplam Abone Sayınızı Gösterir**`,

                blueTitle: "Bot Yetkilisi Komutları",
                blueDesc: `**📘 \`/key-oluştur <kullanıcı> <sebep> <scriptadı> <süre>\` --> Etiketlenen Kişiye Key Oluşturur
📘 \`/key-sil <kullanıcı> <keyid> <sebep>\` --> ID'si Girilen Key'i Siler
📘 \`/mevcut-keyler\` --> Aktif Olan Bütün Keyleri Listeler
📘 \`/bütün-keyleri-sil\` --> Aktif Olan Bütün Keyleri Siler
📘 \`/sorgula <kullanıcı>\` --> Etiketlenen Kişinin Üstüne Kayıtlı Olan Key'leri Gösterir
📘 \`/key-sorgula <anahtar>\` --> Belirtilen Key'in Bilgilerini Verir
📘 \`/hwid-sıfırla <anahatar> <sebep>\` --> Girilen Key'in HWID'ini Sıfırlar
📘 \`/script-ad-değiştir <anahtar> <yeni-ad> <sebep>\` --> Girilen Key'in Script Adını Değiştirir**`,

                orangeTitle: "Bot Sahibinin Komutları",
                orangeDesc: `**📙 \`/yetkili-ekle <kullanıcı>\` --> Etiketlenen Kişiyi Bot Yetkilisi Kategorisine Ekler
📙 \`/yetkili-çıkar <kullanıcı>\` --> Etiketlenen Kişiyi Bot Yetkilisi Kategorisinden Çıkarır
📙 \`/abone-ekle <kullanıcı> <sayı>\` --> Etiketlenen Kişiye Abone Sayı Ekler
📙 \`/abone-sil <kullanıcı> <sayı>\` --> Etiketlenen Kişiden Abone Sayı Siler
📙 \`/dm-mesaj <kullanıcı> <mesaj>\` --> Etiketlenen Kişiye Dm'den Mesaj Gönderir**`,

                booksTitle: "Yetkili Sorumlusun Komutları",
                booksDesc: `**📚 \`/uyarı <kullanıcı> <sebep\` --> Etiketlenen Yetkiliye Uyarı Verir
📚 \`/uyarı-sil <kullanıcı> <sebep>\` --> Etiketlenen Yetkiliden Uyarı Siler
📚 \`/uyarıları-sıfırla\` --> Bütün Yetkililerin Uyarılarını Sıfırlar**`,

                crownTitle: "Sunucu Sahibinin Komutları",
                crownDesc: `**👑 \`/herkese-rol-ver @rol\` --> Belirtilen Rolü Bütün Sunucudaki Üyelere Verir
👑 \`/herkesten-rol-al @rol\` --> Belirtilen Rolü Bütün Sunucu Üyelerden Alır**`,
            },
            en: {
                mainTitle: "Zyphera Help Menu",
                mainDesc: `**Click 📗 to see User Commands
Click 📕 To See Subscriber Staff Commands
Click 📘 To See Bot Staff Commands
Click 📙 To See Bot Owner Commands
Click 📚 To See Staff Manager Commands
Click 👑 To See Server Owner Commands**`,

                greenTitle: "User Commands",
                greenDesc: `**📗 \`/ping\` --> See the bot's latency
📗 \`/help\` --> You will see the bot's Help Menu.
📗 \`/abone-key-oluştur\` --> Generate a special key for subscriber scripts
📗 \`/profil <user>\` --> View your own or another user's profile
📗 \`/keylerim\` --> Show the keys you own
📗 \`/yetkililer\` --> Show Bot Staff list
📗 \`/abone-top\` --> Show Subscriber Leaderboard**`,

                redTitle: "Subscriber Staff Commands",
                redDesc: `**📕 \`/abone <user>\` --> Give/Take Subscriber role to a user
📕 \`/abone-sayım\` --> Show your total subscriber count**`,

                blueTitle: "Bot Staff Commands",
                blueDesc: `**📘 \`/key-oluştur <user> <reason> <scriptname> <duration>\` --> Create a key for a user
📘 \`/key-sil <user> <keyid> <reason>\` --> Delete a key by ID
📘 \`/mevcut-keyler\` --> List all active keys
📘 \`/bütün-keyleri-sil\` --> Delete all active keys
📘 \`/sorgula <user>\` --> Show keys registered to a user
📘 \`/key-sorgula <key>\` --> Show info about a specific key
📘 \`/hwid-sıfırla <key> <reason>\` --> Reset HWID for a key
📘 \`/script-ad-değiştir <key> <new-name> <reason>\` --> Change script name of a key**`,

                orangeTitle: "Bot Owner Commands",
                orangeDesc: `**📙 \`/yetkili-ekle <user>\` --> Add user to Bot Staff category
📙 \`/yetkili-çıkar <user>\` --> Remove user from Bot Staff category
📙 \`/abone-ekle <user> <count>\` --> Add subscriber count to a user
📙 \`/abone-sil <user> <count>\` --> Remove subscriber count from a user
📙 \`/dm-mesaj <user> <message>\` --> Send a DM to a user**`,
                
                booksTitle: "Staff Manager Commands",
                booksDesc: `**📚 \`/uyarı <kullanıcı> <sebep\` --> Warns The Mentioned Staff Member
📚 \`/uyarı-sil <kullanıcı> <sebep>\` --> Removes A Warning From The Mentioned Staff Member
📚 \`/uyarıları-sıfırla\` --> Resets All Staff Members' Warnings**`,

                crownTitle: "Server Owner Commands",
                crownDesc: `**👑 \`/herkese-rol-ver @role\` --> Give a role to everyone in the server
👑 \`/herkesten-rol-al @role\` --> Take a role from everyone in the server**`,
            }
        };

        const t = texts[lang];

        // --- 3. EMBED VE BUTONLAR ---
        const embed = new EmbedBuilder()
            .setTitle(t.mainTitle)
            .setDescription(t.mainDesc)
            .setColor('Random')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('btn_user').setEmoji('📗').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_substaff').setEmoji('📕').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_botstaff').setEmoji('📘').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_botowner').setEmoji('📙').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_yetkilis').setEmoji('📚').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_owner').setEmoji('👑').setStyle(ButtonStyle.Secondary),
            );

        const response = await interaction.reply({ embeds: [embed], components: [row] });

        // --- 4. COLLECTOR (BUTON DİNLEYİCİ) ---
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async i => {
            // SADECE KOMUTU KULLANAN KİŞİ KULLANSIN
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: lang === 'tr' ? 'Bu menüyü sadece komutu kullanan kişi yönetebilir.' : 'Only the command user can control this menu.', 
                    ephemeral: true 
                });
            }

            let newTitle = "";
            let newDesc = "";
            let color = "Random";

            switch (i.customId) {
                case 'btn_user':
                    newTitle = t.greenTitle;
                    newDesc = t.greenDesc;
                    color = "Green";
                    break;
                case 'btn_substaff':
                    newTitle = t.redTitle;
                    newDesc = t.redDesc;
                    color = "Red";
                    break;
                case 'btn_botstaff':
                    newTitle = t.blueTitle;
                    newDesc = t.blueDesc;
                    color = "Blue";
                    break;
                case 'btn_botowner':
                    newTitle = t.orangeTitle;
                    newDesc = t.orangeDesc;
                    color = "Orange";
                    break;
                case 'btn_yetkilis':
                    newTitle = t.booksTitle;
                    newDesc = t.booksDesc;
                    color = "Pink";
                    break;
                case 'btn_owner':
                    newTitle = t.crownTitle;
                    newDesc = t.crownDesc;
                    color = "Gold";
                    break;    
            }

            const newEmbed = new EmbedBuilder()
                .setTitle(newTitle)
                .setDescription(newDesc)
                .setColor(color)
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            await i.update({ embeds: [newEmbed], components: [row] });
        });

        collector.on('end', () => {
            // Süre bitince butonları pasif yap
            const disabledRow = new ActionRowBuilder();
            row.components.forEach(c => disabledRow.addComponents(ButtonBuilder.from(c).setDisabled(true)));
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};