// Synthetic Financial Avatars Backend Service
import express from 'express';
const router = express.Router();

type Avatar = {
  id: string;
  personality: string;
  tokens: number;
};
const avatars: Avatar[] = [];

// POST /avatars
router.post('/avatars', (req, res) => {
  const { personality, tokens } = req.body;
  const avatar: Avatar = {
    id: Math.random().toString(36).substring(2, 10),
    personality,
    tokens,
  };
  avatars.push(avatar);
  res.status(201).json(avatar);
});

// GET /avatars
router.get('/avatars', (req, res) => {
  res.json(avatars);
});

// GET /avatar/:id
router.get('/avatar/:id', (req, res) => {
  const avatar = avatars.find(a => a.id === req.params.id);
  if (!avatar) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  res.json(avatar);
});

export default router;
