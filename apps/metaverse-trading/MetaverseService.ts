// AI-Driven Financial Metaverse Backend Service
import express from 'express';
const router = express.Router();

type User = { id: string; name: string };
const users: User[] = [];

// POST /users
router.post('/users', (req, res) => {
  const { name } = req.body;
  const user: User = {
    id: Math.random().toString(36).substring(2, 10),
    name,
  };
  users.push(user);
  res.status(201).json(user);
});

// GET /users
router.get('/users', (req, res) => {
  res.json(users);
});

// GET /metaverse-state
router.get('/metaverse-state', (req, res) => {
  res.json({ tradingFloor: [], simulators: [], users });
});

// POST /trade-action
router.post('/trade-action', (req, res) => {
  res.json({ status: 'success', action: req.body });
});

export default router;
