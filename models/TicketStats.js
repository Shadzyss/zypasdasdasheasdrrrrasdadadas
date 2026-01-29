const mongoose = require('mongoose');

const ticketStatsSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true }, // Yetkili ID
    ticketCount: { type: Number, default: 0 } // Sahiplenme sayısı
});

module.exports = mongoose.model('TicketStats', ticketStatsSchema);