const mongoose = require('mongoose');

// Yetkili puanlarını tutan şema
const staffSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    claimCount: { type: Number, default: 0 }
});

// Ticket durumlarını tutan şema
const ticketSchema = new mongoose.Schema({
    channelID: { type: String, required: true },
    ownerID: { type: String, required: true },
    claimerID: { type: String, default: null },
});

const Staff = mongoose.model('Staff', staffSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = { Staff, Ticket };