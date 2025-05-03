import axios from "axios";

// Function to fetch metadata about a Google Drive file
export async function getGoogleDriveFileMetadata(fileId: string, accessToken: string) {
  try {
    console.log(`Fetching metadata for file: ${fileId}`);
    
    // Get the file metadata first
    const metadataResponse = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,description,createdTime,modifiedTime,thumbnailLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    return metadataResponse.data;
  } catch (error) {
    console.error("Error fetching Google Drive file metadata:", error);
    if (axios.isAxiosError(error)) {
      console.error("Google API error details:", {
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        throw new Error("Authentication token expired");
      } else if (error.response?.status === 404) {
        throw new Error("File not found or no access permission");
      }
    }
    throw error;
  }
}

// Function to fetch text content from a Google Docs file
export async function getGoogleDocsContent(fileId: string, accessToken: string) {
  try {
    console.log(`Fetching content for Google Docs file: ${fileId}`);
    
    // Export Google Docs as plain text
    const textResponse = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'text'
      }
    );
    
    return textResponse.data;
  } catch (error) {
    console.error("Error exporting Google Docs content:", error);
    if (axios.isAxiosError(error)) {
      console.error("Google API error details:", {
        status: error.response?.status,
        data: error.response?.data
      });
    }
    throw error;
  }
}

// Function to fetch text content from a Google Sheets file
export async function getGoogleSheetsContent(fileId: string, accessToken: string) {
  try {
    console.log(`Fetching content for Google Sheets file: ${fileId}`);
    
    // Export Google Sheets as CSV
    const csvResponse = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'text'
      }
    );
    
    return csvResponse.data;
  } catch (error) {
    console.error("Error exporting Google Sheets content:", error);
    if (axios.isAxiosError(error)) {
      console.error("Google API error details:", {
        status: error.response?.status,
        data: error.response?.data
      });
    }
    throw error;
  }
}

// Function to fetch text content from a Google Slides file
export async function getGoogleSlidesContent(fileId: string, accessToken: string) {
  try {
    console.log(`Fetching content for Google Slides file: ${fileId}`);
    
    // Export Google Slides as plain text
    const textResponse = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'text'
      }
    );
    
    return textResponse.data;
  } catch (error) {
    console.error("Error exporting Google Slides content:", error);
    if (axios.isAxiosError(error)) {
      console.error("Google API error details:", {
        status: error.response?.status,
        data: error.response?.data
      });
    }
    throw error;
  }
}

// Function to fetch text content from a PDF file
export async function getPdfContent(fileId: string, accessToken: string) {
  try {
    console.log(`Fetching content for PDF file: ${fileId}`);
    
    // For PDF files, we'd need to download the file then extract the text
    // For simplicity, we'll just return a message indicating this limitation
    return "PDF content extraction is not supported in this version.";
  } catch (error) {
    console.error("Error fetching PDF content:", error);
    throw error;
  }
}

// Function to extract text content from a Google Drive file
export async function getGoogleDriveFileContent(fileId: string, mimeType: string, accessToken: string): Promise<string> {
  try {
    console.log(`Extracting content from file: ${fileId} with mimeType: ${mimeType}`);
    
    // Handle different file types
    if (mimeType === 'application/vnd.google-apps.document') {
      return await getGoogleDocsContent(fileId, accessToken);
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return await getGoogleSheetsContent(fileId, accessToken);
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      return await getGoogleSlidesContent(fileId, accessToken);
    } else if (mimeType === 'application/pdf') {
      return await getPdfContent(fileId, accessToken);
    } else {
      return `Content extraction not supported for file type: ${mimeType}`;
    }
  } catch (error) {
    console.error("Error extracting file content:", error);
    throw error;
  }
}

// Extract file ID from a Google Drive URL
export function extractFileIdFromUrl(url: string): string | null {
  try {
    // Google Drive URL formats:
    // https://drive.google.com/file/d/{fileId}/view
    // https://drive.google.com/open?id={fileId}
    // https://docs.google.com/document/d/{fileId}/edit
    // https://docs.google.com/spreadsheets/d/{fileId}/edit
    // https://docs.google.com/presentation/d/{fileId}/edit
    
    let fileId: string | null = null;
    
    // Handle file/d/{fileId}/view format
    if (url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        fileId = match[1];
      }
    } 
    // Handle ?id= format
    else if (url.includes('?id=')) {
      const match = url.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        fileId = match[1];
      }
    } 
    // Handle docs.google.com with document/spreadsheet/presentation format
    else if (url.includes('docs.google.com')) {
      const match = url.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        fileId = match[1];
      }
    }
    
    return fileId;
  } catch (error) {
    console.error("Error extracting file ID:", error);
    return null;
  }
}