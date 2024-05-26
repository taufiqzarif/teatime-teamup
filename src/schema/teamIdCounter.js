import mongoose from "mongoose";

const { Schema, model } = mongoose;

const teamIdCounterSchema = new Schema({
  counter: { type: Number, default: 0 },
});

export default model("TeamIdCounter", teamIdCounterSchema, "teamIdCounter");
