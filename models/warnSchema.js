const { Schema, model } = require('mongoose');

const warnSchema = new Schema({
    guildId: String,
    userId: String,
    warnCount: { type: Number, default: 0 },
    logs: [{
        moderatorId: String,
        reason: String,
        timestamp: Date
    }]
});

module.exports = model('Warn', warnSchema);