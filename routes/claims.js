const express = require('express');
const Claim = require('../models/Claim');
const FoodListing = require('../models/FoodListing');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// CREATE - NGO claims a food listing
router.post('/', requireRole('ngo'), async (req, res) => {
  try {
    const { foodId } = req.body;
    if (!foodId) return res.status(400).json({ error: 'foodId required' });

    const food = await FoodListing.findById(foodId);
    if (!food) return res.status(404).json({ error: 'Food listing not found' });
    if (food.status !== 'available') {
      return res.status(400).json({ error: `Listing is ${food.status}` });
    }

    const existing = await Claim.findOne({
      foodId,
      NGOId: req.session.userId,
      claimStatus: { $in: ['pending', 'approved'] }
    });
    if (existing) return res.status(409).json({ error: 'You already have an active claim for this listing' });

    const claim = await Claim.create({
      foodId,
      NGOId: req.session.userId,
      claimStatus: 'pending'
    });

    res.status(201).json(claim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - NGO sees own claims
router.get('/mine', requireRole('ngo'), async (req, res) => {
  try {
    const claims = await Claim.find({ NGOId: req.session.userId })
      .sort({ createdAt: -1 })
      .populate('foodId');
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - Donor sees claims on their listings
router.get('/for-my-listings', requireRole('donor'), async (req, res) => {
  try {
    const myListings = await FoodListing.find(
      { createdBy: req.session.userId },
      '_id'
    );
    const ids = myListings.map((l) => l._id);

    const claims = await Claim.find({ foodId: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate('foodId')
      .populate('NGOId', 'name email');

    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE - Donor approves/rejects a claim 
router.put('/:id', requireRole('donor'), async (req, res) => {
  try {
    const { claimStatus } = req.body;
    if (!['approved', 'rejected'].includes(claimStatus)) {
      return res.status(400).json({ error: 'claimStatus must be approved or rejected' });
    }

    const claim = await Claim.findById(req.params.id).populate('foodId');
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    if (String(claim.foodId.createdBy) !== req.session.userId) {
      return res.status(403).json({ error: 'Not your listing' });
    }

    const updated = await Claim.findByIdAndUpdate(
      req.params.id,
      { $set: { claimStatus } },
      { new: true }
    );

    if (claimStatus === 'approved') {
      // Mark listing as claimed
      await FoodListing.updateOne(
        { _id: claim.foodId._id },
        { $set: { status: 'claimed' } }
      );
      // Auto-reject other pending claims for the same listing
      await Claim.updateMany(
        { foodId: claim.foodId._id, _id: { $ne: claim._id }, claimStatus: 'pending' },
        { $set: { claimStatus: 'rejected' } }
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
