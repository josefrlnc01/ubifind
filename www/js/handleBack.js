

document.addEventListener('DOMContentLoaded', () => {
    // Function to handle back button behavior
    function handleBackButton() {
        // Check if we're on the main page
        const isMainPage = window.location.pathname.endsWith('app/index.html');
        
        // If not on main page, go back to main page
        if (!isMainPage) {
            window.location.href = '/app';
            return false; // Prevent default back behavior
        }
        
        // If on main page, allow default behavior (exit app in native, go back in browser)
        return true;
    }

    // Handle browser back button/gesture
    window.addEventListener('popstate', (event) => {
        if (!handleBackButton()) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // Handle Escape key
    if(!window.Capacitor.isNativePlatform()){
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (!handleBackButton()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });
        return
    }   
   
    const { App } = window.Capacitor?.Plugins || {};
    // Handle Capacitor back button
    if (App && typeof App.addListener === 'function') {
        App.addListener('backButton', () => {
            const isMainPage = window.location.pathname.endsWith('app/index.html');
            
            if (isMainPage) {
                App.exitApp();
            } else {
                window.history.back();
            }
        });
    }

    // Handle exit button click
    const exitButton = document.querySelector('.exit');
    if (exitButton) {
        exitButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/app';
        });
    }
});