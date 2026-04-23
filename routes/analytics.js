const express = require('express');
const FoodListing = require('../models/FoodListing');
const Claim = require('../models/Claim');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Donor dashboard analytics
router.get('/donor', requireRole('donor'), async (req, res) => {
  try {
    const donorId = req.session.userId;
    const soonCutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const total = await FoodListing.countDocuments({ createdBy: donorId });
    const active = await FoodListing.countDocuments({ createdBy: donorId, status: 'available' });
    const claimed = await FoodListing.countDocuments({ createdBy: donorId, status: 'claimed' });
    const expired = await FoodListing.countDocuments({ createdBy: donorId, status: 'expired' });
    const expiringSoon = await FoodListing.countDocuments({
      createdBy: donorId,
      status: 'available',
      expiryTime: { $lte: soonCutoff, $gte: new Date() }
    });

    const expiringList = await FoodListing.find(
      {
        createdBy: donorId,
        status: 'available',
        expiryTime: { $lte: soonCutoff, $gte: new Date() }
      },
      'title quantity expiryTime location'
    )
      .sort({ expiryTime: 1 })
      .limit(5);

    res.json({ total, active, claimed, expired, expiringSoon, expiringList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NGO dashboard analytics
router.get('/ngo', requireRole('ngo'), async (req, res) => {
  try {
    const ngoId = req.session.userId;

    const availableCount = await FoodListing.countDocuments({ status: 'available' });
    const claimedByMe = await Claim.countDocuments({ NGOId: ngoId, claimStatus: { $in: ['pending', 'approved'] } });
    const approvedClaims = await Claim.countDocuments({ NGOId: ngoId, claimStatus: 'approved' });
    const pendingClaims = await Claim.countDocuments({ NGOId: ngoId, claimStatus: 'pending' });

    const recent = await FoodListing.find(
      { status: 'available' },
      'title quantity expiryTime location createdAt'
    )
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ availableCount, claimedByMe, approvedClaims, pendingClaims, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
