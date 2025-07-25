import { memo } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { useOutletContext } from 'react-router-dom';
import type { ContextType } from '~/common';
import Presentation from '../Chat/Presentation';
import { OpenSidebar } from '../Chat/Menus';
import Terminal from './Terminal';
import store from '~/store';

function TerminalView({ index = 0 }: { index?: number }) {
  const { conversationId } = useParams();
  const { navVisible, setNavVisible } = useOutletContext<ContextType>();
  const conversation = useRecoilValue(store.conversationByIndex(index));
  const endpoint = conversation?.endpoint;

  return (
    <Presentation>
      <div className="flex h-full w-full flex-col">
        {/* Terminal Header */}
        <div className="sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600 dark:text-gray-300"
              >
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Terminal Session
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {conversationId ? `Session: ${conversationId.slice(-8)}` : 'No session'}
            </span>
          </div>
        </div>

        {/* Terminal Container */}
        <div className="relative flex-1 overflow-hidden bg-white dark:bg-gray-800">
          <div className="absolute inset-0 m-4 rounded-lg bg-gray-200 dark:bg-gray-700 shadow-lg">
            <Terminal
              conversationId={conversationId}
              endpoint={endpoint}
              className="h-full p-3"
            />
          </div>
        </div>
      </div>
    </Presentation>
  );
}

export default memo(TerminalView);