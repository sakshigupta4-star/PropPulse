import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    // Used later by the notifications module (alert me if the price drops)
    priceWhenSaved: { type: Number },
  },
  { timestamps: true }
);

// A user can save a given property only once
watchlistSchema.index({ user: 1, property: 1 }, { unique: true });

export default mongoose.model("Watchlist", watchlistSchema);