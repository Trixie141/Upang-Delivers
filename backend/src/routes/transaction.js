import { Router } from "express";
import { Transaction } from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.use(requireAuth);

router.get("/mine", async (req, res) => {
  const transactions = await Transaction.find({
    $or: [{ ownerId: req.user.id }, { runnerId: req.user.id }],
  }).sort({ createdAt: -1 });
  res.json({ transactions });
});

export default router;