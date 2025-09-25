// apps/backend/src/controllers/userController.js
const User = require('../models/User');
const authService = require('../services/auth/AuthService');

exports.signup = async(req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const user = await authService.register({ email, password, firstName, lastName });
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.login = async(req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login(email, password);
    res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.getUserProfile = async(req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new Error('User not found');
    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
