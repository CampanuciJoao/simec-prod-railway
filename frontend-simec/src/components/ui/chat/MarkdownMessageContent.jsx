import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MarkdownMessageContent({ content }) {
  return (
    <div className="chat-markdown text-[13px] leading-6 sm:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default MarkdownMessageContent;
