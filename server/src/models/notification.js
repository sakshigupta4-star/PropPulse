import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["property_approved", "property_rejected", "price_alert", "system"],
      default: "system",
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);