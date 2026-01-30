const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Botun Yardım Menüsünü Görüntülersiniz'),

    async execute(interaction) {
        let lang = 'tr'; 
        const member = interaction.member;

        const trRoleId = process.env.ROLE_ID_TURKISH;
        const enRoleId = process.env.ROLE_ID_ENGLISH;

        if (member.roles.cache.has(enRoleId) && !member.roles.cache.has(trRoleId)) {
            lang = 'en';
        }

        const texts = {
            tr: {
                mainTitle: "Zyphera Yardım Menüsü",
                mainDesc: `**Kullanıcı Komutlarını Görmek İçin 📗 Butonuna Tıklayın\nAbone Yetkilisinin Komutlarını Görmek İçin 📕 Butonuna Tıklayın\nBot Yetkilisinin Komutlarını Görmek İçin 📘 Butonuna Tıklayın\nBot Sahibinin Komutlarını Görmek İçin 📙 Butonuna Tıklayın\nYetkili Sorumlusunun Komutlarını Görmek İçin 📚 Butonuna Tıklayın\nSunucu Sahibinin Komutlarını Görmek İçin 👑 Butonuna Tıklayın**`,
                
                greenTitle: "Kullanıcı Komutları",
                greenDesc: `**📗 \`/ping\` --> Botun Gecikmesini Görürsünüz\n📗 \`/help\` --> Botun Yardım Menüsünü Görürsünüz\n📗 \`/abone-key-oluştur\` --> Abone Rolüne Sahipseniz Abone Scriptlerini Kullanmanız İçin Özel Key Oluşturur\n📗 \`/profil <kullanıcı>\` --> Etiketlediğiniz Kişinin Veya Kendinizin Profilini Görürsünüz\n📗 \`/keylerim\` --> Sahip Olduğunuz Keyleri Gösterir\n📗 \`/yetkililer\` --> Bot Yetkililerini Gösterir\n📗 \`/abone-top\` --> Abone Sıralamasını Gösterir\n📗 \`/uyarılar\` --> Uyarı Alan Yetkileri Listeler\n📗 \`/uyarı-sorgula <kullanıcı>\` --> Etiketlenen Kişinin Uyarısını Sorgularsınız\n📗 \`/ticket-total\` --> Yetkili Ekibinde En Çok Ticket Sahiplenen Kişileri Listeler**`,

                redTitle: "Abone Yetkilisinin Komutları",
                redDesc: `**📕 \`/abone <kullanıcı>\` --> Etiketlenen Kişiye Abone Rolü Verir/Alır\n📕 \`/abone-sayım\` --> Toplam Abone Sayınızı Gösterir**`,

                blueTitle: "Bot Yetkilisi Komutları",
                blueDesc: `**📘 \`/key-oluştur <kullanıcı> <sebep> <scriptadı> <süre>\` --> Etiketlenen Kişiye Key Oluşturur\n📘 \`/key-sil <kullanıcı> <keyid> <sebep>\` --> ID'si Girilen Key'i Siler\n📘 \`/mevcut-keyler\` --> Aktif Olan Bütün Keyleri Listeler\n📘 \`/bütün-keyleri-sil\` --> Aktif Olan Bütün Keyleri Siler\n📘 \`/sorgula <kullanıcı>\` --> Etiketlenen Kişinin Üstüne Kayıtlı Olan Key'leri Gösterir\n📘 \`/key-sorgula <anahtar>\` --> Belirtilen Key'in Bilgilerini Verir\n📘 \`/hwid-sıfırla <anahatar> <sebep>\` --> Girilen Key'in HWID'ini Sıfırlar\n📘 \`/script-ad-değiştir <anahtar> <yeni-ad> <sebep>\` --> Girilen Key'in Script Adını Değiştirir**`,

                orangeTitle: "Bot Sahibinin Komutları",
                orangeDesc: `**📙 \`/yetkili-ekle <kullanıcı>\` --> Etiketlenen Kişiyi Bot Yetkilisi Kategorisine Ekler\n📙 \`/yetkili-çıkar <kullanıcı>\` --> Etiketlenen Kişiyi Bot Yetkilisi Kategorisinden Çıkarır\n📙 \`/abone-ekle <kullanıcı> <sayı>\` --> Etiketlenen Kişiye Abone Sayı Ekler\n📙 \`/abone-sil <kullanıcı> <sayı>\` --> Etiketlenen Kişiden Abone Sayı Siler\n📙 \`/dm-mesaj <kullanıcı> <mesaj>\` --> Etiketlenen Kişiye Dm'den Mesaj Gönderir**`,

                booksTitle: "Yetkili Sorumlusu Komutları",
                booksDesc: `**📚 \`/uyarı <kullanıcı> <sebep>\` --> Etiketlenen Yetkiliye Uyarı Verir\n📚 \`/uyarı-sil <kullanıcı> <sebep>\` --> Etiketlenen Yetkiliden Uyarı Siler\n📚 \`/uyarıları-sıfırla\` --> Bütün Yetkililerin Uyarılarını Sıfırlar\n📚 \`/ticket-ekle <kullanıcı> <miktar>\` --> Etiketlenen Yetkiliye Belirtilen Miktarda Ticket Sahiplenme Sayısı Ekler\n📚 \`/ticket-sil <kullanıcı> <miktar>\` --> Etiketlenen Yetkiliye Belirtilen Miktarda Ticket Sahiplenme Sayısı Siler\n📚 \`/ticket-sıfırla\` --> Bütün Yetkililerin Ticket Sahiplenme Sayısını Sıfırlar**`,

                crownTitle: "Sunucu Sahibinin Komutları",
                crownDesc: `**👑 \`/herkese-rol-ver @rol\` --> Belirtilen Rolü Bütün Sunucudaki Üyelere Verir\n👑 \`/herkesten-rol-al @rol\` --> Belirtilen Rolü Bütün Sunucu Üyelerden Alır**`,
            },
            en: {
                mainTitle: "Zyphera Help Menu",
                mainDesc: `**Click 📗 to see User Commands\nClick 📕 To See Subscriber Staff Commands\nClick 📘 To See Bot Staff Commands\nClick 📙 To See Bot Owner Commands\nClick 📚 To See Staff Manager Commands\nClick 👑 To See Server Owner Commands**`,

                greenTitle: "User Commands",
                greenDesc: `**📗 \`/ping\` --> See the bot's latency\n📗 \`/help\` --> You will see the bot's Help Menu.\n📗 \`/abone-key-oluştur\` --> Generate a special key for subscriber scripts\n📗 \`/profil <user>\` --> View your own or another user's profile\n📗 \`/keylerim\` --> Show the keys you own\n📗 \`/yetkililer\` --> Show Bot Staff list\n📗 \`/abone-top\` --> Show Subscriber Leaderboard\n📗 \`/uyarılar\` --> Lists Staff Members Who Received Warnings\n📗 \`/uyarı-sorgula <kullanıcı>\` --> Check The Warnings Of The Mentioned User\n📗 \`/ticket-total\` --> Lists Yhe Staff Members With The Most Claimed Tickets**`,

                redTitle: "Subscriber Staff Commands",
                redDesc: `**📕 \`/abone <user>\` --> Give/Take Subscriber role to a user\n📕 \`/abone-sayım\` --> Show your total subscriber count**`,

                blueTitle: "Bot Staff Commands",
                blueDesc: `**📘 \`/key-oluştur <user> <reason> <scriptname> <duration>\` --> Create a key for a user\n📘 \`/key-sil <user> <keyid> <reason>\` --> Delete a key by ID\n📘 \`/mevcut-keyler\` --> List all active keys\n📘 \`/bütün-keyleri-sil\` --> Delete all active keys\n📘 \`/sorgula <user>\` --> Show keys registered to a user\n📘 \`/key-sorgula <key>\` --> Show info about a specific key\n📘 \`/hwid-sıfırla <key> <reason>\` --> Reset HWID for a key\n📘 \`/script-ad-değiştir <key> <new-name> <reason>\` --> Change script name of a key**`,

                orangeTitle: "Bot Owner Commands",
                orangeDesc: `**📙 \`/yetkili-ekle <user>\` --> Add user to Bot Staff category\n📙 \`/yetkili-çıkar <user>\` --> Remove user from Bot Staff category\n📙 \`/abone-ekle <user> <count>\` --> Add subscriber count to a user\n📙 \`/abone-sil <user> <count>\` --> Remove subscriber count from a user\n📙 \`/dm-mesaj <user> <message>\` --> Send a DM to a user**`,
                
                booksTitle: "Staff Manager Commands",
                booksDesc: `**📚 \`/uyarı <user> <reason>\` --> Warns The Mentioned Staff Member\n📚 \`/uyarı-sil <user> <reason>\` --> Removes A Warning From The Mentioned Staff Member\n📚 \`/uyarıları-sıfırla\` --> Resets All Staff Members' Warnings📚 \`/ticket-ekle <kullanıcı> <miktar>\` --> Add ticket claims to a staff member\n📚 \`/ticket-sil <kullanıcı> <miktar>\` --> Remove ticket claims from a staff member\n📚 \`/ticket-sıfırla\` --> Reset all staff claim counts**`,

                crownTitle: "Server Owner Commands",
                crownDesc: `**👑 \`/herkese-rol-ver @role\` --> Give a role to everyone in the server\n👑 \`/herkesten-rol-al @role\` --> Take a role from everyone in the server**`,
            }
        };

        const t = texts[lang];

        const embed = new EmbedBuilder()
            .setTitle(t.mainTitle)
            .setDescription(t.mainDesc)
            .setColor('Random')
            .setTimestamp();

        // --- BUTONLARI İKİ SATIRA BÖLÜYORUZ (Discord Limiti 5 Buton / Satır) ---
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('btn_user').setEmoji('📗').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_substaff').setEmoji('📕').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_botstaff').setEmoji('📘').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_botowner').setEmoji('📙').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_yetkilis').setEmoji('📚').setStyle(ButtonStyle.Secondary),
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('btn_owner').setEmoji('👑').setStyle(ButtonStyle.Secondary),
            );

        const response = await interaction.reply({ embeds: [embed], components: [row1, row2] });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async i => {
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
                case 'btn_user': newTitle = t.greenTitle; newDesc = t.greenDesc; color = "Green"; break;
                case 'btn_substaff': newTitle = t.redTitle; newDesc = t.redDesc; color = "Red"; break;
                case 'btn_botstaff': newTitle = t.blueTitle; newDesc = t.blueDesc; color = "Blue"; break;
                case 'btn_botowner': newTitle = t.orangeTitle; newDesc = t.orangeDesc; color = "Orange"; break;
                case 'btn_yetkilis': newTitle = t.booksTitle; newDesc = t.booksDesc; color = "Grey"; break;
                case 'btn_owner': newTitle = t.crownTitle; newDesc = t.crownDesc; color = "Gold"; break;    
            }

            const newEmbed = new EmbedBuilder()
                .setTitle(newTitle)
                .setDescription(newDesc)
                .setColor(color)
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            // components kısmına her iki satırı da ekliyoruz
            await i.update({ embeds: [newEmbed], components: [row1, row2] });
        });

        collector.on('end', () => {
            const disabledRow1 = new ActionRowBuilder();
            const disabledRow2 = new ActionRowBuilder();
            row1.components.forEach(c => disabledRow1.addComponents(ButtonBuilder.from(c).setDisabled(true)));
            row2.components.forEach(c => disabledRow2.addComponents(ButtonBuilder.from(c).setDisabled(true)));
            interaction.editReply({ components: [disabledRow1, disabledRow2] }).catch(() => {});
        });
    },
};