const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Admin = require('../models/adminModel');
const SubscriberKey = require('../models/subscriberKeyModel');
const GeneralKey = require('../models/generalKeyModel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Profilinizi ve detaylı bilgileri gösterir')
        .addUserOption(option => 
            option.setName('kullanıcı')
                .setDescription('Profili Görüntülenecek Kişi (Boş bırakırsanız kendi profiliniz)')
                .setRequired(false)),

    async execute(interaction) {
        const { member, guild } = interaction;
        
        // --- 1. DİL KONTROLÜ ---
        const isEnglish = member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        // --- 2. HEDEF KULLANICIYI BELİRLE ---
        const targetUserOption = interaction.options.getUser('kullanıcı') || interaction.user;
        const targetUser = await interaction.client.users.fetch(targetUserOption.id, { force: true });

        let targetMember;
        try {
            targetMember = await guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.reply({ content: isEnglish ? 'User not found.' : 'Kullanıcı bulunamadı.', ephemeral: true });
        }

        // --- 3. PROFIL VERİLERİ (Mevcut kodların) ---
        const sortedMembers = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
        const joinPosition = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
        const joinRankText = `**#${joinPosition}** / ${guild.memberCount}`;

        // Cihaz Durumu
        let deviceStatus = isEnglish ? "`Offline`" : "`Çevrimdışı`";
        let activeDevice = "";
        if (targetMember.presence && targetMember.presence.clientStatus) {
            const status = targetMember.presence.clientStatus;
            const devices = [];
            if (status.desktop) devices.push(isEnglish ? "Desktop 🖥️" : "Bilgisayar 🖥️");
            if (status.mobile) devices.push(isEnglish ? "Mobile 📱" : "Mobil 📱");
            if (status.web) devices.push(isEnglish ? "Web 🌐" : "Tarayıcı 🌐");
            if (devices.length > 0) {
                deviceStatus = devices.join(', ');
                activeDevice = targetMember.presence.status === 'dnd' ? '🔴' : targetMember.presence.status === 'idle' ? '🟡' : '🟢';
            }
        }

        // Durum
        let status = "offline";
        if (targetMember.presence) status = targetMember.presence.status;
        const statusMap = {
            online: isEnglish ? "Online" : "Çevrimiçi",
            idle: isEnglish ? "Idle" : "Boşta",
            dnd: isEnglish ? "Do Not Disturb" : "Rahatsız Etmeyin",
            offline: isEnglish ? "Offline/Invisible" : "Çevrimdışı/Görünmez"
        };
        const displayStatus = statusMap[status] || (isEnglish ? "Offline/Invisible" : "Çevrimdışı/Görünmez");

        // Yetki Bilgileri
        const isBotStaffCheck = await Admin.findOne({ userId: targetUser.id });
        const isBotStaff = isBotStaffCheck ? (isEnglish ? "`✅ Yes`" : "`✅ Evet`") : (isEnglish ? "`❌ No`" : "`❌ Hayır`");
        const isAdminCheck = targetMember.permissions.has(PermissionFlagsBits.Administrator);
        const isAdmin = isAdminCheck ? (isEnglish ? "`✅ Yes`" : "`✅ Evet`") : (isEnglish ? "`❌ No`" : "`❌ Hayır`");
        const isSubStaffCheck = targetMember.roles.cache.has(process.env.ROLE_ID_ABONE_STAFF);
        const isSubStaff = isSubStaffCheck ? (isEnglish ? "`✅ Yes`" : "`✅ Evet`") : (isEnglish ? "`❌ No`" : "`❌ Hayır`");

        // Roller
        const roles = targetMember.roles.cache
            .filter(r => r.id !== guild.id) 
            .sort((a, b) => b.position - a.position)
            .map(r => r)
            .join(' ') || (isEnglish ? "No Roles" : "Rolü Yok");

        // Tarih ve Keyler
        const createdAtTs = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedAtTs = targetMember.joinedTimestamp ? Math.floor(targetMember.joinedTimestamp / 1000) : null;
        const joinedAtDisplay = joinedAtTs ? `<t:${joinedAtTs}:F>` : (isEnglish ? "`Unknown`" : "`Bilinmiyor`");

        let totalActiveKeys = 0;
        let hasAboneKey = isEnglish ? "`❌ No`" : "`❌ Hayır`";
        let nextExpiration = isEnglish ? "`None`" : "`Yok`";

        if (targetUser.bot) {
            const botMsg = "`BOT`";
            totalActiveKeys = botMsg; hasAboneKey = botMsg; nextExpiration = botMsg;
        } else {
            const subKeys = await SubscriberKey.find({ ownerId: targetUser.id });
            const genKeys = await GeneralKey.find({ ownerId: targetUser.id });
            const allKeys = [...subKeys, ...genKeys];
            totalActiveKeys = `\`${allKeys.length}\``;
            if (subKeys.length > 0) hasAboneKey = isEnglish ? "`✅ Yes`" : "`✅ Evet`";
            
            const timedKeys = allKeys.filter(k => k.expiresAt && !isNaN(new Date(k.expiresAt).getTime()));
            if (allKeys.length > 0 && timedKeys.length === 0) nextExpiration = isEnglish ? "`Unlimited`" : "`Sınırsız`";
            else if (timedKeys.length > 0) {
                timedKeys.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
                const nearestDate = Math.floor(new Date(timedKeys[0].expiresAt).getTime() / 1000);
                nextExpiration = `<t:${nearestDate}:R>`; 
            } else nextExpiration = isEnglish ? "`No Keys`" : "`Key Yok`";
        }

        // Metinler
        const labels = {
            title: isEnglish ? `${targetUser.username}'s Profile` : `${targetUser.username} Adlı Kişinin Profili`,
            userInfo: isEnglish ? "`----- 👤 User Information 👤 -----`" : "`----- 👤 Kullanıcı Bilgileri 👤 -----`",
            username: isEnglish ? "👤 Username" : "👤 Kullanıcı Adı",
            id: isEnglish ? "🆔 User ID" : "🆔 Kullanıcının ID'si",
            device: isEnglish ? "📱 Device/Activity" : "📱 Cihaz/Aktivite",
            joinRank: isEnglish ? "🔢 Join Rank" : "🔢 Katılım Sırası",
            displayName: isEnglish ? "👥 Server Name" : "👥 Kişinin Sunucudaki Adı",
            status: isEnglish ? "🟣 User Status" : "🟣 Kişinin Durumu",
            staffInfo: isEnglish ? "`----- ⚒️ Authority Information ⚒️ -----`" : "`----- ⚒️ Yetki Bilgileri ⚒️ -----`",
            botStaff: isEnglish ? "🌟 Is Bot Staff?" : "🌟 Kişi Bot Yetkilisi Mi?",
            admin: isEnglish ? "⁉️ Is Administrator?" : "⁉️ Kişi Yönetici Mi?",
            subStaff: isEnglish ? "⛓️‍💥 Is Subscriber Staff?" : "⛓️‍💥 Kişi Abone Yetkilisi Mi?",
            rolesHeader: isEnglish ? "`----- 🎭 Roles 🎭 -----`" : "`----- 🎭 Rolleri 🎭 -----`",
            accountInfo: isEnglish ? "`----- 🪪 Account Information 🪪 -----`" : "`----- 🪪 Hesap Bilgileri 🪪 -----`",
            createdAt: isEnglish ? "📅 Account Created" : "📅 Hesap Oluşturma",
            joinedAt: isEnglish ? "📅 Server Joined" : "📅 Sunucuya Katılım",
            keyInfo: isEnglish ? "`----- 🔑 Key Information 🔑 -----`" : "`----- 🔑 Key Bilgileri 🔑 -----`",
            totalKeys: isEnglish ? "🟢 Total Keys" : "🟢 Toplam Key",
            hasSubKey: isEnglish ? "🔴 Sub Key?" : "🔴 Abone Key Var mı?",
            expiration: isEnglish ? "⚫ Expiration" : "⚫ Bitiş Süresi",
            footer: isEnglish ? `Command Used By --> ${interaction.user.username}` : `Komutu Kullanan --> ${interaction.user.username}`
        };

        const embed = new EmbedBuilder()
            .setTitle(labels.title)
            .setDescription(`
**${labels.userInfo}
${labels.username} --> \`${targetUser.username}\` (${targetUser})
${labels.id} --> \`${targetUser.id}\`
${labels.joinRank} --> ${joinRankText}
${labels.displayName} --> \`${targetMember.displayName}\`
${labels.status} --> \`${displayStatus}\`
${labels.device} --> ${deviceStatus} ${activeDevice}

${labels.staffInfo}
${labels.botStaff} --> ${isBotStaff}
${labels.admin} --> ${isAdmin}
${labels.subStaff} --> ${isSubStaff}

${labels.rolesHeader}
${roles}

${labels.accountInfo}
${labels.createdAt} --> <t:${createdAtTs}:D> (<t:${createdAtTs}:R>)
${labels.joinedAt} --> ${joinedAtDisplay}

${labels.keyInfo}
${labels.totalKeys} --> ${totalActiveKeys}
${labels.hasSubKey} --> ${hasAboneKey}
${labels.expiration} --> ${nextExpiration}**
            `)
            .setColor(targetUser.hexAccentColor || 'Random')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: labels.footer, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        if (targetUser.bannerURL()) {
            embed.setImage(targetUser.bannerURL({ size: 1024, extension: 'png' }));
        }

        // --- BUTONLAR ---
        const btnLabels = {
            perms: isEnglish ? "Permissions" : "İzinler",
            banner: isEnglish ? "Banner" : "Banner",
            avatar: isEnglish ? "Avatar" : "Avatar"
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_perms').setLabel(btnLabels.perms).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('btn_banner').setLabel(btnLabels.banner).setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
            new ButtonBuilder().setCustomId('btn_avatar').setLabel(btnLabels.avatar).setStyle(ButtonStyle.Secondary).setEmoji('👤')
        );

        const replyMessage = await interaction.reply({ embeds: [embed], components: [row] });

        // --- COLLECTOR (SÜRESİZ GİBİ ÇALIŞIR) ---
        // Zamanı çok yüksek veriyoruz, 'end' eventi ile butonları kapatmayı sildik.
        const filter = i => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 999_999_999, componentType: ComponentType.Button });

        collector.on('collect', async i => {
            
            // --- İZİNLER BUTONU ---
            if (i.customId === 'btn_perms') {
                let descText = "";

                // 1. Durum: Yönetici ise
                if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
                    descText = isEnglish 
                        ? "**⚠️ This User Has Administrator Permission.**" 
                        : "**⚠️ Bu Kullanıcı Yönetici İznine Sahip.**";
                } 
                // 2. Durum: Yönetici değilse, TÜM yetkilerini listele
                else {
                    // Discord'daki çoğu yetkinin Türkçe karşılığı
                    const permissionNames = {
                        CreateInstantInvite: "Davet Oluştur",
                        KickMembers: "Üyeleri At",
                        BanMembers: "Üyeleri Yasakla",
                        Administrator: "Yönetici",
                        ManageChannels: "Kanalları Yönet",
                        ManageGuild: "Sunucuyu Yönet",
                        AddReactions: "Tepki Ekle",
                        ViewAuditLog: "Denetim Kaydını Görüntüle",
                        PrioritySpeaker: "Öncelikli Konuşmacı",
                        Stream: "Yayın Aç",
                        ViewChannel: "Kanalları Gör",
                        SendMessages: "Mesaj Gönder",
                        SendTTSMessages: "TTS Mesaj Gönder",
                        ManageMessages: "Mesajları Yönet",
                        EmbedLinks: "Bağlantı Yerleştir",
                        AttachFiles: "Dosya Ekle",
                        ReadMessageHistory: "Mesaj Geçmişini Oku",
                        MentionEveryone: "@everyone/@here Etiketle",
                        UseExternalEmojis: "Harici Emoji Kullan",
                        ViewGuildInsights: "Sunucu Bilgilerini Gör",
                        Connect: "Bağlan",
                        Speak: "Konuş",
                        MuteMembers: "Üyeleri Sustur",
                        DeafenMembers: "Üyeleri Sağırlaştır",
                        MoveMembers: "Üyeleri Taşı",
                        UseVAD: "Ses Eylemi Kullan",
                        ChangeNickname: "Kullanıcı Adı Değiştir",
                        ManageNicknames: "Kullanıcı Adlarını Yönet",
                        ManageRoles: "Rolleri Yönet",
                        ManageWebhooks: "Webhookları Yönet",
                        ManageEmojisAndStickers: "Emoji ve Çıkartmaları Yönet",
                        UseApplicationCommands: "Uygulama Komutlarını Kullan",
                        RequestToSpeak: "Konuşma İsteği",
                        ManageEvents: "Etkinlikleri Yönet",
                        ManageThreads: "Alt Başlıkları Yönet",
                        CreatePublicThreads: "Herkese Açık Alt Başlık Oluştur",
                        CreatePrivateThreads: "Gizli Alt Başlık Oluştur",
                        UseExternalStickers: "Harici Çıkartma Kullan",
                        SendMessagesInThreads: "Alt Başlıklarda Mesaj Gönder",
                        UseEmbeddedActivities: "Gömülü Aktiviteleri Kullan",
                        ModerateMembers: "Üyeleri Denetle (Timeout)"
                    };

                    // Kullanıcının sahip olduğu izinleri array'e çevir
                    const rawPerms = targetMember.permissions.toArray();
                    
                    const userPerms = rawPerms.map(perm => {
                        // Varsa Türkçe karşılığını, yoksa İngilizce halini al
                        const trName = permissionNames[perm];
                        return `• ${isEnglish ? perm : (trName || perm)}`;
                    });

                    if (userPerms.length > 0) {
                        descText = userPerms.join('\n');
                    } else {
                        descText = isEnglish ? "**User has no permissions.**" : "**Kullanıcının hiçbir yetkisi yok.**";
                    }
                }

                const permEmbed = new EmbedBuilder()
                    .setTitle(isEnglish ? `${targetUser.username}'s Permissions` : `${targetUser.username} Adlı Kişinin İzinleri`)
                    .setDescription(descText)
                    .setColor('Random');
                
                await i.reply({ embeds: [permEmbed], ephemeral: true });
            }

            // --- BANNER BUTONU ---
            if (i.customId === 'btn_banner') {
                const bannerUrl = targetUser.bannerURL({ size: 1024, extension: 'png' });
                
                if (bannerUrl) {
                    const bannerEmbed = new EmbedBuilder()
                        .setTitle(`${targetUser.username} Banner`)
                        .setDescription(`[${isEnglish ? "Download Banner" : "Banner'ı İndir"}](${bannerUrl})`)
                        .setImage(bannerUrl)
                        .setColor('Random');
                    await i.reply({ embeds: [bannerEmbed], ephemeral: true });
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setDescription(isEnglish ? "**User has no banner!**" : "**Kullanıcının Bannerı Yok!**");
                    await i.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }

            // --- AVATAR BUTONU ---
            if (i.customId === 'btn_avatar') {
                const avatarUrl = targetUser.displayAvatarURL({ size: 1024, dynamic: true });
                const avatarEmbed = new EmbedBuilder()
                    .setTitle(`${targetUser.username} Avatar`)
                    .setDescription(`[${isEnglish ? "Download Avatar" : "Avatar'ı İndir"}](${avatarUrl})`)
                    .setImage(avatarUrl)
                    .setColor('Random');
                await i.reply({ embeds: [avatarEmbed], ephemeral: true });
            }
        });
    },
};