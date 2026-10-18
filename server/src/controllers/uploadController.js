import cloudinary from "../config/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";

const uploadBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "proppulse/properties", resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// POST /api/upload/images
export const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ message: "No images uploaded" });
  }
  const results = await Promise.all(req.files.map((f) => uploadBuffer(f.buffer)));
  res.status(201).json({
    images: results.map((r) => ({ url: r.secure_url, publicId: r.public_id })),
  });
});