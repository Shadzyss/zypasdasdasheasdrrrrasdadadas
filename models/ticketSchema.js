const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    ticketCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('ticketSchema', ticketSchema);