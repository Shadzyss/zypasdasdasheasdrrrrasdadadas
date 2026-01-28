const mongoose = require('mongoose');

const staffStatsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Yetkili ID
    guildId: { type: String, required: true },
    ticketCount: { type: Number, default: 0 } // Toplam sahiplenme sayısı
});

module.exports = mongoose.model('StaffStats', staffStatsSchema);