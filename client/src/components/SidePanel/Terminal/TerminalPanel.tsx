import React from 'react';
import { X } from 'lucide-react';
import Terminal from '~/components/Terminal/Terminal';
import { useLocalize } from '~/hooks';
import { useChatContext } from '~/Providers';

export default function TerminalPanel() {
  const localize = useLocalize();
  const { conversation } = useChatContext();
  
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-light p-4">
        <h3 className="text-lg font-semibold">
          {localize('com_sidepanel_claude_code_terminal')}
        </h3>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Terminal 
          className="h-full"
          conversationId={conversation?.conversationId}
          endpoint={conversation?.endpoint}
        />
      </div>
      
      <div className="border-t border-border-light p-2 text-xs text-text-secondary">
        <p>{localize('com_sidepanel_terminal_info')}</p>
      </div>
    </div>
  );
}