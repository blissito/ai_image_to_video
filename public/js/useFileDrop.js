/**
 * Handle file drop functionality with drag and drop
 * @param {string} selector - CSS selector for the drop zone element
 * @param {Function} onFilesDropped - Callback that receives the dropped files
 * @returns {Function} Cleanup function to remove event listeners
 */
function useFileDrop(selector, onFilesDropped) {
    const dropZone = document.querySelector(selector);
    
    if (!dropZone) {
        console.error(`Element with selector '${selector}' not found`);
        return function() {};
    }
  
    // Prevent default drag behaviors
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
  
    // Handle drag over feedback
    function highlight() {
        dropZone.style = 'border-color:indigo;'
        // dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }
  
    // Remove drag over feedback
    function unhighlight() {
        dropZone.style = 'border-color:gray;'
    }
  
    // Handle file drop
    function handleDrop(e) {
        preventDefaults(e);
        unhighlight();
        
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesDropped(e.dataTransfer.files);
        }
    }
  
    // Add event listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
  
    ['dragenter', 'dragover'].forEach(function(eventName) {
        dropZone.addEventListener(eventName, highlight, false);
    });
  
    ['dragleave', 'drop'].forEach(function(eventName) {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
  
    dropZone.addEventListener('drop', handleDrop, false);
  
    // Cleanup function to remove all event listeners
    return function cleanup() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
            dropZone.removeEventListener(eventName, preventDefaults, false);
        });
  
        ['dragenter', 'dragover'].forEach(function(eventName) {
            dropZone.removeEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(function(eventName) {
            dropZone.removeEventListener(eventName, unhighlight, false);
        });

        dropZone.removeEventListener('drop', handleDrop, false);
    };
}

// Make the function globally available
window.useFileDrop = useFileDrop;
        