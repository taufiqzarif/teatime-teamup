import mongoose from "mongoose";
import { User } from "./users.js"; // Update the path as needed

export const migrateJoinedTeams = async () => {
  try {
    // Define the specific user ID you want to test with
    const specificUserId = "690523982926970913";

    // Fetch the specific user
    const user = await User.findOne({ userId: specificUserId });

    if (!user) {
      console.log("User not found.");
      return;
    }

    let joinedTeams = []; // This will hold all the teams this user has joined

    // Fetch all users
    const users = await User.find({});

    // Check each user's teams array
    for (const otherUser of users) {
      for (const team of otherUser.teams) {
        // If the specific user is a member of the team, add it to their joinedTeams
        if (team.teamMembers.some((member) => member.userId === user.userId)) {
          joinedTeams.push({ teamId: team._id });
        }
      }
    }

    // Update the specific user with the new joinedTeams data if any found
    if (joinedTeams.length > 0) {
      await User.findByIdAndUpdate(user._id, {
        $set: { joinedTeams: joinedTeams },
      });
      console.log("Migration completed successfully for user:", user.userId);
    } else {
      console.log("No teams found for this user to join.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
};
