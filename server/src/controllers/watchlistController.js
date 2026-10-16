import Watchlist from "../models/watchlist.js";
import Property from "../models/property.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/watchlist  -> full saved properties
export const getWatchlist = asyncHandler(async (req, res) => {
  const items = await Watchlist.find({ user: req.user._id })
    .sort("-createdAt")
    .populate({ path: "property", populate: { path: "owner", select: "name role" } });

  // Skip properties that were deleted after being saved
  const properties = items
    .filter((i) => i.property)
    .map((i) => ({
      ...i.property.toObject(),
      savedAt: i.createdAt,
      priceWhenSaved: i.priceWhenSaved,
    }));

  res.json({ properties, total: properties.length });
});

// GET /api/watchlist/ids  -> just the IDs, so the UI can fill in the hearts
export const getWatchlistIds = asyncHandler(async (req, res) => {
  const items = await Watchlist.find({ user: req.user._id }).select("property");
  res.json({ ids: items.map((i) => i.property.toString()) });
});

// POST /api/watchlist/:propertyId  -> save
export const addToWatchlist = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.propertyId);
  if (!property || property.status !== "approved") {
    return res.status(404).json({ message: "Property not found" });
  }

  // Upsert makes this safe to call twice (no duplicate error)
  await Watchlist.findOneAndUpdate(
    { user: req.user._id, property: property._id },
    { $setOnInsert: { priceWhenSaved: property.price } },
    { upsert: true }
  );
  res.status(201).json({ message: "Saved to watchlist", saved: true });
});

// DELETE /api/watchlist/:propertyId  -> remove
export const removeFromWatchlist = asyncHandler(async (req, res) => {
  await Watchlist.deleteOne({ user: req.user._id, property: req.params.propertyId });
  res.json({ message: "Removed from watchlist", saved: false });
});