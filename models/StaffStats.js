const mongoose = require('mongoose');

const staffStatsSchema = new mongoose.Schema({
    yetkili: { type: String, required: true },
    toplam: { type: Number, default: 0 }
});

module.exports = mongoose.model('StaffStats', staffStatsSchema);