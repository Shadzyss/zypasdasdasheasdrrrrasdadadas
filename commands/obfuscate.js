const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Scriptini şifreler. Dosya, Metin veya Link kabul eder! / Obfuscates Lua scripts.')
        .addAttachmentOption(option => 
            option.setName('dosya')
                .setDescription('PC için: .lua dosyasını buraya yükle')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('kod_veya_link')
                .setDescription('Mobil için: Kodu buraya yapıştır veya Pastebin linki at')
                .setRequired(false)
        ),

    async execute(interaction) {
        // --- DİL VE YETKİ AYARLARI ---
        const hasTrRole = interaction.member.roles.cache.has(process.env.ROLE_ID_TURKISH);
        const hasEnRole = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);
        const scripterRoleId = process.env.ROLE_ID_SCRIPTER;
        
        // Eğer kullanıcıda US (EN) rolü varsa ve TR rolü yoksa İngilizce, aksi halde Türkçe.
        const lang = (hasEnRole && !hasTrRole) ? 'en' : 'tr';

        const messages = {
            tr: {
                noPerm: `Bu komutu kullanmak için <@&${scripterRoleId}> rolüne sahip olmalısın!`,
                noInput: "Lütfen bir dosya yükle, kodu yapıştır ya da bir link (Pastebin vb.) at!",
                notLua: "Sadece `.lua` veya `.txt` uzantılı dosyaları kabul ediyorum!",
                fetching: "⏳ Linkteki kod çekiliyor...",
                engineErr: "Şifreleme sırasında API motoru hata verdi! (Script hatalı olabilir)",
                success: "✅ **İşlem Başarılı!** Kodun ölümcül seviyede şifrelendi. O elemana at ağlasın! 😎",
                generalErr: "İşlem sırasında beklenmedik bir hata oluştu."
            },
            en: {
                noPerm: `You must have the <@&${scripterRoleId}> role to use this command!`,
                noInput: "Please upload a file, paste the code, or provide a link (e.g., Pastebin)!",
                notLua: "I only accept `.lua` or `.txt` file extensions!",
                fetching: "⏳ Fetching code from link...",
                engineErr: "The API engine encountered an error! (Script might be invalid)",
                success: "✅ **Success!** Your code has been obfuscated at a lethal level. Throw it in their face! 😎",
                generalErr: "An unexpected error occurred during the process."
            }
        };

        const t = messages[lang];
        const createErrorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`**${text}**`);

        // 1. YETKİ KONTROLÜ
        if (!interaction.member.roles.cache.has(scripterRoleId)) {
            return interaction.reply({ embeds: [createErrorEmbed(t.noPerm)], ephemeral: true });
        }

        const file = interaction.options.getAttachment('dosya');
        const rawInput = interaction.options.getString('kod_veya_link');

        // 2. GİRDİ KONTROLÜ
        if (!file && !rawInput) {
            return interaction.reply({ embeds: [createErrorEmbed(t.noInput)], ephemeral: true });
        }

        // Dosya uzantısı esnek kontrolü
        if (file) {
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.lua') && !fileName.endsWith('.txt')) {
                return interaction.reply({ embeds: [createErrorEmbed(t.notLua)], ephemeral: true });
            }
        }

        await interaction.deferReply(); 

        const outputPath = `./temp_out_${interaction.user.id}.lua`;
        const finalFileName = file ? `ZYPHERA_OBF_${file.name}` : `ZYPHERA_OBF_Mobil_Script.lua`;

        try {
            let asilKod = "";

            // 3. KODU ELDE ETME (DOSYA / LİNK / METİN)
            if (file) {
                const response = await axios.get(file.url, { responseType: 'text' });
                asilKod = response.data;
            } else if (rawInput.startsWith('http')) {
                // Link Dönüştürme (Pastebin linkini raw'a çevirir)
                let fetchUrl = rawInput;
                if (rawInput.includes('pastebin.com') && !rawInput.includes('/raw/')) {
                    fetchUrl = rawInput.replace('pastebin.com/', 'pastebin.com/raw/');
                }
                const response = await axios.get(fetchUrl);
                asilKod = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            } else {
                asilKod = rawInput;
            }

            // 4. API İLE ŞİFRELEME (LUA OBFUSCATOR)
            const apiResponse = await axios.post('https://luaobfuscator.com/api/obfuscator/newscript', asilKod, {
                headers: { 'Content-Type': 'text/plain' }
            });

            const sessionId = apiResponse.data.sessionId;

            const obfuscateReq = await axios.post('https://luaobfuscator.com/api/obfuscator/obfuscate', {
                sessionId: sessionId,
                config: {
                    MinifyAll: true,
                    Virtualize: true,
                    CustomPlugins: ["ControlFlowFlattenV1", "EncryptStrings"]
                }
            });

            const sifreliKod = obfuscateReq.data.code;

            // 5. ŞİFRELİ KODU GÖNDERME
            fs.writeFileSync(outputPath, sifreliKod);
            const obfuscatedFile = new AttachmentBuilder(outputPath, { name: finalFileName });

            await interaction.editReply({
                content: t.success,
                files: [obfuscatedFile]
            });

            // Temizlik
            setTimeout(() => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }, 3000); 

        } catch (error) {
            console.error("Hata:", error?.response?.data || error.message);
            interaction.editReply({ embeds: [createErrorEmbed(t.engineErr)] });
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    },
};