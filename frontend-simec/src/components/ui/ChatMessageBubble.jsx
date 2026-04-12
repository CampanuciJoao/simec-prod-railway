import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ChatMessageBubble({ message, isUser }) {
  return (
    <div
      className={`max-w-[80%] rounded-2xl p-3 text-sm ${
        isUser
          ? 'bg-blue-600 text-white ml-auto'
          : 'bg-slate-100 text-slate-800'
      }`}
    >
      {isUser ? (
        message
      ) : (
        <div className="chat-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default ChatMessageBubble;