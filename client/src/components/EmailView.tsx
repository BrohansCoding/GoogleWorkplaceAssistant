import { Mail } from "lucide-react";

const EmailView = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-800/60 backdrop-blur-sm">
      <div className="text-center max-w-md p-8 rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-900 flex items-center justify-center">
          <Mail className="h-10 w-10 text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-purple-400">Email Coming Soon</h2>
        <p className="text-gray-300 mb-4">
          We're developing a smart email interface that will help you manage your inbox more efficiently and stay on top of important communications.
        </p>
        <div className="bg-gray-900/80 p-4 rounded-lg border border-purple-900">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">What to expect:</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Intelligent email categorization and prioritization
            </li>
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Smart reply suggestions to save you time
            </li>
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Automated follow-up reminders for important emails
            </li>
            <li className="flex items-center">
              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Seamless integration with your Gmail account
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailView;