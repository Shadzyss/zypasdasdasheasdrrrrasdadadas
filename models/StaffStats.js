const mongoose = require('mongoose');

const staffStatsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    claimedTickets: { type: Number, default: 0 }
});

module.exports = mongoose.model('StaffStats', staffStatsSchema);