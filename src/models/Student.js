const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  batch: { type: String, required: true },
  category: { type: String, required: true },
  tokenNumber: { type: String, required: true, unique: true },
  selected: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
}, { timestamps: true });

studentSchema.index({ tokenNumber: 1 }, { unique: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);