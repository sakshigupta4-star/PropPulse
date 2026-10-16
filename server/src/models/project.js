import mongoose from "mongoose";

const updateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 1000 },
    progressPercent: { type: Number, min: 0, max: 100, required: true },
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    builder: { type: mongoose.Schema.Types.ObjectId, ref: "Builder", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 3000 },
    address: {
      locality: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
    },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    constructionStatus: {
      type: String,
      enum: ["upcoming", "under_construction", "ready"],
      default: "upcoming",
    },
    possessionDate: Date,
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    totalUnits: { type: Number, min: 0 },
    priceMin: { type: Number, min: 0 },
    priceMax: { type: Number, min: 0 },
    images: [{ type: String }],
    amenities: [{ type: String, trim: true }],

    // RERA and legal (set by admin)
    reraNumber: { type: String, trim: true },
    reraStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "expired"],
      default: "pending",
    },
    reraVerifiedAt: Date,
    reraValidTill: Date,
    legalChecks: {
      titleClear: { type: Boolean, default: false },
      approvedLayout: { type: Boolean, default: false },
      environmentalClearance: { type: Boolean, default: false },
      occupancyCertificate: { type: Boolean, default: false },
    },

    approval: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String, trim: true },
    updates: [updateSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// 0-100: 20 points for verified RERA, 20 for each legal check
projectSchema.virtual("legalScore").get(function () {
  const c = this.legalChecks || {};
  const checks = [c.titleClear, c.approvedLayout, c.environmentalClearance, c.occupancyCertificate];
  return (this.reraStatus === "verified" ? 20 : 0) + checks.filter(Boolean).length * 20;
});

projectSchema.index({ approval: 1, "address.city": 1, constructionStatus: 1 });
projectSchema.index({ reraNumber: 1 });

export default mongoose.model("Project", projectSchema);