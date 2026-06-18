// /js/modules/api-client.js
/**
 * Centralized API Client
 * Wraps the fetch API to standardize headers and error handling
 * across student and teacher modules.
 */

export async function apiFetch(endpoint, options = {}) {
    const defaultHeaders = { 
        'Content-Type': 'application/json' 
    };
    
    // Merge provided options with defaults
    const config = {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    };

    try {
        const response = await fetch(endpoint, config);
        
        // Handle non-200 responses
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (err) {
        console.error(`API Client Error [${endpoint}]:`, err);
        throw err; // Rethrow so the calling module knows it failed
    }
}