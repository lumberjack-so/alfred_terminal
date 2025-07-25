import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareQuote, ArrowRightToLine, Settings2, Database, Bookmark } from 'lucide-react';
import {
  isAssistantsEndpoint,
  isAgentsEndpoint,
  PermissionTypes,
  isParamEndpoint,
  EModelEndpoint,
  Permissions,
} from 'librechat-data-provider';
import type { TInterfaceConfig, TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import BookmarkPanel from '~/components/SidePanel/Bookmarks/BookmarkPanel';
import MemoryViewer from '~/components/SidePanel/Memories/MemoryViewer';
import PanelSwitch from '~/components/SidePanel/Builder/PanelSwitch';
import PromptsAccordion from '~/components/Prompts/PromptsAccordion';
import { Blocks, MCPIcon, AttachmentIcon, NocoIcon, N8NIcon, GhostIcon, CalIcon, ClaudeCodeIcon } from '~/components/svg';
import Parameters from '~/components/SidePanel/Parameters/Panel';
import FilesPanel from '~/components/SidePanel/Files/Panel';
import MCPPanel from '~/components/SidePanel/MCP/MCPPanel';
import { useGetStartupConfig } from '~/data-provider';
import { useHasAccess } from '~/hooks';
import SupabaseIcon from '~/components/svg/SupabaseIcon';

// Declare window.env type
declare global {
  interface Window {
    env: {
      NOCO_URL?: string;
      N8N_URL?: string;
      CAL_URL?: string;
      GHOST_URL?: string;
      SUPABASE_URL?: string;
    };
  }
}


export default function useSideNavLinks({
  hidePanel,
  keyProvided,
  endpoint,
  endpointType,
  interfaceConfig,
  endpointsConfig,
}: {
  hidePanel: () => void;
  keyProvided: boolean;
  endpoint?: EModelEndpoint | null;
  endpointType?: EModelEndpoint | null;
  interfaceConfig: Partial<TInterfaceConfig>;
  endpointsConfig: TEndpointsConfig;
}) {
  const hasAccessToPrompts = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.USE,
  });
  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });
  const hasAccessToMemories = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.USE,
  });
  const hasAccessToReadMemories = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.READ,
  });
  const hasAccessToAgents = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });
  const hasAccessToCreateAgents = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.CREATE,
  });
  const { data: startupConfig } = useGetStartupConfig();
  const navigate = useNavigate();
  const { newConversation } = useNewConvo();

  const Links = useMemo(() => {
    const links: NavLink[] = [];
    if (
      isAssistantsEndpoint(endpoint) &&
      ((endpoint === EModelEndpoint.assistants &&
        endpointsConfig?.[EModelEndpoint.assistants] &&
        endpointsConfig[EModelEndpoint.assistants].disableBuilder !== true) ||
        (endpoint === EModelEndpoint.azureAssistants &&
          endpointsConfig?.[EModelEndpoint.azureAssistants] &&
          endpointsConfig[EModelEndpoint.azureAssistants].disableBuilder !== true)) &&
      keyProvided
    ) {
      links.push({
        title: 'com_sidepanel_assistant_builder',
        label: '',
        icon: Blocks,
        id: EModelEndpoint.assistants,
        Component: PanelSwitch,
      });
    }

    if (
      endpointsConfig?.[EModelEndpoint.agents] &&
      hasAccessToAgents &&
      hasAccessToCreateAgents &&
      endpointsConfig[EModelEndpoint.agents].disableBuilder !== true
    ) {
      links.push({
        title: 'com_sidepanel_agent_builder',
        label: '',
        icon: Blocks,
        id: EModelEndpoint.agents,
        Component: AgentPanelSwitch,
      });
    }

    if (hasAccessToPrompts) {
      links.push({
        title: 'com_ui_prompts',
        label: '',
        icon: MessageSquareQuote,
        id: 'prompts',
        Component: PromptsAccordion,
      });
    }

    if (hasAccessToMemories && hasAccessToReadMemories) {
      links.push({
        title: 'com_ui_memories',
        label: '',
        icon: Database,
        id: 'memories',
        Component: MemoryViewer,
      });
    }

    if (
      interfaceConfig.parameters === true &&
      isParamEndpoint(endpoint ?? '', endpointType ?? '') === true &&
      !isAgentsEndpoint(endpoint) &&
      keyProvided
    ) {
      links.push({
        title: 'com_sidepanel_parameters',
        label: '',
        icon: Settings2,
        id: 'parameters',
        Component: Parameters,
      });
    }

    links.push({
      title: 'com_sidepanel_attach_files',
      label: '',
      icon: AttachmentIcon,
      id: 'files',
      Component: FilesPanel,
    });

    if (hasAccessToBookmarks) {
      links.push({
        title: 'com_sidepanel_conversation_tags',
        label: '',
        icon: Bookmark,
        id: 'bookmarks',
        Component: BookmarkPanel,
      });
    }

    if (
      startupConfig?.mcpServers &&
      Object.values(startupConfig.mcpServers).some(
        (server) => server.customUserVars && Object.keys(server.customUserVars).length > 0,
      )
    ) {
      links.push({
        title: 'com_nav_setting_mcp',
        label: '',
        icon: MCPIcon,
        id: 'mcp-settings',
        Component: MCPPanel,
      });
    }

    // links.push({
    //   title: 'com_sidepanel_hide_panel',
    //   label: '',
    //   icon: MCPIcon,
    //   onClick: hidePanel,
    //   id: 'hide-panel',
    // });

    // Add Claude Code terminal link
    links.push({
      title: 'com_sidepanel_claude_code',
      label: '',
      icon: ClaudeCodeIcon,
      id: 'claude-code',
      onClick: () => {
        // Navigate to the terminal route directly
        navigate('/terminal/new');
      },
    });

    // Add external links only if URLs are provided
    if (window.env?.NOCO_URL) {
      links.push(
        {
          title: 'com_sidepanel_noco_db',
          label: '',
          icon: NocoIcon,
          onClick: ()=>{
            window.open( 'https://' + window.env.NOCO_URL, '_blank');
          },
          id: 'noco-db',
        },
      );
    }

    if (window.env?.N8N_URL) {
      links.push(
        {
          title: 'com_sidepanel_n8n',
          label: '',
          icon: N8NIcon,
          onClick: ()=>{
            window.open('https://' + window.env.N8N_URL, '_blank');
          },
          id: 'n8n-url',
        },
      );
    }

    if (window.env?.GHOST_URL) {
      links.push(
        {
          title: 'com_sidepanel_ghost',
          label: '',
          icon: GhostIcon,
          onClick: ()=>{
            window.open('https://' + window.env.GHOST_URL, '_blank');
          },
          id: 'ghost',
        },
      );
    }
    
    if (window.env?.CAL_URL) {
      links.push(
        {
          title: 'com_sidepanel_cal',
          label: '',
          icon: CalIcon,
          onClick: ()=>{
            window.open('https://' + window.env.CAL_URL, '_blank');
          },
          id: 'cal',
        },
      );
      
    }

    if (window.env?.SUPABASE_URL) {
      links.push(
        {
          title: 'com_sidepanel_supabase',
          label: '',
          icon: SupabaseIcon,
          onClick: ()=>{
            window.open('https://' + window.env.SUPABASE_URL, '_blank');
          },
          id: 'supabase',
        },
      );
      
    }

    return links;
  }, [
    endpointsConfig,
    interfaceConfig.parameters,
    keyProvided,
    endpointType,
    endpoint,
    hasAccessToAgents,
    hasAccessToPrompts,
    hasAccessToMemories,
    hasAccessToReadMemories,
    hasAccessToBookmarks,
    hasAccessToCreateAgents,
    hidePanel,
    startupConfig,
    navigate,
  ]);

  return Links;
}
