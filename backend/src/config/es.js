import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';

/**
 * Check if Elasticsearch is configured
 */
export const isEsConfigured = Boolean(env.esNode && env.esNode.trim());

let client = null;

if (isEsConfigured) {
  const clientOptions = {
    node: env.esNode.trim(),
    maxRetries: 3,
    requestTimeout: 10000,
  };

  // Support Elastic Cloud with API Key or Username/Password
  if (env.esApiKey && env.esApiKey.trim()) {
    clientOptions.auth = { apiKey: env.esApiKey.trim() };
  } else if (env.esUsername && env.esUsername.trim() && env.esPassword) {
    clientOptions.auth = {
      username: env.esUsername.trim(),
      password: env.esPassword,
    };
  }

  client = new Client(clientOptions);
}

/**
 * Elasticsearch official client instance (null if unconfigured)
 */
export const esClient = client;

/**
 * Health check helper for Elasticsearch.
 * Max 2-second timeout on cluster health call.
 * Returns 'disabled' when unconfigured, 'connected' when reachable, or 'disconnected' with error.
 *
 * @returns {Promise<{ status: string, clusterStatus?: string, numberOfNodes?: number, latencyMs?: number, message?: string, error?: string }>}
 */
export const checkElasticsearchHealth = async () => {
  if (!esClient) {
    return {
      status: 'disabled',
      message: 'Elasticsearch not configured (using MongoDB fallback)',
    };
  }

  try {
    const start = Date.now();
    const healthPromise = esClient.cluster.health();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Elasticsearch health check timeout (2000ms exceeded)')), 2000)
    );
    const health = await Promise.race([healthPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    return {
      status: 'connected',
      clusterStatus: health.status,
      numberOfNodes: health.number_of_nodes,
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};

/**
 * Gracefully close Elasticsearch client connection
 */
export const closeElasticsearch = async () => {
  if (esClient) {
    try {
      await esClient.close();
      console.log('[Elasticsearch] Client closed.');
    } catch (err) {
      console.warn(`[Elasticsearch] Close warning: ${err.message}`);
    }
  }
};

export default esClient;
