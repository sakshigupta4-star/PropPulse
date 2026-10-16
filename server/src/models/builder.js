import mongoose from "mongoose";

const builderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000 },
    logo: { type: String, trim: true },
    website: { type: String, trim: true },
    establishedYear: { type: Number, min: 1900 },
    city: { type: String, trim: true },
    reraRegistrationNumber: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Builder", builderSchema);