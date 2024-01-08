const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const AutoIncrement = require("mongoose-sequence")(mongoose);

const usersSchema = new Schema({
  userId: { type: String, required: true },
  teams: [
    {
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

// Auto increment teamId
usersSchema.plugin(AutoIncrement, {
  id: "user_registration_seq",
  inc_field: "teams.teamId",
});

module.exports = model("Users", usersSchema, "users");
