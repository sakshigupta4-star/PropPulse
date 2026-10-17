import { z } from "zod";
import PortfolioItem from "../models/portfolioitem.js";
import Property from "../models/property.js";
import asyncHandler from "../utils/asyncHandler.js";
import { cagr, round } from "../utils/finance.js";

const createSchema = z.object({
  property: z.string().optional(),
  label: z.string().min(2).max(120),
  city: z.string().optional(),
  locality: z.string().optional(),
  propertyType: z.string().optional(),
  purchasePrice: z.number().positive(),
  purchaseDate: z.coerce.date(),
  currentValue: z.number().positive(),
  monthlyRent: z.number().min(0).optional(),
  annualExpenses: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});
const updateSchema = createSchema.partial();

// Adds computed metrics to one holding
const withMetrics = (item) => {
  const o = item.toObject();
  const years = (Date.now() - new Date(o.purchaseDate)) / (365.25 * 24 * 3600 * 1000);
  const gain = o.currentValue - o.purchasePrice;
  o.metrics = {
    gain: round(gain, 0),
    gainPercent: round((gain / o.purchasePrice) * 100),
    yearsHeld: round(years),
    cagr: round(cagr(o.purchasePrice, o.currentValue, years)),
    netRentalYield: round(
      ((o.monthlyRent * 12 - o.annualExpenses) / o.currentValue) * 100
    ),
  };
  return o;
};

// GET /api/portfolio
export const getPortfolio = asyncHandler(async (req, res) => {
  const items = await PortfolioItem.find({ user: req.user._id })
    .sort("-createdAt")
    .populate("property", "title images address price");
  const holdings = items.map(withMetrics);

  const invested = holdings.reduce((s, h) => s + h.purchasePrice, 0);
  const current = holdings.reduce((s, h) => s + h.currentValue, 0);
  const annualRent = holdings.reduce((s, h) => s + h.monthlyRent * 12 - h.annualExpenses, 0);

  res.json({
    holdings,
    summary: {
      count: holdings.length,
      totalInvested: invested,
      currentValue: current,
      totalGain: current - invested,
      gainPercent: invested ? round(((current - invested) / invested) * 100) : 0,
      netAnnualRent: annualRent,
    },
  });
});

// POST /api/portfolio
export const addItem = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  if (data.property) {
    const exists = await Property.exists({ _id: data.property });
    if (!exists) return res.status(404).json({ message: "Linked property not found" });
  }
  const item = await PortfolioItem.create({ ...data, user: req.user._id });
  res.status(201).json({ holding: withMetrics(item) });
});

// PUT /api/portfolio/:id
export const updateItem = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  // Filtering by user means you can only edit your own items
  const item = await PortfolioItem.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    data,
    { new: true, runValidators: true }
  );
  if (!item) return res.status(404).json({ message: "Holding not found" });
  res.json({ holding: withMetrics(item) });
});

// DELETE /api/portfolio/:id
export const deleteItem = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!item) return res.status(404).json({ message: "Holding not found" });
  res.json({ message: "Holding removed" });
});