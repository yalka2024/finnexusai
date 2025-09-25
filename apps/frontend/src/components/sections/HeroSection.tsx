'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  ShieldCheckIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function HeroSection() {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    {
      icon: ChartBarIcon,
      title: 'AI-Powered Analytics',
      description: 'Advanced machine learning algorithms analyze market data in real-time'
    },
    {
      icon: CpuChipIcon,
      title: 'Smart Trading',
      description: 'Automated trading strategies with risk management built-in'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Enterprise Security',
      description: 'Bank-grade security with SOC 2 and ISO 27001 compliance'
    },
    {
      icon: RocketLaunchIcon,
      title: 'Lightning Fast',
      description: 'Sub-millisecond execution with global edge computing'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container-responsive">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Badge variant="secondary" className="inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                Live on Mainnet
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                <span className="gradient-text">FinNexusAI</span>
                <br />
                <span className="text-gray-900 dark:text-gray-100">
                  Next-Gen Financial
                </span>
                <br />
                <span className="text-gray-900 dark:text-gray-100">
                  Intelligence
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
                Harness the power of artificial intelligence for advanced trading strategies, 
                portfolio optimization, and real-time market intelligence. Built for the future of finance.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" className="group">
                Get Started
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="group">
                <PlayIcon className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200 dark:border-dark-700"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">$2.4B+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Assets Managed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">99.9%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">50K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Feature Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Main Feature Card */}
            <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-dark-700">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 rounded-2xl" />
              
              {/* Feature Content */}
              <div className="relative z-10">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-xl">
                      {(() => {
                        const IconComponent = features[currentFeature].icon;
                        return <IconComponent className="w-8 h-8 text-primary-600 dark:text-primary-400" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {features[currentFeature].title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {features[currentFeature].description}
                      </p>
                    </div>
                  </div>

                  {/* Feature Indicators */}
                  <div className="flex gap-2">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentFeature(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          index === currentFeature
                            ? 'bg-primary-600 w-8'
                            : 'bg-gray-300 dark:bg-dark-600 hover:bg-gray-400 dark:hover:bg-dark-500'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-success-500 rounded-full animate-bounce" />
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-warning-500 rounded-full animate-pulse" />
            </div>

            {/* Background Cards */}
            <div className="absolute -z-10 -top-4 -left-4 w-full h-full bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-2xl blur-xl" />
            <div className="absolute -z-20 -top-8 -left-8 w-full h-full bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-2xl blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
