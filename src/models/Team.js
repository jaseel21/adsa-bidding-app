import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export default mongoose.models.Team || mongoose.model('Team', teamSchema);