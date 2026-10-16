import mongoose from "mongoose";

const infrastructureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ["metro", "highway", "airport", "railway", "road", "hospital", "school", "mall", "it_park", "other"],
      required: true,
    },
    city: { type: String, required: true, trim: true },
    locality: { type: String, trim: true },
    status: { type: String, enum: ["planned", "under_construction", "completed"], default: "planned" },
    expectedCompletion: Date,
    expectedImpact: { type: String, trim: true, maxlength: 300 },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    sourceUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

infrastructureSchema.index({ city: 1, status: 1 });

export default mongoose.model("Infrastructure", infrastructureSchema);