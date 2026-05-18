// Analytics Repository

import { prisma } from '../../shared/database';

export interface SessionStats {
  sessionId: string;
  totalInteractions: number;
  totalSuggestions: number;
  avgConfidence: number;
  avgLatencyMs: number;
  documentsUsed: number;
}

export interface UserStats {
  userId: string;
  totalSessions: number;
  totalInteractions: number;
  totalDocuments: number;
  avgSessionDuration: number;
}

export interface GlobalStats {
  totalUsers: number;
  totalSessions: number;
  totalInteractions: number;
  totalDocuments: number;
  avgConfidence: number;
}

export interface IAnalyticsRepository {
  getSessionStats(sessionId: string): Promise<SessionStats>;
  getUserStats(userId: string): Promise<UserStats>;
  getGlobalStats(): Promise<GlobalStats>;
}

export class AnalyticsRepository implements IAnalyticsRepository {
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    const interactions = await prisma.interaction.findMany({
      where: { sessionId },
      include: {
        suggestions: true,
        contexts: true,
      },
    });

    const totalInteractions = interactions.length;
    const totalSuggestions = interactions.reduce(
      (sum, i) => sum + i.suggestions.length,
      0
    );

    const confidences = interactions.flatMap((i) =>
      i.suggestions.map((s) => s.confidence)
    );
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 0;

    const latencies = interactions.flatMap((i) =>
      i.suggestions.map((s) => s.latencyMs).filter((l) => l !== null)
    ) as number[];
    const avgLatencyMs =
      latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0;

    const documentIds = new Set(
      interactions.flatMap((i) =>
        i.contexts.map((c) => c.documentId).filter((d) => d !== null)
      )
    );

    return {
      sessionId,
      totalInteractions,
      totalSuggestions,
      avgConfidence,
      avgLatencyMs,
      documentsUsed: documentIds.size,
    };
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      include: {
        interactions: true,
      },
    });

    const totalSessions = sessions.length;
    const totalInteractions = sessions.reduce(
      (sum, s) => sum + s.interactions.length,
      0
    );

    const documents = await prisma.document.count({
      where: { userId },
    });

    const completedSessions = sessions.filter((s) => s.endedAt !== null);
    const durations = completedSessions.map(
      (s) => s.endedAt!.getTime() - s.startedAt.getTime()
    );
    const avgSessionDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    return {
      userId,
      totalSessions,
      totalInteractions,
      totalDocuments: documents,
      avgSessionDuration: avgSessionDuration / 1000 / 60, // Convert to minutes
    };
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const [totalUsers, totalSessions, totalInteractions, totalDocuments] =
      await Promise.all([
        prisma.user.count(),
        prisma.session.count(),
        prisma.interaction.count(),
        prisma.document.count(),
      ]);

    const suggestions = await prisma.aiSuggestion.findMany({
      select: { confidence: true },
    });

    const avgConfidence =
      suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
        : 0;

    return {
      totalUsers,
      totalSessions,
      totalInteractions,
      totalDocuments,
      avgConfidence,
    };
  }
}
