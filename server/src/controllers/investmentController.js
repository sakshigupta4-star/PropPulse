import { z } from "zod";
import asyncHandler from "../utils/asyncHandler.js";
import {
  calcEmi,
  outstandingBalance,
  forecastValues,
  round,
} from "../utils/finance.js";

const emiSchema = z.object({
  principal: z.number().positive(),
  interestRate: z.number().min(0).max(30),
  tenureYears: z.number().min(1).max(40),
});

const analyzeSchema = z.object({
  price: z.number().positive(),
  downPaymentPercent: z.number().min(0).max(100).default(20),
  interestRate: z.number().min(0).max(30).default(8.5),
  tenureYears: z.number().min(1).max(40).default(20),
  monthlyRent: z.number().min(0).default(0),
  rentGrowthPercent: z.number().min(0).max(30).default(5),
  annualExpenses: z.number().min(0).default(0), // tax, maintenance
  appreciationRate: z.number().min(-10).max(30).default(6),
  holdingYears: z.number().int().min(1).max(30).default(10),
});

// POST /api/investment/emi
export const emi = asyncHandler(async (req, res) => {
  const { principal, interestRate, tenureYears } = emiSchema.parse(req.body);
  const monthly = calcEmi(principal, interestRate, tenureYears);
  const total = monthly * tenureYears * 12;
  res.json({
    emi: round(monthly),
    totalPayment: round(total),
    totalInterest: round(total - principal),
  });
});

// POST /api/investment/analyze
export const analyze = asyncHandler(async (req, res) => {
  const d = analyzeSchema.parse(req.body);

  const downPayment = (d.price * d.downPaymentPercent) / 100;
  const loan = d.price - downPayment;
  const monthlyEmi = calcEmi(loan, d.interestRate, d.tenureYears);
  const monthsPaid = Math.min(d.holdingYears, d.tenureYears) * 12;

  const forecast = forecastValues(d.price, d.appreciationRate, d.holdingYears);
  const futureValue = forecast[d.holdingYears].value;

  // Rent grows every year
  let totalRent = 0;
  for (let y = 0; y < d.holdingYears; y++) {
    totalRent += d.monthlyRent * 12 * Math.pow(1 + d.rentGrowthPercent / 100, y);
  }
  const totalExpenses = d.annualExpenses * d.holdingYears;

  const balance = outstandingBalance(loan, d.interestRate, d.tenureYears, monthsPaid);
  const cashInvested = downPayment + monthlyEmi * monthsPaid;
  const equity = futureValue - balance;
  const netProfit = equity + totalRent - totalExpenses - cashInvested;

  const annualRent = d.monthlyRent * 12;
  res.json({
    loanAmount: round(loan, 0),
    downPayment: round(downPayment, 0),
    emi: round(monthlyEmi),
    grossRentalYield: round((annualRent / d.price) * 100),
    netRentalYield: round(((annualRent - d.annualExpenses) / d.price) * 100),
    futureValue,
    outstandingLoan: round(balance, 0),
    totalRentEarned: round(totalRent, 0),
    cashInvested: round(cashInvested, 0),
    netProfit: round(netProfit, 0),
    roiPercent: cashInvested > 0 ? round((netProfit / cashInvested) * 100) : 0,
    forecast, // use directly in a Recharts line chart
  });
});