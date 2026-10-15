import mongoose from "mongoose";

export const PROPERTY_TYPES = [
  "apartment",
  "villa",
  "plot",
  "commercial",
  "independent_house",
];

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 3000 },
    listingType: { type: String, enum: ["sale", "rent"], required: true },
    propertyType: { type: String, enum: PROPERTY_TYPES, required: true },
    price: { type: Number, required: true, min: 0 },
    areaSqft: { type: Number, required: true, min: 1 },
    bedrooms: { type: Number, min: 0, default: 0 },
    bathrooms: { type: Number, min: 0, default: 0 },

    address: {
      line: { type: String, trim: true },
      locality: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    // Used later for the Leaflet map
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },

    images: [{ url: { type: String, required: true }, publicId: String }],
    amenities: [{ type: String, trim: true }],

    reraNumber: { type: String, trim: true },
    isNewLaunch: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "sold"],
      default: "pending",
    },
    rejectionReason: { type: String, trim: true },
    views: { type: Number, default: 0 },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

propertySchema.index({ status: 1, listingType: 1, propertyType: 1, price: 1 });
propertySchema.index({ "address.city": 1, "address.locality": 1 });

export default mongoose.model("Property", propertySchema);