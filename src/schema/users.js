import mongoose from "mongoose";

const { Schema, model } = mongoose;

const usersSchema = new Schema({
  userId: { type: String, required: true },
  teams: [
    {
      guildId: { type: String, required: true},
      teamId: { type: Number },
      teamName: { type: String, required: true },
      teamMembers: [
        {
          userId: { type: String, required: true },
          _id: false,
        },
      ],
      _id: false,
    },
  ],
});

export default model("Users", usersSchema, "users");
