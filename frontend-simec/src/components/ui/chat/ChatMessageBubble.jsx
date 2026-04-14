import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faUser } from '@fortawesome/free-solid-svg-icons';

function ChatMessageBubble({ role = 'assistant', content = '', createdAt }) {
  const isUser = role === 'user';

  return (
    <div
      className={[
        'flex w-full gap-3',
        isUser ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      {!isUser && (
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 sm:inline-flex">
          <FontAwesomeIcon icon={faRobot} />
        </div>
      )}

      <div
        className={[
          'flex max-w-[90%] flex-col',
          isUser ? 'items-end' : 'items-start',
        ].join(' ')}
      >
        <div
          className={[
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'border border-slate-200 bg-white text-slate-800',
          ].join(' ')}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>
          ) : (
            <div className="chat-markdown text-sm leading-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {createdAt ? (
          <span className="mt-1 px-1 text-[11px] text-slate-400">
            {createdAt}
          </span>
        ) : null}
      </div>

      {isUser && (
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-600 sm:inline-flex">
          <FontAwesomeIcon icon={faUser} />
        </div>
      )}
    </div>
  );
}

ChatMessageBubble.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant', 'system']),
  content: PropTypes.string,
  createdAt: PropTypes.string,
};

export default ChatMessageBubble;