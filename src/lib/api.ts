import type { LinkData, ApiAllResponse, ApiWebResponse } from './types';

const API_BASE_URL = 'https://api.diversionconseguridad.com/api.php';
const FOLDER_NAME = 'whatsgrow_links';

async function apiFetch(url: string, options: RequestInit = {}) {
    console.log('🔄 Making API call to:', url);
    console.log('🔧 Fetch options:', options);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            cache: 'no-store',
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ API Response data:', data);
        return data;
    } catch (error) {
        console.error('❌ API Fetch Error:', error);
        console.error('❌ Error details:', {
            message: (error as Error).message,
            stack: (error as Error).stack,
            url: url
        });
        return { success: false, message: (error as Error).message };
    }
}

// Function to find the real key of a file by searching for its slug
async function findKeyBySlug(slug: string): Promise<string | null> {
    console.log('🔍 findKeyBySlug: Searching for slug:', slug);
    
    try {
        // Use the search API to find the slug in the content
        const searchUrl = `${API_BASE_URL}?api=search&term=${encodeURIComponent(slug)}&folder=${FOLDER_NAME}&content=true`;
        console.log('🔍 findKeyBySlug: Search URL:', searchUrl);
        
        const searchResponse = await apiFetch(searchUrl);
        console.log('🔍 findKeyBySlug: Search response:', searchResponse);
        
        if (searchResponse && searchResponse.success && Array.isArray(searchResponse.results)) {
            for (const result of searchResponse.results) {
                if (result && result.file && result.match === 'content') {
                    // Extract key from filename by removing .json extension
                    const key = result.file.replace(/\.json$/, '');
                    console.log('🔍 findKeyBySlug: Found file:', result.file, '-> key:', key);
                    
                    // Verify this file actually contains our slug by fetching it
                    try {
                        const verifyUrl = `${API_BASE_URL}?api=web&key=${key}&folder=${FOLDER_NAME}`;
                        const verifyResponse = await apiFetch(verifyUrl);
                        
                        if (verifyResponse && verifyResponse.success && verifyResponse.data && verifyResponse.data.slug === slug) {
                            console.log('✅ findKeyBySlug: Verified key for slug', slug, ':', key);
                            return key;
                        } else {
                            console.log('🔍 findKeyBySlug: File', key, 'does not contain slug', slug);
                        }
                    } catch (verifyError) {
                        console.log('🔍 findKeyBySlug: Error verifying file', key, ':', verifyError);
                        continue;
                    }
                }
            }
        }
        
        // Fallback: try getting all files and checking each one
        console.log('🔍 findKeyBySlug: Search API failed, trying all_files fallback...');
        const allFilesUrl = `${API_BASE_URL}?api=all_files&folder=${FOLDER_NAME}`;
        const allFilesResponse = await apiFetch(allFilesUrl);
        
        if (allFilesResponse && allFilesResponse.success && Array.isArray(allFilesResponse.data)) {
            for (const fileName of allFilesResponse.data) {
                try {
                    // Extract key from filename
                    const key = fileName.replace(/\.json$/, '');
                    const fileUrl = `${API_BASE_URL}?api=web&key=${key}&folder=${FOLDER_NAME}`;
                    const fileResponse = await apiFetch(fileUrl);
                    
                    if (fileResponse && fileResponse.success && fileResponse.data && fileResponse.data.slug === slug) {
                        console.log('✅ findKeyBySlug: Found key for slug', slug, ':', key);
                        return key;
                    }
                } catch (error) {
                    // Continue checking other files if one fails
                    console.log('🔍 findKeyBySlug: Error checking file', fileName, ':', error);
                    continue;
                }
            }
        }
        
        console.warn('⚠️ findKeyBySlug: Could not find key for slug:', slug);
        return null;
    } catch (error) {
        console.error('❌ findKeyBySlug: Error searching for slug:', error);
        return null;
    }
}

// Raw function to get all links without processing (to avoid circular calls)
async function getAllLinksRaw(): Promise<LinkData[]> {
    const url = `${API_BASE_URL}?api=all&folder=${FOLDER_NAME}`;
    const response: ApiAllResponse = await apiFetch(url);

    if (response && response.success && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
}

export async function getAllLinks(): Promise<LinkData[]> {
    console.log('📄 getAllLinks: Starting...');
    const url = `${API_BASE_URL}?api=all&folder=${FOLDER_NAME}`;
    console.log('🔗 getAllLinks: URL:', url);
    
    const response: ApiAllResponse = await apiFetch(url);
    console.log('📦 getAllLinks: Raw response:', response);

    if (response && response.success && Array.isArray(response.data)) {
        const migratedData = response.data.map(ensureFacebookPixelConfig);
        const sortedData = migratedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        console.log('✅ getAllLinks: Returning sorted data:', sortedData.length, 'items');
        return sortedData;
    }
    
    console.error('❌ getAllLinks: Failed to fetch or parse links:', response);
    return [];
}

// Helper function to ensure backward compatibility with Facebook Pixel config
function ensureFacebookPixelConfig(linkData: any): LinkData {
    if (!linkData.facebookPixel) {
        linkData.facebookPixel = {
            pixelId: '',
            viewContentEvent: true,
            leadEvent: true,
            customEvents: [],
        };
    }
    return linkData as LinkData;
}

export async function getLinkBySlug(slug: string): Promise<LinkData | null> {
    console.log('🔍 getLinkBySlug: Looking for slug:', slug);
    
    // First try with the slug as key (for backward compatibility)
    let url = `${API_BASE_URL}?api=web&key=${slug}&folder=${FOLDER_NAME}`;
    let response: ApiWebResponse = await apiFetch(url);
    
    if (response && response.success && response.data) {
        console.log('✅ getLinkBySlug: Found with direct key lookup');
        return ensureFacebookPixelConfig(response.data);
    }
    
    // If not found, search for the real key using the slug content
    console.log('🔍 getLinkBySlug: Direct lookup failed, searching by content...');
    const realKey = await findKeyBySlug(slug);
    
    if (realKey) {
        console.log('🔍 getLinkBySlug: Found real key:', realKey, 'for slug:', slug);
        url = `${API_BASE_URL}?api=web&key=${realKey}&folder=${FOLDER_NAME}`;
        response = await apiFetch(url);
        
        if (response && response.success && response.data) {
            console.log('✅ getLinkBySlug: Successfully found with real key');
            return ensureFacebookPixelConfig(response.data);
        }
    }
    
    console.warn('⚠️ getLinkBySlug: Could not find link for slug:', slug);
    return null;
}

export async function createLink(linkData: LinkData) {
    const url = `${API_BASE_URL}?api=insert`;
    const body = {
        key: linkData.slug,
        estructura: linkData,
        folder: FOLDER_NAME,
    };
    return await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateLink(slug: string, linkData: LinkData) {
    console.log('🔄 updateLink: Updating link with slug:', slug);
    
    // Find the real key for this slug
    const realKey = await findKeyBySlug(slug);
    const keyToUse = realKey || slug; // Fallback to slug if not found
    
    console.log('🔄 updateLink: Using key:', keyToUse, 'for slug:', slug);
    
    const url = `${API_BASE_URL}?api=update`;
    const body = {
        key: keyToUse,
        estructura: linkData,
        folder: FOLDER_NAME,
    };
    
    const result = await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
    console.log('🔄 updateLink: Update result:', result);
    
    return result;
}

export async function deleteLink(slug: string) {
    console.log('🗑️ deleteLink: Deleting link with slug:', slug);
    
    // Find the real key for this slug
    const realKey = await findKeyBySlug(slug);
    const keyToUse = realKey || slug; // Fallback to slug if not found
    
    console.log('🗑️ deleteLink: Using key:', keyToUse, 'for slug:', slug);
    
    const url = `${API_BASE_URL}?api=delete&key=${keyToUse}&folder=${FOLDER_NAME}`;
    const result = await apiFetch(url);
    
    console.log('🗑️ deleteLink: Delete result:', result);
    return result;
}

export async function updateClickCount(slug: string, currentClicks: number) {
    console.log('🔢 updateClickCount: Updating click count for slug:', slug);
    
    // Find the real key for this slug
    const realKey = await findKeyBySlug(slug);
    const keyToUse = realKey || slug; // Fallback to slug if not found
    
    console.log('🔢 updateClickCount: Using key:', keyToUse, 'for slug:', slug);
    
    const url = `${API_BASE_URL}?api=update_property`;
    const body = {
        key: keyToUse,
        property: 'clicks',
        value: currentClicks + 1,
        folder: FOLDER_NAME,
    };
    
    // Fire and forget
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
    }).catch(error => {
        console.error('❌ updateClickCount: Error updating click count:', error);
    });
}

export async function uploadFile(file: File): Promise<{ success: boolean; file?: { path: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', FOLDER_NAME);

    const url = `${API_BASE_URL}?api=upload_file`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`Upload failed! status: ${response.status}`);
        }
        const result = await response.json();
        // The API returns a path like "./uploads/file.jpg", we need a full URL
        if(result.success && result.file && result.file.path) {
            result.file.path = `https://2025.redyman.dev/shortWhats/${result.file.path.replace('./', '')}`;
        }
        return result;
    } catch (error) {
        console.error('File Upload Error:', error);
        return { success: false };
    }
}

// =====================================================
// ADMIN CREDENTIALS FUNCTIONS
// =====================================================

interface AdminCredentials {
    username: string;
    password: string;
}

const ADMIN_FOLDER = 'admin';
const ADMIN_KEY = 'credentials';

/**
 * Obtiene las credenciales configuradas desde el API
 */
export async function getAdminCredentials(): Promise<AdminCredentials | null> {
    try {
        const url = `${API_BASE_URL}?api=web&key=${ADMIN_KEY}&folder=${ADMIN_FOLDER}`;
        const response = await apiFetch(url);
        
        if (response && response.success && response.data) {
            console.log('✅ Credenciales cargadas desde API');
            return response.data;
        }
        
        console.log('ℹ️ No hay credenciales configuradas en API, usando defaults');
        return null;
    } catch (error) {
        console.error('❌ Error al obtener credenciales:', error);
        return null;
    }
}

/**
 * Guarda o actualiza las credenciales en el API
 */
export async function saveAdminCredentials(username: string, password: string) {
    try {
        const credentials: AdminCredentials = { username, password };
        
        // Primero intentamos actualizar
        const updateUrl = `${API_BASE_URL}?api=update`;
        const updateBody = {
            key: ADMIN_KEY,
            estructura: credentials,
            folder: ADMIN_FOLDER,
        };
        
        let result = await apiFetch(updateUrl, { 
            method: 'POST', 
            body: JSON.stringify(updateBody) 
        });
        
        // Si el update falla, intentamos insert (primera vez)
        if (!result || !result.success) {
            console.log('ℹ️ Update falló, intentando insert...');
            const insertUrl = `${API_BASE_URL}?api=insert`;
            const insertBody = {
                key: ADMIN_KEY,
                estructura: credentials,
                folder: ADMIN_FOLDER,
            };
            
            result = await apiFetch(insertUrl, { 
                method: 'POST', 
                body: JSON.stringify(insertBody) 
            });
        }
        
        console.log('✅ Credenciales guardadas:', result);
        return result;
    } catch (error) {
        console.error('❌ Error al guardar credenciales:', error);
        return { success: false, message: (error as Error).message };
    }
}
