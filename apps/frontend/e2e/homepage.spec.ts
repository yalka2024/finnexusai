import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /FinNexusAI/i })).toBeVisible();
  });

  test('should display the hero section', async ({ page }) => {
    await expect(page.getByText(/Next-Gen Financial Intelligence/i)).toBeVisible();
    await expect(page.getByText(/Harness the power of artificial intelligence/i)).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    // Check if header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check for navigation links
    await expect(page.getByRole('link', { name: /features/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pricing/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /about/i })).toBeVisible();
  });

  test('should display call-to-action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /watch demo/i })).toBeVisible();
  });

  test('should display statistics section', async ({ page }) => {
    await expect(page.getByText(/\$2\.4B\+/)).toBeVisible();
    await expect(page.getByText(/99\.9%/)).toBeVisible();
    await expect(page.getByText(/50K\+/)).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if main heading is still visible
    await expect(page.getByRole('heading', { name: /FinNexusAI/i })).toBeVisible();
    
    // Check if CTA buttons are still visible
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon.ico') && 
      !error.includes('404') &&
      !error.includes('Failed to load resource')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/FinNexusAI/);
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /Advanced financial intelligence platform/);
    
    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /FinNexusAI/);
  });

  test('should support dark mode toggle', async ({ page }) => {
    // Check if theme toggle exists
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // Test theme toggle functionality
      await themeToggle.click();
      
      // Wait for theme change
      await page.waitForTimeout(500);
      
      // Verify theme change (check for dark class or data attribute)
      const html = page.locator('html');
      const hasDarkClass = await html.evaluate(el => el.classList.contains('dark'));
      expect(hasDarkClass).toBeTruthy();
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    // Check for proper ARIA labels
    const nav = page.locator('nav');
    await expect(nav).toHaveAttribute('aria-label', /navigation/i);
    
    // Check for skip links
    const skipLink = page.locator('a[href="#main-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toHaveText(/skip to main content/i);
    }
  });

  test('should load performance metrics', async ({ page }) => {
    // Start performance measurement
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });
    
    // Assert performance thresholds
    expect(performanceMetrics.loadTime).toBeLessThan(3000); // 3 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check if first focusable element is highlighted
    const firstFocusable = page.locator(':focus');
    await expect(firstFocusable).toBeVisible();
    
    // Continue tabbing through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is still visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should display features section', async ({ page }) => {
    // Scroll to features section
    await page.locator('[data-testid="features-section"]').scrollIntoViewIfNeeded();
    
    // Check for feature cards
    const featureCards = page.locator('[data-testid="feature-card"]');
    await expect(featureCards).toHaveCountGreaterThan(0);
    
    // Check for feature titles
    await expect(page.getByText(/AI-Powered Analytics/i)).toBeVisible();
    await expect(page.getByText(/Smart Trading/i)).toBeVisible();
    await expect(page.getByText(/Enterprise Security/i)).toBeVisible();
  });

  test('should have working footer', async ({ page }) => {
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Check footer content
    await expect(page.locator('footer')).toBeVisible();
    
    // Check for footer links
    const footerLinks = page.locator('footer a');
    await expect(footerLinks).toHaveCountGreaterThan(0);
    
    // Check for copyright notice
    await expect(page.getByText(/© \d{4} FinNexusAI/i)).toBeVisible();
  });
});
