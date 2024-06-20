import mongoose from "mongoose";

const { Schema, model } = mongoose;

const teamMembersSchema = new Schema({
  userId: { type: String, required: true },
  _id: false,
});

const teamsSchema = new Schema({
  guildId: { type: String, required: true },
  teamName: { type: String, required: true },
  teamMembers: [teamMembersSchema],
});

const joinedTeamsSchema = new Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teams",
    required: true,
  },
  _id: false,
});

const usersSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  teams: [teamsSchema],
  joinedTeams: [joinedTeamsSchema],
  canBeInvited: { type: Boolean, default: true, required: true },
  canDirectJoin: { type: Boolean, default: false, required: true },
});

const Team = model("Teams", teamsSchema);
const User = model("Users", usersSchema, "users");

export default User;
export { Team, User };
