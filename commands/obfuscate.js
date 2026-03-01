const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Yüklediğin veya yapıştırdığın Lua scriptini şifreler. / Obfuscates Lua scripts.')
        // 1. SEÇENEK: Dosya Yükleme (Zorunlu DEĞİL)
        .addAttachmentOption(option => 
            option.setName('dosya')
                .setDescription('PC için: Şifrelenecek .lua dosyasını buraya yükle')
                .setRequired(false)
        )
        // 2. SEÇENEK: Metin Yapıştırma (Zorunlu DEĞİL - MOBİLLER İÇİN)
        .addStringOption(option =>
            option.setName('kod')
                .setDescription('Mobil için: Şifrelenecek kodu direkt buraya yapıştır')
                .setRequired(false)
        ),

    async execute(interaction) {
        // --- DİL SİSTEMİ ---
        const hasTrRole = interaction.member.roles.cache.has(process.env.ROLE_ID_TURKISH);
        const hasEnRole = interaction.member.roles.cache.has(process.env.ROLE_ID_ENGLISH);
        const lang = (hasEnRole && !hasTrRole) ? 'en' : 'tr';
        const scripterRoleId = process.env.ROLE_ID_SCRIPTER;

        const messages = {
            tr: {
                noPerm: `Bu komutu kullanmak için <@&${scripterRoleId}> rolüne sahip olmalısın!`,
                noInput: "Lütfen ya bir `.lua` dosyası yükle ya da `kod` kısmına scripti yapıştır!",
                notLua: "Sadece `.lua` uzantılı dosyaları kabul ediyorum!",
                engineErr: "Şifreleme sırasında motor hata verdi! (Scriptinde syntax hatası olabilir)",
                success: "✅ **İşlem Başarılı!** Kodun ölümcül seviyede şifrelendi.",
                generalErr: "İşlem sırasında beklenmedik bir hata oluştu."
            },
            en: {
                noPerm: `You must have the <@&${scripterRoleId}> role to use this command!`,
                noInput: "Please either upload a `.lua` file or paste the script into the `code` option!",
                notLua: "I only accept `.lua` file extensions!",
                engineErr: "The engine encountered an error during obfuscation!",
                success: "✅ **Success!** Your code has been obfuscated at a lethal level.",
                generalErr: "An unexpected error occurred during the process."
            }
        };

        const t = messages[lang];

        const createErrorEmbed = (text) => {
            return new EmbedBuilder()
                .setColor('Red')
                .setDescription(`**${text}**`);
        };

        // Yetki Kontrolü
        if (!interaction.member.roles.cache.has(scripterRoleId)) {
            return interaction.reply({ embeds: [createErrorEmbed(t.noPerm)], ephemeral: true });
        }

        const file = interaction.options.getAttachment('dosya');
        const codeText = interaction.options.getString('kod');

        // İkisi de boşsa hata ver
        if (!file && !codeText) {
            return interaction.reply({ embeds: [createErrorEmbed(t.noInput)], ephemeral: true });
        }

        // Eğer dosya atılmışsa ama .lua değilse
        if (file && !file.name.endsWith('.lua')) {
            return interaction.reply({ embeds: [createErrorEmbed(t.notLua)], ephemeral: true });
        }

        await interaction.deferReply(); 

        const inputPath = `./temp_in_${interaction.user.id}.lua`;
        const outputPath = `./temp_out_${interaction.user.id}.lua`;
        const finalFileName = file ? `ZYPHERA_OBF_${file.name}` : `ZYPHERA_OBF_Mobil_Script.lua`;

        try {
            // VERİYİ KAYDETME AŞAMASI
            if (file) {
                // Eğer adam dosya yüklediyse dosyayı indir
                const response = await axios.get(file.url, { responseType: 'arraybuffer' });
                fs.writeFileSync(inputPath, response.data);
            } else if (codeText) {
                // Eğer adam metin yapıştırdıysa, metni .lua dosyası olarak bota kaydet
                fs.writeFileSync(inputPath, codeText, 'utf-8');
            }

            // OBFUSCATE İŞLEMİ (Şimdilik exe varmış gibi)
            const komut = `obfuscator.exe "${inputPath}" -o "${outputPath}"`;

            exec(komut, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Şifreleme Hatası: ${error}`);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    return interaction.editReply({ embeds: [createErrorEmbed(t.engineErr)] });
                }

                const obfuscatedFile = new AttachmentBuilder(outputPath, { name: finalFileName });

                await interaction.editReply({
                    content: t.success,
                    files: [obfuscatedFile]
                });

                // Temizlik
                setTimeout(() => {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                }, 2000); 
            });

        } catch (error) {
            console.error("Genel Hata:", error);
            interaction.editReply({ embeds: [createErrorEmbed(t.generalErr)] });
        }
    },
};