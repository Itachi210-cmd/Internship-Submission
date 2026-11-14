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
 * Health check helper for Elasticsearch
 */
export const checkElasticsearchHealth = async () => {
  if (!esClient) {
    return {
      status: 'disabled',
      message: 'Elasticsearch not configured (using MongoDB fallback)',
    };
  }

  try {
    const health = await esClient.cluster.health();
    return {
      status: 'connected',
      clusterStatus: health.status,
      numberOfNodes: health.number_of_nodes,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};

export default esClient;
