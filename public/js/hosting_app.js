if(state==='done') {
    const hostingSection = document.querySelector('#hostingSection');
    hostingSection.classList.remove('hidden');
}

// aux
const setCopyButton = () => {   
    // Handle copy URL button
    const copyButton = document.getElementById('copyButton');
    const hostingURLInput = document.getElementById('hostingURLInput');

    if (copyButton && hostingURLInput) {
        // Remove any existing event listeners to prevent duplicates
        const newButton = copyButton.cloneNode(true);
        copyButton.parentNode.replaceChild(newButton, copyButton);
        
        newButton.addEventListener('click', async () => {
            const urlToCopy = hostingURLInput.value || hostingURLInput.textContent;
            if (!urlToCopy) return;
        
        try {
                await navigator.clipboard.writeText(urlToCopy);
            
            // Change icon temporarily to show success
                const originalHTML = newButton.innerHTML;
                newButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-green-500">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
            `;
            
            // Revert after 2 seconds
            setTimeout(() => {
                    newButton.innerHTML = originalHTML;
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy URL: ', err);
        }
    });
}
}

// Get video file as blob
const getVideoBlob = async () => {
    const videoElement = document.getElementById('previewVideo');
    if (!videoElement) {
        console.error('Video element not found');
        return null;
    }

    try {
        // If video has a src that's not a blob URL, fetch it
        if (videoElement.src && videoElement.src.startsWith('blob:')) {
            console.warn('Cannot directly access blob URL, trying to redownload');
        }
        const response = await fetch(videoElement.src);
        return await response.blob();
    } catch (error) {
        console.error('Error getting video file:', error);
        return null;
    }
};

// confetti 
const showConfetti = () => {
    const jsConfetti = new JSConfetti();
    jsConfetti.addConfetti({
        emojiSize: 50,
        emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🤖','📼','☁️'],
     })
     setTimeout(() => {
        jsConfetti.addConfetti({
            emojiSize: 50,
            emojis: ['📹', '📽️', '🎥', '📸', '📀', '🕹️','🤖','🌉'],
         })
     }, 3000);
}

// Main Render function
const updateHostingUI = (url) => {
    const hostingHeader = document.querySelector('#hostingHeader');
    const hostingResult = document.querySelector('#hostingResult');
    hostingResult.classList.remove('hidden');
    const hostingURLInput = hostingResult.querySelector('#hostingURLInput');
    hostingURLInput.value = url;
    setCopyButton()
    //@todo fetch to update credits!   
    // update copys
    hostingHeader.textContent = "¡Tu video está listo! 🙌🏼📼🤩🥳"  
    showConfetti()
}

// Error catcher
const showHostingError = (error) => {
    const hostingError   = document.querySelector('#hostingError');
    hostingError.textContent = error
    hostingOptions.classList.remove('hidden')
    hostingError.classList.remove('hidden')
}

const setLoading = (action = 1)=> {
    const hostingError   = document.querySelector('#hostingError');
    const hostingOptions = document.querySelector('#hostingOptions');
    if(action === 1){
        hostingOptions.classList.add('hidden')
        hostingError.innerHTML = `
        <div class="animate-spin h-4 w-4 rounded-full border border-b-indigo-500"></div>
    `
    hostingError.classList.remove('hidden')
    }else{
        hostingError.innerHTML = ''
    }
}
// Init
// Handle hosting buttons
const buttons = document.querySelectorAll('.hosting_button');
buttons.forEach(button => {
    button.addEventListener('click', async () => {
        setLoading()
        const response = await fetch('/hosting', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ intent:button.dataset.intent }),
        });
        if(response.ok) {
            const {url, publicUrl} = await response.json() 
             await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                body: await getVideoBlob()
            })
            updateHostingUI(publicUrl)
            setLoading(0)
        }else{
            const {error} = await response.json() 
            showHostingError(error)
        }
       
    })
})


