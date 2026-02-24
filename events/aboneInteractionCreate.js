const { Events, EmbedBuilder } = require('discord.js');
const SubscriberKey = require('../models/subscriberKeyModel'); // Şema yolunu kendi projene göre kontrol et!

// --- RASTGELE KEY VE ID OLUŞTURUCU FONKSİYONLAR ---
function generateLetterKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let key = '';
    for (let i = 0; i < 4; i++) {
        let segment = '';
        for (let j = 0; j < 4; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        key += segment;
        if (i < 3) key += '-';
    }
    return key;
}

function generateKeyId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    // DOSYA ADI NE OLURSA OLSUN BURASI BÖYLE KALMALI!
    name: Events.InteractionCreate, 
    async execute(interaction) {
        
        // Sadece buton etkileşimlerini dinle
        if (!interaction.isButton()) return;

        // --- SADECE ABONE BUTONLARINA TIKLANDIĞINDA ÇALIŞACAK KISIM ---
        if (interaction.customId === 'btn_abone_key_tr' || interaction.customId === 'btn_abone_key_us') {
            
            const isEnglish = interaction.customId === 'btn_abone_key_us';
            const { member, guild } = interaction;
            
            // --- ABONE ROLÜ ID'Sİ ---
            const aboneRoleId = process.env.ROLE_ID_ABONE;

            // --- 1. ROL KONTROLÜ ---
            if (!member.roles.cache.has(aboneRoleId)) {
                const errorText = isEnglish
                    ? `**You Must Have the <@&${aboneRoleId}> Role to Use This Button**`
                    : `**Bu Butonu Kullanabilmek İçin <@&${aboneRoleId}> Adlı Role Sahip Olman Gerekmektedir**`;

                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle(isEnglish ? '❌ Failed' : '❌ Başarısız')
                    .setDescription(errorText);
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            try {
                // --- 2. MEVCUT KEY KONTROLÜ (1 ADET LİMİTİ) ---
                const existingKey = await SubscriberKey.findOne({ 
                    creatorId: member.id, 
                    reason: 'Abone Key' 
                });

                if (existingKey) {
                    const errorDesc = isEnglish
                        ? `**${member} You Already Have an Active Subscriber Key\n✨ Your Active Subscriber Key --> ||\`${existingKey.key}\`||**`
                        : `**${member} Zaten Aktif Bir Abone Key'iniz Var\n✨ Aktif Abone Key'iniz --> ||\`${existingKey.key}\`||**`;

                    const limitEmbed = new EmbedBuilder()
                        .setTitle(isEnglish ? '❌ Failed' : '❌ Başarısız')
                        .setDescription(errorDesc)
                        .setColor('Red');

                    return interaction.reply({ embeds: [limitEmbed], ephemeral: true });
                }

                // Bekletme mesajı atıyoruz ki bot "düşünüyor..." desin ve çökmesin
                await interaction.deferReply({ ephemeral: true });

                // --- 3. KEY OLUŞTURMA VE KAYIT ---
                const newKey = generateLetterKey();
                const newKeyId = generateKeyId();
                const now = new Date();
                
                await SubscriberKey.create({
                    key: newKey,
                    keyId: newKeyId,
                    creatorId: member.id,
                    ownerId: member.id, 
                    reason: "Abone Key",
                    scriptName: "ABONE KEY",
                    createdAt: now,
                    duration: "SINIRSIZ",
                    hwid: null,
                    isUsed: false
                });

                const timestamp = Math.floor(now.getTime() / 1000);

                // --- 4. KULLANICIYA DM GÖNDERME ---
                const dmTitle = isEnglish ? "Your Created Subscriber Key" : "Oluşturulan Abone Key'iniz";
                const durationText = isEnglish ? "Unlimited" : "Sınırsız";
                
                const dmDescription = isEnglish
                    ? `**⛓️‍💥 Generated Key --> ||\`${newKey}\`||
🆔 Generated Key ID --> \`${newKeyId}\`
🪄 Key Creator --> ${member}
📜 Creation Reason --> \`Abone Key\`
🧾 Script Name --> \`ABONE KEY\`
⏰ Creation Time --> <t:${timestamp}:F>
⏱️ Expiration Time --> \`${durationText}\`
❗ __KEY IS FOR SINGLE USE ONLY. DO NOT SHARE YOUR KEY INFORMATION WITH ANYONE__**`
                    : `**⛓️‍💥 Oluşturulan Key --> ||\`${newKey}\`||
🆔 Oluşturulan Key ID --> \`${newKeyId}\`
🪄 Key'i Oluşturan Kişi --> ${member}
📜 Key'in Oluşturulma Sebebi --> \`Abone Key\`
🧾 Script Adı --> \`ABONE KEY\`
⏰ Key'in Oluşturulma Zamanı --> <t:${timestamp}:F>
⏱️ Key'in Bitiş Zamanı --> \`${durationText}\`
❗ __KEY TEK KULLANIMLIKTIR KEY BİLGİLERİNİZİ KİMSEYLE PAYLAŞMAYIN__**`;

                const dmEmbed = new EmbedBuilder()
                    .setTitle(dmTitle)
                    .setDescription(dmDescription)
                    .setColor('Random');

                let dmSent = true;
                try {
                    await member.send({ embeds: [dmEmbed] });
                } catch (err) {
                    dmSent = false;
                }

                // --- 5. LOG KANALINA MESAJ ---
                const logChannel = guild.channels.cache.get(process.env.CHANNEL_ID_LOG_KEY);
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Bir Abone Key Oluşturuldu')
                        .setDescription(`**⛓️‍💥 Oluşturulan Key --> ||\`${newKey}\`||
🆔 Oluşturulan Key ID --> \`${newKeyId}\`
📜 Key'in Oluşturulma Sebebi --> \`Abone Key\`
🧾 Script Adı --> \`ABONE KEY\`
🪄 Key'i Oluşturan Kişi --> ${member}
👑 Key Sahibi --> ${member}
⏰ Key'in Oluşturulma Zamanı --> <t:${timestamp}:F>
⏱️ Key'in Bitiş Zamanı --> \`Sınırsız\`**`)
                        .setColor('Random');

                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }

                // --- 6. KOMUT YANITI (SUCCESS / DM FAIL) ---
                if (!dmSent) {
                    const failDmDesc = isEnglish
                        ? `**${member} I couldn't send you a DM because your DMs are closed!\nHere is your key, copy it immediately: ||\`${newKey}\`||**`
                        : `**${member} DM kutun kapalı olduğu için sana mesaj atamadım!\nİşte Key'in, hemen kopyala: ||\`${newKey}\`||**`;

                    const failDmEmbed = new EmbedBuilder()
                        .setTitle(isEnglish ? '⚠️ DM Closed' : '⚠️ DM Kapalı')
                        .setDescription(failDmDesc)
                        .setColor('Yellow');

                    return interaction.editReply({ embeds: [failDmEmbed] });
                }

                const successTitle = isEnglish ? "✅ Success" : "✅ Başarılı";
                const successDesc = isEnglish
                    ? `**${member} Subscriber Key Successfully Created, Check Your DM Box!**`
                    : `**${member} Başarıyla Abone Key Oluşturuldu, Dm Kutunuzu Kontrol Edin!**`;
                
                const successEmbed = new EmbedBuilder()
                    .setTitle(successTitle)
                    .setDescription(successDesc)
                    .setColor('Green');

                await interaction.editReply({ embeds: [successEmbed] });

            } catch (error) {
                console.error(error);
                if (interaction.deferred) {
                    return interaction.editReply({ content: isEnglish ? '❌ An error occurred.' : '❌ Bir hata oluştu.' });
                }
            }
        }
    },
};