const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const teamIdCounterSchema = new Schema({
  counter: { type: Number, default: 0 }
});

module.exports = model("TeamIdCounter", teamIdCounterSchema, "teamIdCounter");