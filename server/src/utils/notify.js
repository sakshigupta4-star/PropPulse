import Notification from "../models/notification.js";
import { getIO } from "../socket.js";

// Saves a notification and pushes it live if the user is online
export const notify = async (userId, data) => {
  try {
    const n = await Notification.create({ user: userId, ...data });
    getIO()?.to(`user:${userId}`).emit("notification", n);
    return n;
  } catch (err) {
    console.error("Notification failed:", err.message); // never break the main request
  }
};