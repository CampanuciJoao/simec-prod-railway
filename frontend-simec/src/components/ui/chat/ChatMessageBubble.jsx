import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faUser } from '@fortawesome/free-solid-svg-icons';

function ChatMessageBubble({
  role = 'assistant',
  content = '',
  createdAt,
  meta = null,
  onSelectSuggestion,
}) {
  const isUser = role === 'user';
  const suggestions = Array.isArray(meta?.suggestions) ? meta.suggestions : [];

  return (
    <div
      className={[
        'content-fade-in flex w-full gap-3',
        isUser ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      {!isUser && (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-white shadow-[0_12px_28px_rgba(14,116,144,0.28)]">
          <FontAwesomeIcon icon={faRobot} className="text-sm" />
        </div>
      )}

      <div
        className={[
          'flex max-w-[92%] flex-col sm:max-w-[85%]',
          isUser ? 'items-end' : 'items-start',
        ].join(' ')}
      >
        <div
          className={[
            'relative overflow-hidden rounded-[22px] px-4 py-3 shadow-sm',
            isUser
              ? 'bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 text-white shadow-[0_14px_32px_rgba(37,99,235,0.24)]'
              : 'border border-slate-200/90 bg-white text-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.08)]',
          ].join(' ')}
        >
          {!isUser && (
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-200 via-sky-300 to-transparent" />
          )}

          {isUser ? (
            <p className="whitespace-pre-wrap text-[13px] leading-6 text-white/95 sm:text-sm">
              {content}
            </p>
          ) : (
            <div className="chat-markdown text-[13px] leading-6 sm:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && suggestions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((suggestion, index) => {
              const label =
                typeof suggestion === 'string'
                  ? suggestion
                  : suggestion.label || suggestion.nome || suggestion.modelo;
              const secondary =
                typeof suggestion === 'object' ? suggestion.secondary : null;

              if (!label) return null;

              return (
                <button
                  key={`${label}-${index}`}
                  type="button"
                  onClick={() => onSelectSuggestion?.(label)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-[1px]"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {secondary ? `${label} • ${secondary}` : label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className={[
            'mt-1.5 flex items-center gap-2 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row',
          ].join(' ')}
        >
          <span
            className={[
              'text-[10px] font-semibold uppercase tracking-[0.18em]',
              isUser ? 'text-sky-600/80' : 'text-slate-400',
            ].join(' ')}
          >
            {isUser ? 'Você' : 'T.H.I.A.G.O'}
          </span>

          {createdAt && <span className="text-[11px] text-slate-400">{createdAt}</span>}
        </div>
      </div>

      {isUser && (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
          <FontAwesomeIcon icon={faUser} className="text-sm" />
        </div>
      )}
    </div>
  );
}

ChatMessageBubble.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant', 'system']),
  content: PropTypes.string,
  createdAt: PropTypes.string,
  meta: PropTypes.object,
  onSelectSuggestion: PropTypes.func,
};

export default ChatMessageBubble;
