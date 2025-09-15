import unittest
from analytics import get_advanced_analytics

class TestAIAnalytics(unittest.TestCase):
    def test_get_advanced_analytics(self):
        result = get_advanced_analytics()
        self.assertIn('forecasts', result)
        self.assertIn('volatility', result)
        self.assertIn('riskScores', result)
        self.assertEqual(result['forecasts'], [1200, 950, 800])
        self.assertEqual(result['volatility'], 0.12)
        self.assertEqual(result['riskScores'], [0.2, 0.4, 0.1])

if __name__ == '__main__':
    unittest.main()
