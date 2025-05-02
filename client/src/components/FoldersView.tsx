import { Folder } from "lucide-react";

const FoldersView = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-white/60 backdrop-blur-sm">
      <div className="text-center max-w-md p-8 rounded-xl bg-white/80 shadow-lg border border-indigo-100">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Folder className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-emerald-900">Folders Coming Soon</h2>
        <p className="text-gray-600 mb-4">
          We're working hard to bring you a powerful file management system that will help you organize and access your documents with ease.
        </p>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">What to expect:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              Easy file organization and categorization
            </li>
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              Quick search and retrieval functionality
            </li>
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              Seamless integration with your Google Drive
            </li>
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              AI-powered document analysis and suggestions
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FoldersView;