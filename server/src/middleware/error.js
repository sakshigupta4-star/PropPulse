export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }
  // Duplicate email
 if (err.code === 11000) {
  const field = Object.keys(err.keyPattern || {})[0] || "value";
  return res.status(409).json({ message: `Duplicate ${field}` });
}

  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });

    if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
};