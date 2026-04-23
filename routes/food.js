const express = require('express');
const FoodListing = require('../models/FoodListing');
const Claim = require('../models/Claim');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// CREATE - Donor adds a food listing
router.post('/', requireRole('donor'), async (req, res) => {
  try {
    const { title, quantity, expiryTime, location } = req.body;
    if (!title || !quantity || !expiryTime || !location) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const food = await FoodListing.create({
      title,
      quantity,
      expiryTime: new Date(expiryTime),
      location,
      createdBy: req.session.userId,
      status: 'available'
    });
    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - Browse available food (NGO view) with filters, projection, sorting, pagination
router.get('/browse', requireRole('ngo'), async (req, res) => {
  try {
    const { location, locations, minQuantity, maxExpiryHours, statuses, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (statuses) {
      filter.status = { $in: statuses.split(',') };
    } else {
      filter.status = 'available';
    }

    if (locations) {
      filter.$or = locations.split(',').map((loc) => ({ location: loc.trim() }));
    } else if (location) {
      filter.location = location;
    }

    if (minQuantity) filter.quantity = { $gte: Number(minQuantity) };

    if (maxExpiryHours) {
      const cutoff = new Date(Date.now() + Number(maxExpiryHours) * 60 * 60 * 1000);
      filter.expiryTime = { $lte: cutoff };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const projection = 'title quantity expiryTime location status createdBy createdAt';

    const items = await FoodListing.find(filter, projection)
      .sort({ expiryTime: 1 }) 
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name email');

    const total = await FoodListing.countDocuments(filter);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - Donor's own listings
router.get('/mine', requireRole('donor'), async (req, res) => {
  try {
    const listings = await FoodListing.find({ createdBy: req.session.userId })
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - Single listing detail
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const food = await FoodListing.findById(req.params.id).populate('createdBy', 'name email');
    if (!food) return res.status(404).json({ error: 'Not found' });
    res.json(food);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE - Donor updates a listing 
router.put('/:id', requireRole('donor'), async (req, res) => {
  try {
    const food = await FoodListing.findOne({ _id: req.params.id, createdBy: req.session.userId });
    if (!food) return res.status(404).json({ error: 'Not found' });

    const allowed = ['title', 'quantity', 'expiryTime', 'location', 'status'];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }

    const updated = await FoodListing.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Donor deletes their listing
router.delete('/:id', requireRole('donor'), async (req, res) => {
  try {
    const food = await FoodListing.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.session.userId
    });
    if (!food) return res.status(404).json({ error: 'Not found' });
    await Claim.deleteMany({ foodId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE MANY - Mark expired listings (transition available to expired)
router.post('/maintenance/expire', requireAuth, async (req, res) => {
  try {
    const result = await FoodListing.updateMany(
      { status: 'available', expiryTime: { $lt: new Date() } },
      { $set: { status: 'expired' } }
    );
    res.json({
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
