// Function to run when the popup is opened
function onPopupOpen(): void {
  console.log('Popup opened!');
  // Your popup initialization logic here
}

// Function to run when the popup is closed
function onPopupClose(): void {
  console.log('Popup closed!');
  // Your popup cleanup logic here
}

// Run when popup is opened
document.addEventListener('DOMContentLoaded', () => {
  onPopupOpen();
});

// Run when popup is closed
window.addEventListener('beforeunload', () => {
  onPopupClose();
}); 
