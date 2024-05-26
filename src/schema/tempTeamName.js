import mongoose from "mongoose";

const { Schema, model } = mongoose;

const temporaryTeamNameSchema = new Schema({
  ownerId: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: "24h" },
});

export default mongoose.model(
  "TemporaryTeamName",
  temporaryTeamNameSchema,
  "temporaryTeamName"
);
