console.log('Content script loaded on page!');

// Function to run when a page loads
function onPageLoad(): void {
  console.log('Page loaded!');
  // Your page initialization logic here
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
  onPageLoad();
}); 
