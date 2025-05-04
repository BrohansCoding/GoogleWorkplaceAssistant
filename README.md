# Google Workspace Assistant

A React TypeScript application that revolutionizes workspace productivity through intelligent AI-powered assistants, calendar management, document interaction, and email categorization with seamless Google Workspace integration.

## Features

### 🗓️ Calendar Assistant
- Visualize and manage your Google Calendar with clean, organized interface
- Navigate with day and week views to track your schedule
- Groq AI-powered calendar analysis to optimize your scheduling
- Create and manage events directly from the application
- Ask Groq AI natural language questions about your schedule and commitments

### 📁 Document Assistant
- Connect to your Google Drive files and folders
- Chat with your documents using Groq AI natural language queries
- Get AI-powered insights and answers from your files
- Support for various document types (Docs, Sheets, Slides, PDFs)
- Analyze document content and extract key information using advanced LLMs

### 📧 Email Assistant
- Groq AI-powered email categorization for better inbox organization
- Automatically sort emails into smart categories using AI content analysis
- Customize categorization rules to fit your workflow
- Quickly identify important emails and reduce inbox clutter
- Intelligent categorization adapts to your preferences over time

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: Firebase, Google OAuth
- **APIs**: Google Calendar, Google Drive, Gmail
- **AI Integration**: Groq AI for intelligent processing
- **Backend**: Express.js
- **Database**: Firebase Firestore

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Google account
- Groq API key (for AI features)
- Firebase project

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/google-workspace-assistant.git
   cd google-workspace-assistant
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   # Google API credentials
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Groq API key for AI features
   GROQ_API_KEY=your_groq_api_key
   
   # Firebase config (required for authentication and database)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser to `http://localhost:5000`

## Authentication Notes

**Important**: When authenticating with Google, you may see a warning that says "Google hasn't verified this app." This is normal for development environments and non-published applications.

To proceed:
1. Click on "Advanced" at the bottom left of the warning screen
2. Click on "Go to [Your App Name] (unsafe)"
3. Continue with the Google authentication process

This warning appears because the application is either in development mode or hasn't completed Google's verification process, which is typical for personal or development projects.

## Google API Setup

To use this application, you'll need to set up a Google Cloud project with the following APIs enabled:

1. Google Calendar API
2. Google Drive API
3. Gmail API

You'll need to create OAuth 2.0 credentials and configure the OAuth consent screen with the appropriate scopes:
- `https://www.googleapis.com/auth/calendar` (for calendar access)
- `https://www.googleapis.com/auth/drive` (for drive access)
- `https://www.googleapis.com/auth/gmail.readonly` (for email access)

## Firebase Setup

The application uses Firebase Firestore for data management:

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable Firebase Authentication with Google sign-in
3. Set up Firestore Database with appropriate security rules (see Troubleshooting section)
4. Copy your Firebase configuration (apiKey, projectId, appId) to the environment variables

## Groq AI Integration

This application leverages Groq's powerful large language models to provide intelligent features:

1. **Email Categorization**: Groq analyzes email content to automatically sort messages into logical categories
2. **Document Chat**: Ask questions about your Google Drive documents and get context-aware answers from Groq
3. **Calendar Intelligence**: Get AI-powered insights about your schedule, conflicts, and optimization opportunities
4. **Natural Language Understanding**: The application uses Groq to process natural language queries and provide helpful responses

To use these features, you'll need to:
1. Sign up for a Groq API key at [https://console.groq.com](https://console.groq.com)
2. Add your API key to the `.env` file as `GROQ_API_KEY`
3. The application uses optimized parameters for different types of queries to balance response quality and speed

## Usage

### Calendar Integration
1. Sign in with your Google account
2. Grant calendar access permissions
3. View, create, and manage your calendar events

### Drive Integration
1. Enter a Google Drive file or folder URL in the Drive assistant
2. The application will only access files you explicitly share with it
3. Ask questions about your documents using the chat interface

### Email Integration
1. Connect your Gmail account through the authentication process
2. Allow the assistant to analyze and categorize your emails
3. Customize categorization rules as needed

## Deployment

This application is configured to deploy easily on Replit or similar platforms:

1. Build the application:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm run start
   ```

For Replit deployment:
- The application is already configured with proper port settings (port 5000)
- Deployment target is set to autoscale
- Build and run commands are preconfigured in the .replit file

## Security Considerations

- This application requires sensitive OAuth permissions. Always deploy with HTTPS enabled.
- Store API keys and secrets securely using environment variables.
- The application only accesses Google Drive files that users explicitly share with it.
- User data is stored in Firebase Firestore; ensure proper security rules are in place.
- Review your Firebase security rules regularly to protect user data.

## Troubleshooting

### Firebase Authentication Issues

If you encounter authentication or permission errors:

1. **Firebase Security Rules**: Make sure your Firestore security rules are properly configured. The application requires the following minimum rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users to read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         
         // Allow users to read/write their own customBuckets
         match /customBuckets/{bucketId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
         
         // Allow users to read/write their email categories
         match /emailCategories/{categoryId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
   }
   ```

2. **Multiple Tabs**: If you see a "failed-precondition" error, it means Firebase offline persistence is already enabled in another tab. This is normal and won't affect functionality.

### OAuth Token Issues

1. If you see "Authentication required" errors when accessing Google APIs:
   - The OAuth token may have expired. Try signing out and back in.
   - Check that your Google Cloud project has the necessary APIs enabled.
   - Verify the scopes in your OAuth consent screen match those required by the application.

2. If authentication suddenly stops working:
   - Google OAuth tokens expire after a certain period.
   - The application should automatically refresh tokens, but you may occasionally need to re-authenticate.

### Firebase Connection Issues

1. Verify that your Firebase project is properly set up and the Firestore database is created.
2. Check that your Firebase configuration variables are correctly set in the environment.
3. If you see "permission-denied" errors, check your Firestore security rules.
4. Make sure your Firebase project has billing set up or is within the free tier usage limits.

### Groq AI Issues

1. **API Key Issues**: If you see errors related to "API key validation failed" or "Unauthorized":
   - Verify your Groq API key is correctly set in the `.env` file
   - Check that your Groq account has sufficient quota remaining
   - Try regenerating your API key in the Groq console

2. **Response Quality Issues**:
   - The application uses specific parameters for different types of queries
   - For email categorization, try adjusting the custom prompt to improve accuracy
   - For document chat, ensure your document is properly formatted for better content extraction

3. **Rate Limiting**:
   - Groq may impose rate limits on API calls
   - The application includes retry logic for most API calls
   - If you experience consistent rate limiting, consider upgrading your Groq API plan

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google APIs for workspace integration
- Groq for providing the AI capabilities
- Firebase for authentication services
- React and TypeScript community for excellent tools and libraries