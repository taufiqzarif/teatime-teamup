import mongoose from "mongoose";

const { Schema, model } = mongoose;

const teamsSchema = new Schema({
  guildId: { type: String, required: true },
  teamName: { type: String, required: true },
  teamMembers: [
    {
      userId: { type: String, required: true },
      _id: false,
    },
  ],
});

const usersSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  teams: [teamsSchema],
  canBeInvited: { type: Boolean, default: true, required: true },
  canDirectJoin: { type: Boolean, default: false, required: true },
});

export default model("Users", usersSchema, "users");
