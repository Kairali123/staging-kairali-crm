export interface ProviderCapacity {
  providerId: string;
  remainingCapacity: number;
  priority: number;
  health: 'Green' | 'Yellow' | 'Red';
}

export interface CampaignAssignment {
  providerId: string;
  percentage?: number;
  absoluteAmount?: number;
}

export class LoadBalancer {
  /**
   * Assigns a single recipient to a provider based on configured assignments.
   * Modifies the running counts to keep track of state if iterating.
   * 
   * @param assignments Configured assignments (e.g. 40% Brevo, 60% SendGrid)
   * @param totalRecipients Total recipients in campaign
   * @param currentDistribution Map of how many have been assigned to each provider so far
   */
  static assignRecipient(
    assignments: CampaignAssignment[],
    totalRecipients: number,
    currentDistribution: Map<string, number>
  ): string | null {
    if (!assignments || assignments.length === 0) return null;

    // Check if any absolute amounts are not yet fulfilled
    for (const assignment of assignments) {
      if (assignment.absoluteAmount !== undefined && assignment.absoluteAmount !== null) {
        const currentCount = currentDistribution.get(assignment.providerId) || 0;
        if (currentCount < assignment.absoluteAmount) {
          currentDistribution.set(assignment.providerId, currentCount + 1);
          return assignment.providerId;
        }
      }
    }

    // Handle percentage based distribution
    const percentageAssignments = assignments.filter(a => a.percentage !== undefined && a.percentage !== null);
    if (percentageAssignments.length > 0) {
      let maxDeficit = -Infinity;
      let selectedProviderId = null;

      for (const assignment of percentageAssignments) {
        const expectedCount = Math.floor(totalRecipients * ((assignment.percentage as number) / 100));
        const currentCount = currentDistribution.get(assignment.providerId) || 0;
        
        // Find the provider that is furthest behind its target percentage
        const deficit = expectedCount - currentCount;
        
        if (deficit > maxDeficit) {
          maxDeficit = deficit;
          selectedProviderId = assignment.providerId;
        }
      }

      if (selectedProviderId) {
        currentDistribution.set(selectedProviderId, (currentDistribution.get(selectedProviderId) || 0) + 1);
        return selectedProviderId;
      }
    }

    // Fallback: just pick the first one if logic fails to select
    const fallback = assignments[0].providerId;
    currentDistribution.set(fallback, (currentDistribution.get(fallback) || 0) + 1);
    return fallback;
  }

  /**
   * Auto-selects a provider based on available capacity and health.
   */
  static autoSelectProvider(
    capacities: ProviderCapacity[],
    requiredAmount: number
  ): string | null {
    // Filter out Red health or insufficient capacity
    const available = capacities.filter(
      c => c.health !== 'Red' && c.remainingCapacity >= requiredAmount
    );

    if (available.length === 0) {
      return null; // No single provider can handle this amount
    }

    // Sort by priority (highest first), then by health (Green > Yellow), then by remaining capacity
    available.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.health !== b.health) return a.health === 'Green' ? -1 : 1;
      return b.remainingCapacity - a.remainingCapacity;
    });

    return available[0].providerId;
  }
}
