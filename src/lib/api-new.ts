/**
 * New API client that uses Next.js API routes instead of PHP
 * 
 * This file replaces the old api.ts that called the PHP backend.
 * The API routes connect to a PostgreSQL database (Neon).
 */

import type { LinkData, ApiAllResponse, ApiWebResponse } from './types';

// Use relative URLs for API routes (works in both dev and production)
const API_BASE_URL = '/api';

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  console.log('🔄 Making API call to:', url);
  
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
    
    const data = await response.json();
    console.log('✅ API Response data:', data);
    
    return data;
  } catch (error) {
    console.error('❌ API Fetch Error:', error);
    throw error;
  }
}

// =====================================================
// LINKS API
// =====================================================

export async function getAllLinks(): Promise<LinkData[]> {
  console.log('📄 getAllLinks: Starting...');
  
  const response = await apiFetch<ApiAllResponse>(`${API_BASE_URL}/links`);
  
  if (response && response.success && Array.isArray(response.data)) {
    const sortedData = response.data.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    console.log('✅ getAllLinks: Returning sorted data:', sortedData.length, 'items');
    return sortedData;
  }
  
  console.error('❌ getAllLinks: Failed to fetch or parse links:', response);
  return [];
}

export async function getLinkBySlug(slug: string): Promise<LinkData | null> {
  console.log('🔍 getLinkBySlug: Looking for slug:', slug);
  
  try {
    const response = await apiFetch<ApiWebResponse>(`${API_BASE_URL}/links/${encodeURIComponent(slug)}`);
    
    if (response && response.success && response.data) {
      console.log('✅ getLinkBySlug: Found link');
      return response.data;
    }
    
    console.warn('⚠️ getLinkBySlug: Could not find link for slug:', slug);
    return null;
  } catch (error) {
    console.error('❌ getLinkBySlug: Error:', error);
    return null;
  }
}

export async function createLink(linkData: LinkData): Promise<{ success: boolean; message?: string }> {
  console.log('➕ createLink: Creating new link:', linkData.slug);
  
  const response = await apiFetch<{ success: boolean; message: string }>(`${API_BASE_URL}/links`, {
    method: 'POST',
    body: JSON.stringify(linkData),
  });
  
  console.log('➕ createLink: Result:', response);
  return response;
}

export async function updateLink(slug: string, linkData: LinkData): Promise<{ success: boolean; message?: string }> {
  console.log('🔄 updateLink: Updating link with slug:', slug);
  
  const response = await apiFetch<{ success: boolean; message: string }>(
    `${API_BASE_URL}/links/${encodeURIComponent(slug)}`,
    {
      method: 'PUT',
      body: JSON.stringify(linkData),
    }
  );
  
  console.log('🔄 updateLink: Result:', response);
  return response;
}

export async function deleteLink(slug: string): Promise<{ success: boolean; message?: string }> {
  console.log('🗑️ deleteLink: Deleting link with slug:', slug);
  
  const response = await apiFetch<{ success: boolean; message: string }>(
    `${API_BASE_URL}/links/${encodeURIComponent(slug)}`,
    {
      method: 'DELETE',
    }
  );
  
  console.log('🗑️ deleteLink: Result:', response);
  return response;
}

export async function updateClickCount(slug: string, _currentClicks: number): Promise<void> {
  console.log('🔢 updateClickCount: Incrementing click count for slug:', slug);
  
  // Fire and forget - don't wait for response
  fetch(`${API_BASE_URL}/links/${encodeURIComponent(slug)}/clicks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch((error) => {
    console.error('❌ updateClickCount: Error:', error);
  });
}

// =====================================================
// FILE UPLOAD API
// =====================================================

export async function uploadFile(file: File): Promise<{ success: boolean; file?: { path: string } }> {
  console.log('📤 uploadFile: Uploading file:', file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📤 uploadFile: Result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ uploadFile: Error:', error);
    return { success: false };
  }
}

// =====================================================
// ADMIN CREDENTIALS API
// =====================================================

interface AdminCredentials {
  username: string;
  password: string;
}

export async function getAdminCredentials(): Promise<AdminCredentials | null> {
  try {
    const response = await apiFetch<{ success: boolean; data?: AdminCredentials }>(
      `${API_BASE_URL}/admin/credentials`
    );
    
    if (response && response.success && response.data) {
      console.log('✅ Credenciales cargadas desde API');
      return response.data;
    }
    
    console.log('ℹ️ No hay credenciales configuradas en API');
    return null;
  } catch (error) {
    console.error('❌ Error al obtener credenciales:', error);
    return null;
  }
}

export async function saveAdminCredentials(
  username: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiFetch<{ success: boolean; message: string }>(
      `${API_BASE_URL}/admin/credentials`,
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
    
    console.log('✅ Credenciales guardadas:', response);
    return response;
  } catch (error) {
    console.error('❌ Error al guardar credenciales:', error);
    return { success: false, message: (error as Error).message };
  }
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<{ success: boolean; message?: string; user?: { username: string } }> {
  try {
    const response = await apiFetch<{ success: boolean; message: string; user?: { username: string } }>(
      `${API_BASE_URL}/admin/login`,
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
    
    return response;
  } catch (error) {
    console.error('❌ Error during login:', error);
    return { success: false, message: (error as Error).message };
  }
}
