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
        
        // Banner ve renk için fetch
        const targetUser = await interaction.client.users.fetch(targetUserOption.id, { force: true });

        let targetMember;
        try {
            targetMember = await guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.reply({ content: isEnglish ? 'User not found in this server.' : 'Kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }

        // --- 3. PROFIL VERİLERİNİ HESAPLAMA (Önceki kodun aynısı) ---
        // (Aşağıdaki kısımlar senin mevcut sistemin, burayı değiştirmedim sadece yapıyı korudum)
        
        // Katılım Sırası
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

        // Durum Metni
        let status = "offline";
        if (targetMember.presence) status = targetMember.presence.status;
        const statusMap = {
            online: isEnglish ? "Online" : "Çevrimiçi",
            idle: isEnglish ? "Idle" : "Boşta",
            dnd: isEnglish ? "Do Not Disturb" : "Rahatsız Etmeyin",
            offline: isEnglish ? "Offline/Invisible" : "Çevrimdışı/Görünmez"
        };
        const displayStatus = statusMap[status] || (isEnglish ? "Offline/Invisible" : "Çevrimdışı/Görünmez");

        // Yetki Kontrolleri
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

        // Embed Metinleri
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

        // --- 4. BUTONLAR (GÜNCELLENDİ) ---
        // Roller kaldırıldı, İzinler, Banner, Avatar kaldı
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

        // --- 5. ETKİLEŞİM VE COLLECTOR (10 SANİYE) ---
        const filter = i => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 10000, componentType: ComponentType.Button });

        collector.on('collect', async i => {
            // --- İZİNLER ---
            if (i.customId === 'btn_perms') {
                let descText = "";

                if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
                    // YÖNETİCİ İSE
                    descText = isEnglish ? "**User is Administrator**" : "**Kullanıcı Yönetici**";
                } else {
                    // YÖNETİCİ DEĞİLSE İZİNLERİ SIRALA
                    // Önemli izinleri çeviri haritası ile eşleştiriyoruz
                    const permMap = {
                        ManageGuild: { tr: "Sunucuyu Yönet", en: "Manage Server" },
                        ManageRoles: { tr: "Rolleri Yönet", en: "Manage Roles" },
                        ManageChannels: { tr: "Kanalları Yönet", en: "Manage Channels" },
                        KickMembers: { tr: "Üyeleri At", en: "Kick Members" },
                        BanMembers: { tr: "Üyeleri Yasakla", en: "Ban Members" },
                        ManageMessages: { tr: "Mesajları Yönet", en: "Manage Messages" },
                        ManageNicknames: { tr: "Kullanıcı Adlarını Yönet", en: "Manage Nicknames" },
                        MentionEveryone: { tr: "Everyone/Here Etiketle", en: "Mention Everyone" },
                        MuteMembers: { tr: "Üyeleri Sustur", en: "Mute Members" },
                        DeafenMembers: { tr: "Üyeleri Sağırlaştır", en: "Deafen Members" },
                        MoveMembers: { tr: "Üyeleri Taşı", en: "Move Members" },
                        ViewAuditLog: { tr: "Denetim Kaydını Görüntüle", en: "View Audit Log" }
                    };

                    const userPerms = [];
                    for (const [permKey, labels] of Object.entries(permMap)) {
                        if (targetMember.permissions.has(PermissionFlagsBits[permKey])) {
                            userPerms.push(`• ${isEnglish ? labels.en : labels.tr}`);
                        }
                    }

                    if (userPerms.length > 0) {
                        descText = userPerms.join('\n');
                    } else {
                        descText = isEnglish ? "**User has no critical permissions.**" : "**Kullanıcının kritik bir yetkisi yok.**";
                    }
                }

                const permEmbed = new EmbedBuilder()
                    .setTitle(isEnglish ? `${targetUser.username}'s Permissions` : `${targetUser.username} Adlı Kişinin İzinleri`)
                    .setDescription(descText)
                    .setColor('Random');
                
                await i.reply({ embeds: [permEmbed], ephemeral: true });
            }

            // --- BANNER ---
            if (i.customId === 'btn_banner') {
                const bannerUrl = targetUser.bannerURL({ size: 1024, extension: 'png' });
                
                if (bannerUrl) {
                    // Banner Varsa
                    const bannerEmbed = new EmbedBuilder()
                        .setTitle(`${targetUser.username} Banner`)
                        .setDescription(`[${isEnglish ? "Download Banner" : "Banner'ı İndir"}](${bannerUrl})`)
                        .setImage(bannerUrl)
                        .setColor('Random');
                    await i.reply({ embeds: [bannerEmbed], ephemeral: true });
                } else {
                    // Banner Yoksa (KIRMIZI VE KALIN HATA)
                    const errorEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setDescription(isEnglish ? "**User has no banner!**" : "**Kullanıcının Bannerı Yok!**");
                    await i.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }

            // --- AVATAR ---
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

        // --- 6. SÜRE BİTİNCE BUTONLARI KAPAT ---
        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_perms').setLabel(btnLabels.perms).setStyle(ButtonStyle.Primary).setEmoji('🛡️').setDisabled(true),
                new ButtonBuilder().setCustomId('btn_banner').setLabel(btnLabels.banner).setStyle(ButtonStyle.Secondary).setEmoji('🖼️').setDisabled(true),
                new ButtonBuilder().setCustomId('btn_avatar').setLabel(btnLabels.avatar).setStyle(ButtonStyle.Secondary).setEmoji('👤').setDisabled(true)
            );
            
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};