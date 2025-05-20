const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  batch: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['senior', 'junior', 'subjunior'] },
  tokenNumber: { type: String, required: true, unique: true, trim: true },
  selected: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);