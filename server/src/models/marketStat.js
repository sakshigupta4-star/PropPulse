import mongoose from "mongoose";

const marketStatSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    locality: { type: String, trim: true, default: null }, // null = whole city
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // "2026-10"
    avgPricePerSqft: { type: Number, required: true, min: 0 },
    avgRentPerSqft: { type: Number, min: 0 },
  },
  { timestamps: true }
);

marketStatSchema.index({ city: 1, locality: 1, month: 1 }, { unique: true });

export default mongoose.model("MarketStat", marketStatSchema);