import { useSetRecoilState } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys, Constants, dataService } from 'librechat-data-provider';
import type { TConversation, TEndpointsConfig, TModelsConfig } from 'librechat-data-provider';
import { buildDefaultConvo, getDefaultEndpoint, getEndpointField, logger } from '~/utils';
import store from '~/store';

const useNavigateToConvo = (index = 0) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAllConversations = store.useClearConvoState();
  const setSubmission = useSetRecoilState(store.submissionByIndex(index));
  const clearAllLatestMessages = store.useClearLatestMessages(`useNavigateToConvo ${index}`);
  const { hasSetConversation, setConversation } = store.useCreateConversationAtom(index);

  const fetchFreshData = async (conversation?: Partial<TConversation>) => {
    const conversationId = conversation?.conversationId;
    if (!conversationId) {
      return;
    }
    try {
      const data = await queryClient.fetchQuery([QueryKeys.conversation, conversationId], () =>
        dataService.getConversationById(conversationId),
      );
      logger.log('conversation', 'Fetched fresh conversation data', data);
      setConversation(data);
      const path = data?.sessionType === 'terminal' ? `/terminal/${conversationId ?? Constants.NEW_CONVO}` : `/c/${conversationId ?? Constants.NEW_CONVO}`;
      navigate(path, { state: { focusChat: true } });
    } catch (error) {
      console.error('Error fetching conversation data on navigation', error);
      if (conversation) {
        setConversation(conversation as TConversation);
        const path = conversation.sessionType === 'terminal' ? `/terminal/${conversationId}` : `/c/${conversationId}`;
        navigate(path, { state: { focusChat: true } });
      }
    }
  };

  const navigateToConvo = (
    conversation?: TConversation | null,
    options?: {
      resetLatestMessage?: boolean;
      currentConvoId?: string;
    },
  ) => {
    if (!conversation) {
      logger.warn('conversation', 'Conversation not provided to `navigateToConvo`');
      return;
    }
    const { resetLatestMessage = true, currentConvoId } = options || {};
    logger.log('conversation', 'Navigating to conversation', conversation);
    hasSetConversation.current = true;
    setSubmission(null);
    if (resetLatestMessage) {
      clearAllLatestMessages();
    }

    let convo = { ...conversation };
    const endpointsConfig = queryClient.getQueryData<TEndpointsConfig>([QueryKeys.endpoints]);
    if (!convo.endpoint || !endpointsConfig?.[convo.endpoint]) {
      /* undefined/removed endpoint edge case */
      const modelsConfig = queryClient.getQueryData<TModelsConfig>([QueryKeys.models]);
      const defaultEndpoint = getDefaultEndpoint({
        convoSetup: conversation,
        endpointsConfig,
      });

      const endpointType = getEndpointField(endpointsConfig, defaultEndpoint, 'type');
      if (!conversation.endpointType && endpointType) {
        conversation.endpointType = endpointType;
      }

      const models = modelsConfig?.[defaultEndpoint ?? ''] ?? [];

      convo = buildDefaultConvo({
        models,
        conversation,
        endpoint: defaultEndpoint,
        lastConversationSetup: conversation,
      });
    }
    clearAllConversations(true);
    queryClient.setQueryData([QueryKeys.messages, currentConvoId], []);
    if (convo.conversationId !== Constants.NEW_CONVO && convo.conversationId) {
      queryClient.invalidateQueries([QueryKeys.conversation, convo.conversationId]);
      fetchFreshData(convo);
    } else {
      setConversation(convo);
      const path = convo.sessionType === 'terminal' ? `/terminal/${convo.conversationId ?? Constants.NEW_CONVO}` : `/c/${convo.conversationId ?? Constants.NEW_CONVO}`;
      navigate(path, { state: { focusChat: true } });
    }
  };

  return {
    navigateToConvo,
  };
};

export default useNavigateToConvo;
