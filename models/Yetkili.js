const mongoose = require('mongoose');

const yetkiliSchema = new mongoose.Schema({
    yetkiliId: { type: String, required: true, unique: true },
    toplamTicketSahiplenme: { type: Number, default: 0 }
});

module.exports = mongoose.model('Yetkili', yetkiliSchema);