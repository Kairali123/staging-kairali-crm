import { LoadBalancer, CampaignAssignment, ProviderCapacity } from './LoadBalancer';

export type SelectionMode = 'MANUAL' | 'AUTOMATIC' | 'HYBRID';

export interface CampaignRoutingContext {
  campaignId: string;
  selectionMode: SelectionMode;
  selectedProviderId?: string | null;
  totalRecipients: number;
  assignments: CampaignAssignment[];
  availableProviders: ProviderCapacity[];
}

export class RoutingEngine {
  /**
   * Determines the provider ID for a specific recipient based on the campaign's routing configuration.
   * 
   * @param context The campaign context including limits and assignments
   * @param currentDistribution A stateful map keeping track of how many recipients were assigned to each provider
   * @returns provider_id string or null if no provider can be assigned
   */
  static routeRecipient(
    context: CampaignRoutingContext,
    currentDistribution: Map<string, number>
  ): string | null {
    
    // 1. If mode is MANUAL or HYBRID with a selected provider, and NO load balancing assignments exist,
    // route everything to the selected provider.
    if (
      (context.selectionMode === 'MANUAL' || context.selectionMode === 'HYBRID') && 
      context.selectedProviderId && 
      (!context.assignments || context.assignments.length === 0)
    ) {
      const pId = context.selectedProviderId;
      currentDistribution.set(pId, (currentDistribution.get(pId) || 0) + 1);
      return pId;
    }

    // 2. If Load Balancing is enabled (assignments exist)
    if (context.assignments && context.assignments.length > 0) {
      return LoadBalancer.assignRecipient(context.assignments, context.totalRecipients, currentDistribution);
    }

    // 3. If mode is AUTOMATIC or HYBRID with 'Auto Select', use health/capacity routing
    if (
      context.selectionMode === 'AUTOMATIC' || 
      (context.selectionMode === 'HYBRID' && !context.selectedProviderId)
    ) {
      // In a real scenario, Auto Select might split if a single provider can't handle it, 
      // but per user rules: "Do NOT automatically split one campaign across multiple providers unless explicitly enabled."
      // So we must find ONE provider that can handle the entire batch.
      const selected = LoadBalancer.autoSelectProvider(context.availableProviders, context.totalRecipients);
      
      if (selected) {
        currentDistribution.set(selected, (currentDistribution.get(selected) || 0) + 1);
        return selected;
      }
    }

    // Could not route
    return null;
  }
}
