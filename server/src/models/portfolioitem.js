import mongoose from "mongoose";

const portfolioItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Optional link to a listing on the platform
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, trim: true },
    locality: { type: String, trim: true },
    propertyType: { type: String, trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true },
    currentValue: { type: Number, required: true, min: 0 },
    monthlyRent: { type: Number, default: 0, min: 0 },
    annualExpenses: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model("PortfolioItem", portfolioItemSchema);