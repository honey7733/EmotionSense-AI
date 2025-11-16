// Chart Fix Verification Test
// Run this in browser console on dashboard page to verify fixes

console.log('🔧 Chart Fix Verification Test');
console.log('================================');

// 1. Check if all chart containers have proper minimum dimensions
const checkChartContainers = () => {
  const containers = document.querySelectorAll('[data-chart-container]');
  console.log(`📊 Found ${containers.length} chart containers`);
  
  containers.forEach((container, index) => {
    const rect = container.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(container);
    
    console.log(`Container ${index + 1}:`, {
      width: rect.width,
      height: rect.height,
      minWidth: computedStyle.minWidth,
      minHeight: computedStyle.minHeight,
      hasNegativeDimensions: rect.width < 0 || rect.height < 0
    });
  });
};

// 2. Check ResponsiveContainer props
const checkResponsiveContainers = () => {
  // This would need to be checked in React DevTools
  console.log('📈 ResponsiveContainer props should now include:');
  console.log('- minHeight: 192-256px (varies by component)');
  console.log('- minWidth: 280px');
  console.log('- explicit aspect ratios where needed');
  console.log('- width="100%" height="100%"');
};

// 3. Check font preloading
const checkFontPreloading = () => {
  const preloadLinks = document.querySelectorAll('link[rel="preload"]');
  const fontPreloads = Array.from(preloadLinks).filter(link => 
    link.getAttribute('as') === 'font' || link.href.includes('font')
  );
  
  console.log(`🔤 Found ${fontPreloads.length} font preload links`);
  fontPreloads.forEach((link, index) => {
    console.log(`Font preload ${index + 1}:`, {
      href: link.href,
      crossorigin: link.crossOrigin,
      type: link.type
    });
  });
};

// 4. Tab switching test
const testTabSwitching = () => {
  console.log('📑 Tab switching test (switch tabs manually and check console)');
  
  // Listen for tab changes
  const observer = new MutationObserver(() => {
    setTimeout(() => {
      checkChartContainers();
    }, 150); // Allow time for tab content to render
  });
  
  // Observe changes to the main dashboard content
  const dashboardContent = document.querySelector('[role="tabpanel"], .space-y-6');
  if (dashboardContent) {
    observer.observe(dashboardContent, { 
      childList: true, 
      subtree: true,
      attributes: true 
    });
    console.log('👀 Observing tab changes...');
  }
};

// Run all tests
checkChartContainers();
checkResponsiveContainers();
checkFontPreloading();
testTabSwitching();

console.log('✅ Chart fix verification complete!');
console.log('💡 Switch between dashboard tabs and watch for dimension updates');