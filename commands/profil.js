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
        // Eğer US rolü varsa İngilizce, yoksa (TR rolü olsun olmasın) Türkçe
        const isEnglish = member.roles.cache.has(process.env.ROLE_ID_ENGLISH);

        // --- 2. HEDEF KULLANICIYI BELİRLE VE VERİ ÇEK ---
        const targetUserOption = interaction.options.getUser('kullanıcı') || interaction.user;
        
        // Banner rengini ve görselini alabilmek için "force: true" ile user fetch yapıyoruz
        const targetUser = await interaction.client.users.fetch(targetUserOption.id, { force: true });

        let targetMember;
        try {
            targetMember = await guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.reply({ content: isEnglish ? 'User not found in this server.' : 'Kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }

        // --- 3. YENİ ÖZELLİKLER HESAPLAMA ---

        // A) Katılım Sırası (Join Position)
        // Cache'deki üyeleri katılım tarihine göre sıralıyoruz
        const sortedMembers = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
        const joinPosition = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
        const joinRankText = `**#${joinPosition}** / ${guild.memberCount}`;

        // B) Cihaz Durumu (Client Status)
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

        // C) Durum Metni (Eski yapı korundu)
        let status = "offline";
        if (targetMember.presence) status = targetMember.presence.status;
        
        const statusMap = {
            online: isEnglish ? "Online" : "Çevrimiçi",
            idle: isEnglish ? "Idle" : "Boşta",
            dnd: isEnglish ? "Do Not Disturb" : "Rahatsız Etmeyin",
            offline: isEnglish ? "Offline/Invisible" : "Çevrimdışı/Görünmez"
        };
        const displayStatus = statusMap[status] || (isEnglish ? "Offline/Invisible" : "Çevrimdışı/Görünmez");

        // --- 4. YETKİ VE ROL KONTROLLERİ ---
        const isBotStaffCheck = await Admin.findOne({ userId: targetUser.id });
        const isBotStaff = isBotStaffCheck ? (isEnglish ? "`✅ Yes`" : "`✅ Evet`") : (isEnglish ? "`❌ No`" : "`❌ Hayır`");

        const isAdminCheck = targetMember.permissions.has(PermissionFlagsBits.Administrator);
        const isAdmin = isAdminCheck ? (isEnglish ? "`✅ Yes`" : "`✅ Evet`") : (isEnglish ? "`❌ No`" : "`❌ Hayır`");

        const isSubStaffCheck = targetMember.roles.cache.has(process.env.ROLE_ID_ABONE_STAFF);
        const isSubStaff = isSubStaffCheck ? (isEnglish ? "`✅ Yes`" : "`✅ Evet`") : (isEnglish ? "`❌ No`" : "`❌ Hayır`");

        // Rolleri string olarak hazırlama (Embed için kısaltılmış)
        const roles = targetMember.roles.cache
            .filter(r => r.id !== guild.id) 
            .sort((a, b) => b.position - a.position)
            .map(r => r)
            .join(' ') || (isEnglish ? "No Roles" : "Rolü Yok");

        // --- 5. TARİH VE KEY BİLGİLERİ ---
        const createdAtTs = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedAtTs = targetMember.joinedTimestamp ? Math.floor(targetMember.joinedTimestamp / 1000) : null;
        const joinedAtDisplay = joinedAtTs ? `<t:${joinedAtTs}:F>` : (isEnglish ? "`Unknown`" : "`Bilinmiyor`");

        let totalActiveKeys = 0;
        let hasAboneKey = isEnglish ? "`❌ No`" : "`❌ Hayır`";
        let nextExpiration = isEnglish ? "`None`" : "`Yok`";

        if (targetUser.bot) {
            const botMsg = isEnglish ? "`BOT`" : "`BOT`";
            totalActiveKeys = botMsg;
            hasAboneKey = botMsg;
            nextExpiration = botMsg;
        } else {
            const subKeys = await SubscriberKey.find({ ownerId: targetUser.id });
            const genKeys = await GeneralKey.find({ ownerId: targetUser.id });
            const allKeys = [...subKeys, ...genKeys];

            totalActiveKeys = `\`${allKeys.length}\``;
            if (subKeys.length > 0) hasAboneKey = isEnglish ? "`✅ Yes`" : "`✅ Evet`";

            const timedKeys = allKeys.filter(k => k.expiresAt && !isNaN(new Date(k.expiresAt).getTime()));
            
            if (allKeys.length > 0 && timedKeys.length === 0) {
                nextExpiration = isEnglish ? "`Unlimited`" : "`Sınırsız`";
            } else if (timedKeys.length > 0) {
                timedKeys.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
                const nearestDate = Math.floor(new Date(timedKeys[0].expiresAt).getTime() / 1000);
                nextExpiration = `<t:${nearestDate}:R>`; 
            } else {
                nextExpiration = isEnglish ? "`No Keys`" : "`Key Yok`";
            }
        }

        // --- 6. METİN TANIMLAMALARI ---
        const labels = {
            title: isEnglish ? `${targetUser.username}'s Profile` : `${targetUser.username} Adlı Kişinin Profili`,
            userInfo: isEnglish ? "`----- 👤 User Information 👤 -----`" : "`----- 👤 Kullanıcı Bilgileri 👤 -----`",
            username: isEnglish ? "👤 Username" : "👤 Kullanıcı Adı",
            id: isEnglish ? "🆔 User ID" : "🆔 Kullanıcının ID'si",
            device: isEnglish ? "📱 Device/Activity" : "📱 Cihaz/Aktivite", // YENİ
            joinRank: isEnglish ? "🔢 Join Rank" : "🔢 Katılım Sırası", // YENİ
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

        // --- 7. EMBED OLUŞTURMA ---
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
            .setColor(targetUser.hexAccentColor || 'Random') // Varsa kullanıcının profil rengi
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ 
                text: labels.footer, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            });

        // Banner varsa embed'e ekle
        if (targetUser.bannerURL()) {
            embed.setImage(targetUser.bannerURL({ size: 1024, extension: 'png' }));
        }

        // --- 8. BUTONLAR ---
        const btnLabels = {
            perms: isEnglish ? "Permissions" : "İzinler",
            roles: isEnglish ? "Roles" : "Roller",
            banner: isEnglish ? "Banner" : "Banner",
            avatar: isEnglish ? "Avatar" : "Avatar"
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_perms').setLabel(btnLabels.perms).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('btn_roles').setLabel(btnLabels.roles).setStyle(ButtonStyle.Secondary).setEmoji('🎭'),
            new ButtonBuilder().setCustomId('btn_banner').setLabel(btnLabels.banner).setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
            new ButtonBuilder().setCustomId('btn_avatar').setLabel(btnLabels.avatar).setStyle(ButtonStyle.Secondary).setEmoji('👤')
        );

        const replyMessage = await interaction.reply({ embeds: [embed], components: [row] });

        // --- 9. BUTON ETKİLEŞİMLERİ (COLLECTOR) ---
        const filter = i => i.user.id === interaction.user.id; // Sadece komutu kullanan basabilsin
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000, componentType: ComponentType.Button });

        collector.on('collect', async i => {
            if (i.customId === 'btn_perms') {
                // Önemli izinleri filtrele
                const keyPerms = [
                    PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild, 
                    PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers, 
                    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.ManageMessages
                ];
                
                const userPerms = targetMember.permissions.toArray()
                    .filter(p => keyPerms.some(kp => targetMember.permissions.has(kp)))
                    .map(p => `\`${p}\``)
                    .join(', ') || (isEnglish ? "No key permissions" : "Önemli yetkisi yok");

                await i.reply({ content: `👮‍♂️ **${targetUser.username} ${isEnglish ? "Permissions" : "Yetkileri"}:**\n${userPerms}`, ephemeral: true });
            }

            if (i.customId === 'btn_roles') {
                // Rolleri listele (everyone hariç)
                const roleList = targetMember.roles.cache
                    .filter(r => r.id !== guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.toString())
                    .join(', ') || "Yok";
                
                // Eğer çok uzunsa dosya yapabiliriz ama şimdilik ephemeral mesaj
                if (roleList.length > 1900) {
                    await i.reply({ content: isEnglish ? "Too many roles to list!" : "Listelenecek çok fazla rol var!", ephemeral: true });
                } else {
                    await i.reply({ content: `🎭 **${targetUser.username} ${isEnglish ? "Roles" : "Rolleri"}:**\n${roleList}`, ephemeral: true });
                }
            }

            if (i.customId === 'btn_banner') {
                const bannerUrl = targetUser.bannerURL({ size: 1024, extension: 'png' });
                if (bannerUrl) {
                    const bannerEmbed = new EmbedBuilder()
                        .setTitle(`${targetUser.username} Banner`)
                        .setImage(bannerUrl)
                        .setColor('Random');
                    await i.reply({ embeds: [bannerEmbed], ephemeral: true });
                } else {
                    await i.reply({ content: isEnglish ? "User has no banner." : "Kullanıcının bannerı yok.", ephemeral: true });
                }
            }

            if (i.customId === 'btn_avatar') {
                const avatarEmbed = new EmbedBuilder()
                    .setTitle(`${targetUser.username} Avatar`)
                    .setImage(targetUser.displayAvatarURL({ size: 1024, dynamic: true }))
                    .setColor('Random');
                await i.reply({ embeds: [avatarEmbed], ephemeral: true });
            }
        });
    },
};